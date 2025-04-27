// Este é um Web Worker para processar grandes volumes de dados em segundo plano
// sem bloquear a interface do usuário

import { FIELD_DEFINITIONS } from "./field-definitions"

// Definir o tipo de mensagem que o worker pode receber
interface WorkerMessage {
  type: "process_data"
  data: string[][]
}

// Definir o tipo de resposta que o worker pode enviar
interface WorkerResponse {
  type: "progress" | "complete" | "error"
  data?: Record<string, string>[]
  progress?: { current: number; total: number }
  error?: string
}

// Função para processar os dados em chunks
const processDataInChunks = (dataRows: string[][]): Record<string, string>[] => {
  const processedData: Record<string, string>[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rowData: Record<string, string> = {}

    // Set sequential number
    rowData.sequencialRegistro = (i + 1).toString()

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

    processedData.push(rowData)

    // Enviar progresso a cada 100 registros
    if (i % 100 === 0 || i === dataRows.length - 1) {
      self.postMessage({
        type: "progress",
        progress: { current: i + 1, total: dataRows.length },
      } as WorkerResponse)
    }
  }

  return processedData
}

// Configurar o event listener para mensagens recebidas
self.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data

  if (type === "process_data") {
    try {
      const processedData = processDataInChunks(data)

      // Enviar os dados processados de volta
      self.postMessage({
        type: "complete",
        data: processedData,
      } as WorkerResponse)
    } catch (error) {
      self.postMessage({
        type: "error",
        error: (error as Error).message,
      } as WorkerResponse)
    }
  }
})

// Exportar um tipo vazio para satisfazer o TypeScript
export type WebWorker = typeof Worker
