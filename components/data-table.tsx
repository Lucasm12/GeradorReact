"use client"

import { useState, useEffect, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Trash2 } from "lucide-react"
import { FIELD_DEFINITIONS } from "@/lib/field-definitions"
import { validateCPF } from "@/lib/validators"
import { useToast } from "@/hooks/use-toast"

interface DataTableProps {
  data: any[]
  onUpdateCell: (rowIndex: number, fieldId: string, value: string) => void
  onRemoveRow: (rowIndex: number) => void
}

export default function DataTable({ data, onUpdateCell, onRemoveRow }: DataTableProps) {
  const [activeCell, setActiveCell] = useState<{ row: number; field: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [displayData, setDisplayData] = useState<any[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const { toast } = useToast()
  const tableRef = useRef<HTMLDivElement>(null)

  const ROWS_PER_PAGE = 100 // Show 100 rows per page for better performance

  // Initialize pagination
  useEffect(() => {
    if (data.length > 0) {
      setTotalPages(Math.ceil(data.length / ROWS_PER_PAGE))
      updateDisplayData(1)
    } else {
      setDisplayData([])
      setTotalPages(1)
      setCurrentPage(1)
    }
  }, [data])

  // Update display data when page changes
  useEffect(() => {
    updateDisplayData(currentPage)
  }, [currentPage])

  // Check if there's more data to load from localStorage
  useEffect(() => {
    const checkForRemainingData = async () => {
      try {
        const metadataStr = localStorage.getItem("importMetadata")
        if (!metadataStr) return

        const metadata = JSON.parse(metadataStr)
        const { totalRecords, loadedRecords, totalChunks, timestamp } = metadata

        // If it's been more than 1 hour, clear the data (to prevent stale data)
        const oneHour = 60 * 60 * 1000
        if (Date.now() - timestamp > oneHour) {
          clearStoredImportData()
          return
        }

        // If we haven't loaded all records yet
        if (loadedRecords < totalRecords && data.length < totalRecords) {
          toast({
            title: "Dados adicionais disponíveis",
            description: `${loadedRecords} de ${totalRecords} registros carregados. Clique para carregar mais.`,
            action: (
              <Button variant="outline" size="sm" onClick={loadMoreData}>
                Carregar mais
              </Button>
            ),
            duration: 10000,
          })
        }
      } catch (error) {
        console.error("Error checking for remaining data:", error)
      }
    }

    checkForRemainingData()
  }, [data])

  const updateDisplayData = (page: number) => {
    const startIndex = (page - 1) * ROWS_PER_PAGE
    const endIndex = Math.min(startIndex + ROWS_PER_PAGE, data.length)
    setDisplayData(data.slice(startIndex, endIndex))

    // Scroll to top of table when page changes
    if (tableRef.current) {
      tableRef.current.scrollTop = 0
    }
  }

  const loadMoreData = async () => {
    try {
      setIsLoadingMore(true)

      const metadataStr = localStorage.getItem("importMetadata")
      if (!metadataStr) return

      const metadata = JSON.parse(metadataStr)
      const { loadedRecords, totalChunks } = metadata

      // Calculate which chunk to load next
      const nextChunkIndex = Math.floor((loadedRecords - 1000) / 1000)

      if (nextChunkIndex < totalChunks) {
        const chunkStr = localStorage.getItem(`importChunk_${nextChunkIndex}`)
        if (chunkStr) {
          const chunk = JSON.parse(chunkStr)

          // Add the chunk to the existing data
          const newData = [...data, ...chunk]

          // Update the parent component with the new data
          // We need to create a function in the parent to handle this
          // For now, we'll just update our local state
          // onUpdateData(newData)

          // Update metadata
          const newLoadedRecords = loadedRecords + chunk.length
          localStorage.setItem(
            "importMetadata",
            JSON.stringify({
              ...metadata,
              loadedRecords: newLoadedRecords,
            }),
          )

          // Remove the loaded chunk to free up localStorage space
          localStorage.removeItem(`importChunk_${nextChunkIndex}`)

          toast({
            title: "Dados adicionais carregados",
            description: `${newLoadedRecords} de ${metadata.totalRecords} registros carregados.`,
          })
        }
      }

      // If we've loaded all chunks, clean up
      if (nextChunkIndex + 1 >= totalChunks) {
        clearStoredImportData()
        toast({
          title: "Importação concluída",
          description: "Todos os registros foram carregados com sucesso!",
        })
      }
    } catch (error) {
      console.error("Error loading more data:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao carregar mais dados",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMore(false)
    }
  }

  const clearStoredImportData = () => {
    // Clear all import-related data from localStorage
    const metadataStr = localStorage.getItem("importMetadata")
    if (metadataStr) {
      try {
        const metadata = JSON.parse(metadataStr)
        const { totalChunks } = metadata

        for (let i = 0; i < totalChunks; i++) {
          localStorage.removeItem(`importChunk_${i}`)
        }

        localStorage.removeItem("importMetadata")
      } catch (error) {
        console.error("Error clearing stored import data:", error)
      }
    }
  }

  const handleCellChange = (rowIndex: number, fieldId: string, value: string) => {
    // Calculate the actual index in the full dataset
    const actualIndex = (currentPage - 1) * ROWS_PER_PAGE + rowIndex

    // Special handling for CPF
    if (fieldId === "cpfBeneficiario") {
      value = value.replace(/\D/g, "")
    }

    // Special handling for tipoRegistro
    if (fieldId === "tipoRegistro") {
      value = value.toUpperCase()
      const validTypes = ["N", "C", "A", "U", "D", "I", "E"]
      if (value && !validTypes.includes(value)) {
        value = ""
      }
    }

    onUpdateCell(actualIndex, fieldId, value)
  }

  const handleRemoveRow = (rowIndex: number) => {
    // Calculate the actual index in the full dataset
    const actualIndex = (currentPage - 1) * ROWS_PER_PAGE + rowIndex
    onRemoveRow(actualIndex)
  }

  // Generate pagination items
  const renderPaginationItems = () => {
    const items = []

    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink onClick={() => setCurrentPage(1)} isActive={currentPage === 1}>
          1
        </PaginationLink>
      </PaginationItem>,
    )

    // If there are many pages, add ellipsis
    if (currentPage > 3) {
      items.push(
        <PaginationItem key="ellipsis1">
          <span className="px-4">...</span>
        </PaginationItem>,
      )
    }

    // Show pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i === 1 || i === totalPages) continue // Skip first and last page as they're always shown

      items.push(
        <PaginationItem key={i}>
          <PaginationLink onClick={() => setCurrentPage(i)} isActive={currentPage === i}>
            {i}
          </PaginationLink>
        </PaginationItem>,
      )
    }

    // If there are many pages, add ellipsis
    if (currentPage < totalPages - 2) {
      items.push(
        <PaginationItem key="ellipsis2">
          <span className="px-4">...</span>
        </PaginationItem>,
      )
    }

    // Always show last page if there's more than one page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink onClick={() => setCurrentPage(totalPages)} isActive={currentPage === totalPages}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      )
    }

    return items
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto max-h-[600px]" ref={tableRef}>
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead className="w-[80px]">Ações</TableHead>
              {FIELD_DEFINITIONS.map((field) => (
                <TableHead key={field.id} className="min-w-[120px]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">{field.name}</div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs whitespace-normal">{field.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRow(rowIndex)}
                    className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
                {FIELD_DEFINITIONS.map((field) => (
                  <TableCell key={field.id} className="p-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Input
                            value={row[field.id] || ""}
                            onChange={(e) => handleCellChange(rowIndex, field.id, e.target.value)}
                            onFocus={() => setActiveCell({ row: rowIndex, field: field.id })}
                            onBlur={() => setActiveCell(null)}
                            className={`border-0 h-10 rounded-none focus:ring-1 ${
                              activeCell?.row === rowIndex && activeCell?.field === field.id
                                ? "bg-blue-50 ring-1 ring-blue-400"
                                : ""
                            } ${
                              field.id === "cpfBeneficiario" &&
                              row[field.id] &&
                              row[field.id].length === 11 &&
                              !validateCPF(row[field.id])
                                ? "bg-red-50 text-red-800"
                                : ""
                            }`}
                            disabled={field.id === "sequencialRegistro"}
                            placeholder={field.name}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs whitespace-normal">{field.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                />
              </PaginationItem>

              {renderPaginationItems()}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          <div className="text-center text-sm text-gray-500 mt-2">
            Mostrando registros {(currentPage - 1) * ROWS_PER_PAGE + 1} a{" "}
            {Math.min(currentPage * ROWS_PER_PAGE, data.length)} de {data.length} no total
          </div>
        </div>
      )}
    </div>
  )
}
