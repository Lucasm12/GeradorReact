"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { FileSpreadsheet, Download, Upload, Plus, FileText, Copy, Trash2 } from "lucide-react"
import DataTable from "@/components/data-table"
import FileUploader from "@/components/file-uploader"
import { FIELD_DEFINITIONS } from "@/lib/field-definitions"

export default function Home() {
  const [accountNumber, setAccountNumber] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [data, setData] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState("editor")
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddRow = () => {
    const newRow = FIELD_DEFINITIONS.reduce(
      (acc, field) => {
        if (field.id === "sequencialRegistro") {
          acc[field.id] = (data.length + 1).toString()
        } else if (field.id === "tipoMovimentacao") {
          acc[field.id] = "1"
        } else if (field.id === "dataOperacao") {
          const today = new Date()
          const day = String(today.getDate()).padStart(2, "0")
          const month = String(today.getMonth() + 1).padStart(2, "0")
          const year = today.getFullYear()
          acc[field.id] = `${day}${month}${year}`
        } else {
          acc[field.id] = ""
        }
        return acc
      },
      {} as Record<string, string>,
    )

    setData([...data, newRow])
  }

  const handleRemoveRow = (index: number) => {
    if (data.length <= 1) {
      toast({
        title: "Atenção",
        description: "Você deve manter pelo menos um registro!",
        variant: "destructive",
      })
      return
    }

    const newData = [...data]
    newData.splice(index, 1)

    // Update sequential numbers
    newData.forEach((row, idx) => {
      row.sequencialRegistro = (idx + 1).toString()
    })

    setData(newData)
    toast({
      title: "Sucesso",
      description: "Registro removido com sucesso",
    })
  }

  const handleUpdateCell = (rowIndex: number, fieldId: string, value: string) => {
    const newData = [...data]
    newData[rowIndex][fieldId] = value
    setData(newData)
  }

  const handleGenerateFile = () => {
    if (!accountNumber) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o número da conta da empresa",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      // Contadores para cada tipo de registro
      const totals = {
        N: 0,
        D: 0,
        C: 0,
        I: 0,
        E: 0,
        U: 0,
        A: 0,
      }

      let fileContent = ""

      // Linha de cabeçalho
      const now = new Date()
      const formattedDate = formatDate(now)
      fileContent += `1|H|MOVIMENTACAO|${accountNumber}|${formattedDate}\n`

      // Processar registros
      data.forEach((rowData, index) => {
        const lineNumber = index + 2
        const tipoRegistro = rowData.tipoRegistro || "N"

        if (totals.hasOwnProperty(tipoRegistro as keyof typeof totals)) {
          totals[tipoRegistro as keyof typeof totals]++
        }

        // Criar array com todos os campos
        const fields = [
          lineNumber, // 1
          tipoRegistro, // 2
          rowData.plano || "", // 3
          rowData.codigoBeneficiario || "", // 4
          rowData.nomeCompleto || "", // 5
          rowData.cpfBeneficiario || "", // 6
          rowData.rgRneBeneficiario || "", // 7
          rowData.orgaoExpedidor || "", // 8
          rowData.nomeMae || "", // 9
          rowData.dataNascimento || "", // 10
          rowData.sexo || "", // 11
          rowData.cns || "", // 12
          rowData.estadoCivil || "", // 13
          rowData.logradouro || "", // 14
          rowData.numero || "", // 15
          rowData.complemento || "", // 16
          rowData.bairro || "", // 17
          rowData.cidade || "", // 18
          rowData.uf || "", // 19
          rowData.cep || "", // 20
          rowData.tipoTelefone1 || "", // 21
          rowData.dddTelefone1 || "", // 22
          rowData.telefone1 || "", // 23
          rowData.ramalTelefone1 || "", // 24
          rowData.tipoTelefone2 || "", // 25
          rowData.dddTelefone2 || "", // 26
          rowData.telefone2 || "", // 27
          rowData.ramalTelefone2 || "", // 28
          rowData.servidorPublico || "", // 29
          rowData.tipoMovimentacao || "", // 30
          rowData.valorMensalidade || "", // 31
          rowData.dataOperacao || "", // 32
          rowData.dataInicioVigencia || "", // 33
          rowData.motivoCancelamento || "", // 34
          rowData.formaPagamento || "", // 35
          rowData.banco || "", // 36
          rowData.agencia || "", // 37
          rowData.contaCorrente || "", // 38
          rowData.tipoConta || "", // 39
          rowData.codigoVendedor || "", // 40
          rowData.codigoGerente || "", // 41
          rowData.codigoLoja || "", // 42
          rowData.codigoRegional || "", // 43
          rowData.contrato || "", // 44
          rowData.locacao || "", // 45
          rowData.email || "", // 46
          rowData.diaCobranca || "", // 47
          rowData.grauParentesco || "", // 48
          rowData.vinculoCpfTitular || "", // 49
          rowData.codigoBeneficiarioTitular || "", // 50
          rowData.funcionalMatricula || "", // 51
          rowData.centroCusto || "", // 52
          rowData.carteirinha || "", // 53
          rowData.naturezaDocumentoIdentificacao || "", // 54
          rowData.dataExpedicao || "", // 55
          rowData.passaporteCarteiraCivil || "", // 56
          rowData.atividadePrincipalDesenvolvida || "", // 57
          rowData.informacaoAdicional1 || "", // 58
          rowData.informacaoAdicional2 || "", // 59
          rowData.informacaoAdicional3 || "", // 60
        ]

        // Adicionar linha com exatamente 60 campos
        fileContent += fields.join("|") + "\n"
      })

      // Calcular total de registros (header + registros + trailer)
      const totalRegistros = data.length + 2

      // Adicionar linha de trailer
      fileContent +=
        `${totalRegistros}|T|` +
        `${totals.N}|` +
        `${totals.D}|` +
        `${totals.C}|` +
        `${totals.I}|` +
        `${totals.E}|` +
        `${totals.U}|` +
        `${totals.A}|` +
        `${totalRegistros}`

      setGeneratedContent(fileContent)
      setActiveTab("output")

      toast({
        title: "Sucesso",
        description: "Arquivo gerado com sucesso!",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao gerar o arquivo",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard
      .writeText(generatedContent)
      .then(() => {
        toast({
          title: "Sucesso",
          description: "Conteúdo copiado para a área de transferência!",
        })
      })
      .catch(() => {
        toast({
          title: "Erro",
          description: "Erro ao copiar o conteúdo",
          variant: "destructive",
        })
      })
  }

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url

    // Gerar nome do arquivo com data e hora atual
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(now.getMinutes()).padStart(2, "0")
    const seconds = String(now.getSeconds()).padStart(2, "0")

    const formattedDate = `${year}${month}${day}_${hours}${minutes}${seconds}`
    a.download = `movimentacao_cadastral_${formattedDate}.txt`

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Sucesso",
      description: "Arquivo baixado com sucesso!",
    })
  }

  const handleDownloadLayout = () => {
    window.open(
      "https://docs.google.com/spreadsheets/d/1O-0UXFEwpq0MtPrtHT7a7lOZNVm3vRmX/edit?usp=drive_link&ouid=110128864082531091825&rtpof=true&sd=true",
      "_blank",
    )
  }

  const handleDownloadEmptyLayout = () => {
    window.open(
      "https://docs.google.com/spreadsheets/d/11bHil0n7yBZsSnYxnNu5Lb5XSDMfAKyN/edit?usp=drive_link&ouid=110128864082531091825&rtpof=true&sd=true",
      "_blank",
    )
  }

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleClearData = () => {
    // Limpar todos os dados
    setData([])
    setGeneratedContent("")
    setAccountNumber("")

    // Simular um refresh da página
    window.location.reload()

    toast({
      title: "Sucesso",
      description: "Todos os dados foram limpos com sucesso!",
    })
  }

  // Initialize with one empty row if no data
  // if (data.length === 0) {
  //   handleAddRow()
  // }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gerador de Arquivos</h1>
            <p className="text-gray-600 text-sm">Versão 1.00</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleDownloadLayout} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden md:inline">Layout</span>
            </Button>
            <Button variant="outline" onClick={handleDownloadEmptyLayout} className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden md:inline">Layout Vazio</span>
            </Button>
            <Button variant="outline" onClick={handleUploadClick} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden md:inline">Upload</span>
            </Button>
            <Button variant="destructive" onClick={handleClearData} className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              <span className="hidden md:inline">Limpar</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="w-full md:w-auto">
            <Input
              id="accountNumber"
              placeholder="Código da Conta"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full md:w-[200px]"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddRow} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Registro
            </Button>
            <Button
              onClick={handleGenerateFile}
              disabled={isGenerating || data.length === 0}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Gerar Arquivo
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="output">Saída</TabsTrigger>
          </TabsList>
          <TabsContent value="editor" className="mt-4">
            <Card>
              <CardContent className="p-0 overflow-auto">
                <DataTable data={data} onUpdateCell={handleUpdateCell} onRemoveRow={handleRemoveRow} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="output" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Arquivo Gerado</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToClipboard}
                    disabled={!generatedContent}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    disabled={!generatedContent}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {generatedContent ? (
                  <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto text-xs h-[400px]">
                    {generatedContent}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
                    <FileText className="h-16 w-16 mb-4 opacity-20" />
                    <p>Nenhum arquivo gerado. Clique em "Gerar Arquivo" para criar o conteúdo.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <FileUploader
          ref={fileInputRef}
          onDataLoaded={(importedData) => {
            setData(importedData)
            toast({
              title: "Sucesso",
              description: `${importedData.length} registros importados com sucesso!`,
            })
          }}
        />
      </div>
      <Toaster />
    </main>
  )
}

function formatDate(date: Date): string {
  const pad = (num: number) => num.toString().padStart(2, "0")
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("")
}
