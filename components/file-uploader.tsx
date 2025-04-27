"use client"

import type React from "react"

import { forwardRef, useImperativeHandle, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { FIELD_DEFINITIONS } from "@/lib/field-definitions"

interface FileUploaderProps {
  onDataLoaded: (data: any[]) => void
}

const FileUploader = forwardRef<HTMLInputElement, FileUploaderProps>(({ onDataLoaded }, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

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

      // Load XLSX library dynamically
      const XLSX = await import("xlsx")

      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer)
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

          // Process data
          const processedData = dataRows.map((row, index) => {
            const rowData: Record<string, string> = {}

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

          // Pass data to parent component
          onDataLoaded(processedData)

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        } catch (error) {
          console.error("Error processing file:", error)
          toast({
            title: "Erro",
            description: "Ocorreu um erro ao processar o arquivo",
            variant: "destructive",
          })
        }
      }

      reader.onerror = () => {
        toast({
          title: "Erro",
          description: "Ocorreu um erro ao ler o arquivo",
          variant: "destructive",
        })
      }

      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error("Error loading XLSX library:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao carregar a biblioteca de processamento de Excel",
        variant: "destructive",
      })
    }
  }

  return (
    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls,.csv" className="hidden" />
  )
})

FileUploader.displayName = "FileUploader"

export default FileUploader
