"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Trash2 } from "lucide-react"
import { FIELD_DEFINITIONS } from "@/lib/field-definitions"
import { validateCPF } from "@/lib/validators"

interface DataTableProps {
  data: any[]
  onUpdateCell: (rowIndex: number, fieldId: string, value: string) => void
  onRemoveRow: (rowIndex: number) => void
}

export default function DataTable({ data, onUpdateCell, onRemoveRow }: DataTableProps) {
  const [activeCell, setActiveCell] = useState<{ row: number; field: string } | null>(null)

  const handleCellChange = (rowIndex: number, fieldId: string, value: string) => {
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

    onUpdateCell(rowIndex, fieldId, value)
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
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
            {data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveRow(rowIndex)}
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
    </div>
  )
}
