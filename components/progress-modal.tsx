import { Progress } from "@/components/ui/progress"

interface ProgressModalProps {
  isOpen: boolean
  current: number
  total: number
  speed?: number
  timeRemaining?: number
}

export function ProgressModal({ isOpen, current, total, speed, timeRemaining }: ProgressModalProps) {
  if (!isOpen) return null

  const progress = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium mb-4">Importando registros</h3>
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>
              {current.toLocaleString()} de {total.toLocaleString()} registros
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        {speed !== undefined && (
          <div className="text-sm text-gray-500">
            <p>Velocidade: {speed} registros/s</p>
            {timeRemaining !== undefined && <p>Tempo restante estimado: {formatTime(timeRemaining)}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} segundos`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes} min ${remainingSeconds} seg`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours} h ${minutes} min`
  }
}
