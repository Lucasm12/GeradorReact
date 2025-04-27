"use client"

import type React from "react"

import { forwardRef, useImperativeHandle, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { FIELD_DEFINITIONS } from "@/lib/field-definitions"
import { ProgressModal } from "./progress-modal"

interface FileUploaderProps {
  onDataLoaded: (data: any[]) => void
}

const FileUploader = forwardRef<HTMLInputElement, FileUploaderProps>(({ onDataLoaded }, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [importSpeed, setImportSpeed] = useState<number | undefined>(undefined)
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>(undefined)
  const workerRef = useRef<Worker | null>(null)
  const startTimeRef = useRef<number>(0)
  const lastUpdateTimeRef = useRef<number>(0)
  const processedSinceLastUpdateRef = useRef<number>(0)

  useImperativeHandle(ref, () => fileInputRef.current as HTMLInputElement)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Check if file is Excel or CSV
      if (!file.name.match(/\.(xlsx|xls|xlsm|csv)$/)) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo Excel ou CSV",
          variant: "destructive",
        })
        return
      }

      setIsImporting(true)
      setProgress({ current: 0, total: 100 }) // Initial progress before we know the total

      // Load XLSX library dynamically
      const XLSX = await import("xlsx")

      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer)

          // Parse workbook
          const workbook = XLSX.read(data, { type: "array" })

          // Get first sheet
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            raw: false,
            defval: "",
            blankrows: false,
          }) as string[][]

          // Skip header row
          const dataRows = jsonData.slice(1)

          // Update total for progress
          setProgress({ current: 0, total: dataRows.length })

          // Initialize timing variables for speed calculation
          startTimeRef.current = Date.now()
          lastUpdateTimeRef.current = startTimeRef.current
          processedSinceLastUpdateRef.current = 0

          // Determine processing method based on data size
          if (dataRows.length > 5000) {
            // For large datasets, use Web Worker
            processWithWorker(dataRows)
          } else {
            // For smaller datasets, process in main thread
            const processedData = await processDataInChunks(dataRows)
            finishImport(processedData)
          }
        } catch (error) {
          console.error("Error processing file:", error)
          toast({
            title: "Erro",
            description: "Ocorreu um erro ao processar o arquivo",
            variant: "destructive",
          })
          setIsImporting(false)
        }
      }

      reader.onerror = () => {
        toast({
          title: "Erro",
          description: "Ocorreu um erro ao ler o arquivo",
          variant: "destructive",
        })
        setIsImporting(false)
      }

      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error("Error loading XLSX library:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao carregar a biblioteca de processamento de Excel",
        variant: "destructive",
      })
      setIsImporting(false)
    }
  }

  const processWithWorker = (dataRows: string[][]) => {
    // Terminate any existing worker
    if (workerRef.current) {
      workerRef.current.terminate()
    }

    // Create a new worker
    const worker = new Worker(new URL("../lib/web-worker.ts", import.meta.url), { type: "module" })
    workerRef.current = worker

    // Set up message handler
    worker.onmessage = (event) => {
      const { type, data, progress: workerProgress, error } = event.data

      if (type === "progress" && workerProgress) {
        setProgress(workerProgress)
        updateSpeedCalculation(workerProgress.current)
      } else if (type === "complete" && data) {
        finishImport(data)
        worker.terminate()
        workerRef.current = null
      } else if (type === "error") {
        console.error("Worker error:", error)
        toast({
          title: "Erro",
          description: `Erro ao processar dados: ${error}`,
          variant: "destructive",
        })
        setIsImporting(false)
        worker.terminate()
        workerRef.current = null
      }
    }

    // Start processing
    worker.postMessage({
      type: "process_data",
      data: dataRows,
    })
  }

  const processDataInChunks = async (dataRows: string[][]): Promise<Record<string, string>[]> => {
    // Use smaller chunks to prevent browser from freezing
    const CHUNK_SIZE = 100
    const processedData: Record<string, string>[] = []

    try {
      for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
        // Process a chunk of data
        const chunk = dataRows.slice(i, Math.min(i + CHUNK_SIZE, dataRows.length))

        // Process each row in the chunk
        const chunkData = chunk.map((row, chunkIndex) => {
          const rowData: Record<string, string> = {}
          const index = i + chunkIndex

          // Set sequential number
          rowData.sequencialRegistro = (index + 1).toString()

          // Set default values for special fields
          rowData.tipoMovimentacao = "1"

          // Set current date for dataOperacao if not provided
          const today = new Date()
          const day = String(today.getDate()).padStart(2, "0")
          const month = String(today.getMonth() + 1).padStart(2, "0")
          const year = today.getFullYear()
          rowData.dataOperacao = `${day}${month}${year}`

          // Map other fields
          FIELD_DEFINITIONS.forEach((field, fieldIndex) => {
            if (field.id !== "sequencialRegistro" && field.id !== "tipoMovimentacao" && field.id !== "dataOperacao") {
              rowData[field.id] = row[fieldIndex] || ""
            }
          })

          return rowData
        })

        // Add chunk data to processed data
        processedData.push(...chunkData)

        // Update progress
        const currentProgress = Math.min(i + CHUNK_SIZE, dataRows.length)
        setProgress({ current: currentProgress, total: dataRows.length })

        // Update speed calculation
        updateSpeedCalculation(currentProgress)

        // Allow UI to update by yielding execution
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      return processedData
    } catch (error) {
      console.error("Error processing data chunks:", error)
      throw error
    }
  }

  const updateSpeedCalculation = (currentProgress: number) => {
    processedSinceLastUpdateRef.current += 1
    const now = Date.now()

    // Update speed calculation every second
    if (now - lastUpdateTimeRef.current > 1000) {
      const elapsedSeconds = (now - lastUpdateTimeRef.current) / 1000
      const speed = Math.round(processedSinceLastUpdateRef.current / elapsedSeconds)
      setImportSpeed(speed)

      // Calculate remaining time
      const remaining = progress.total - currentProgress
      const timeRemainingSeconds = remaining > 0 ? Math.round(remaining / speed) : 0
      setTimeRemaining(timeRemainingSeconds)

      // Reset counters
      lastUpdateTimeRef.current = now
      processedSinceLastUpdateRef.current = 0
    }
  }

  const finishImport = (processedData: Record<string, string>[]) => {
    // Pass all data to parent component
    onDataLoaded(processedData)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    // Calculate total time
    const totalTime = (Date.now() - startTimeRef.current) / 1000

    toast({
      title: "Sucesso",
      description: `${processedData.length} registros importados em ${totalTime.toFixed(1)} segundos`,
    })

    setIsImporting(false)
    setImportSpeed(undefined)
    setTimeRemaining(undefined)
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.xlsm,.csv"
        className="hidden"
      />
      <ProgressModal
        isOpen={isImporting}
        current={progress.current}
        total={progress.total}
        speed={importSpeed}
        timeRemaining={timeRemaining}
      />
    </>
  )
})

FileUploader.displayName = "FileUploader"

export default FileUploader
