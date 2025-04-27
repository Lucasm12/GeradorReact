"use client"

import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface CpfValidationAlertProps {
  invalidRows: number[]
  onNavigateToRow: (row: number) => void
}

export function CpfValidationAlert({ invalidRows, onNavigateToRow }: CpfValidationAlertProps) {
  if (invalidRows.length === 0) return null

  // Limitar a exibição a 5 linhas para não sobrecarregar o alerta
  const rowsToShow = invalidRows.slice(0, 5)
  const remainingRows = invalidRows.length - rowsToShow.length

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>CPFs inválidos detectados</AlertTitle>
      <AlertDescription>
        <p className="mb-2">Foram encontrados CPFs inválidos nas seguintes linhas:</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {rowsToShow.map((row) => (
            <Button
              key={row}
              variant="outline"
              size="sm"
              onClick={() => onNavigateToRow(row)}
              className="bg-white hover:bg-gray-100"
            >
              Linha {row}
            </Button>
          ))}
          {remainingRows > 0 && <span className="text-sm py-1">e mais {remainingRows} linhas</span>}
        </div>
        <p>Por favor, corrija os CPFs antes de gerar o arquivo. Todos os CPFs devem ter 11 dígitos e ser válidos.</p>
      </AlertDescription>
    </Alert>
  )
}
