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
  currentPage: number
  onPageChange: (page: number) => void
}

export default function DataTable({ data, onUpdateCell, onRemoveRow, currentPage, onPageChange }: DataTableProps) {
  const [activeCell, setActiveCell] = useState<{ row: number; field: string } | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [displayData, setDisplayData] = useState<any[]>([])
  const { toast } = useToast()
  const tableRef = useRef<HTMLDivElement>(null)

  const ROWS_PER_PAGE = 100 // Show 100 rows per page for better performance

  // Initialize pagination
  useEffect(() => {
    if (data.length > 0) {
      setTotalPages(Math.ceil(data.length / ROWS_PER_PAGE))
      updateDisplayData(currentPage)
    } else {
      setDisplayData([])
      setTotalPages(1)
      onPageChange(1)
    }
  }, [data, currentPage, onPageChange])

  const updateDisplayData = (page: number) => {
    const startIndex = (page - 1) * ROWS_PER_PAGE
    const endIndex = Math.min(startIndex + ROWS_PER_PAGE, data.length)
    setDisplayData(data.slice(startIndex, endIndex))

    // Scroll to top of table when page changes
    if (tableRef.current) {
      tableRef.current.scrollTop = 0
    }
  }

  const handleCellChange = (rowIndex: number, fieldId: string, value: string) => {
    // Calculate the actual index in the full dataset
    const actualIndex = (currentPage - 1) * ROWS_PER_PAGE + rowIndex

    // Special handling for CPF
    if (fieldId === "cpfBeneficiario") {
      value = value.replace(/\D/g, "")

      // Validação adicional para CPF - não permitir mais que 11 dígitos
      if (value.length > 11) {
        value = value.slice(0, 11)
      }
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
        <PaginationLink onClick={() => onPageChange(1)} isActive={currentPage === 1}>
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
          <PaginationLink onClick={() => onPageChange(i)} isActive={currentPage === i}>
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
          <PaginationLink onClick={() => onPageChange(totalPages)} isActive={currentPage === totalPages}>
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
                              (
                                (row[field.id] && row[field.id].length !== 11) ||
                                  (row[field.id] && row[field.id].length === 11 && !validateCPF(row[field.id]))
                              )
                                ? "bg-red-50 text-red-800"
                                : ""
                            }`}
                            disabled={field.id === "sequencialRegistro"}
                            placeholder={field.name}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs whitespace-normal">
                            {field.description}
                            {field.id === "cpfBeneficiario" && row[field.id] && row[field.id].length !== 11 && (
                              <span className="block text-red-600 font-semibold mt-1">
                                CPF deve ter 11 dígitos. Atual: {row[field.id].length}
                              </span>
                            )}
                            {field.id === "cpfBeneficiario" &&
                              row[field.id] &&
                              row[field.id].length === 11 &&
                              !validateCPF(row[field.id]) && (
                                <span className="block text-red-600 font-semibold mt-1">CPF inválido</span>
                              )}
                          </p>
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
                  onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                />
              </PaginationItem>

              {renderPaginationItems()}

              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
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
