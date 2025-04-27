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

  useImperativeHandle(ref, () => fileInputRef.current as HTMLInputElement)

  const processDataInChunks = async (
    dataRows: string[][],
    onProgress: (current: number, total: number) => void,
  ): Promise<Record<string, string>[]> => {
    // Use smaller chunks to prevent browser from freezing
    const CHUNK_SIZE = 50
    const processedData: Record<string, string>[] = []

    // Variables for speed calculation
    const startTime = Date.now()
    let lastUpdateTime = startTime
    let processedSinceLastUpdate = 0

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
        onProgress(currentProgress, dataRows.length)

        // Calculate speed and time remaining
        processedSinceLastUpdate += chunk.length
        const now = Date.now()
        if (now - lastUpdateTime > 1000) {
          // Update every second
          const elapsedSeconds = (now - lastUpdateTime) / 1000
          const speed = Math.round(processedSinceLastUpdate / elapsedSeconds)
          setImportSpeed(speed)

          const remaining = dataRows.length - currentProgress
          const timeRemainingSeconds = Math.round(remaining / speed)
          setTimeRemaining(timeRemainingSeconds)

          lastUpdateTime = now
          processedSinceLastUpdate = 0
        }

        // Allow UI to update by yielding execution
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      return processedData
    } catch (error) {
      console.error("Error processing data chunks:", error)
      throw error
    }
  }

  // Substitua o método handleFileChange por esta versão:
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

          // Process data in chunks with progress updates
          const processedData = await processDataInChunks(dataRows, (current, total) => {
            setProgress({ current, total })
          })

          // Pass all data to parent component
          onDataLoaded(processedData)

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }

          toast({
            title: "Sucesso",
            description: `${processedData.length} registros importados com sucesso!`,
          })
        } catch (error) {
          console.error("Error processing file:", error)
          toast({
            title: "Erro",
            description: "Ocorreu um erro ao processar o arquivo",
            variant: "destructive",
          })
        } finally {
          setIsImporting(false)
          setImportSpeed(undefined)
          setTimeRemaining(undefined)
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
