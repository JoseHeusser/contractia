'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, XCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'uploaded', label: 'Archivo subido' },
  { key: 'ocr_processing', label: 'Extrayendo texto (OCR)' },
  { key: 'ocr_done', label: 'Texto extraído' },
  { key: 'extracting', label: 'Analizando con IA' },
  { key: 'ready', label: 'Listo' },
]

const STATUS_ORDER: Record<string, number> = {
  uploaded: 0, ocr_processing: 1, ocr_done: 2, extracting: 3, ready: 4, needs_review: 4, error: 4,
}

interface ProcessingStatusProps {
  contractId: string
  initialStatus: string
}

export function ProcessingStatus({ contractId, initialStatus }: ProcessingStatusProps) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'ready' || status === 'needs_review' || status === 'error') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/contracts/${contractId}/status`)
        if (!res.ok) return
        const data = await res.json()
        setStatus(data.status)
        if (data.error_message) setErrorMessage(data.error_message)
        if (data.status === 'ready' || data.status === 'needs_review') {
          clearInterval(interval)
          router.refresh()
        }
        if (data.status === 'error') clearInterval(interval)
      } catch {
        // network error, keep polling
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [status, contractId, router])

  const currentOrder = STATUS_ORDER[status] ?? 0
  const isError = status === 'error'
  const isDone = status === 'ready' || status === 'needs_review'

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-5">Procesando contrato...</h3>
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const stepOrder = i
          const isCurrentStep = !isDone && !isError && currentOrder === stepOrder
          const isCompleted = isDone || (!isError && currentOrder > stepOrder)
          const isFailed = isError && currentOrder === stepOrder

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={cn(
                'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full',
                isCompleted ? 'bg-green-100' :
                isCurrentStep ? 'bg-blue-100' :
                isFailed ? 'bg-red-100' : 'bg-gray-100'
              )}>
                {isCompleted ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                ) : isCurrentStep ? (
                  <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                ) : isFailed ? (
                  <XCircle className="h-3.5 w-3.5 text-red-600" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-gray-300" />
                )}
              </div>
              <span className={cn(
                'text-sm',
                isCompleted ? 'text-gray-700 font-medium' :
                isCurrentStep ? 'text-blue-700 font-medium' :
                isFailed ? 'text-red-700' : 'text-gray-400'
              )}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {isError && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-100 p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{errorMessage ?? 'Error durante el procesamiento. Contacta soporte.'}</p>
        </div>
      )}

      {status === 'needs_review' && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Procesado con observaciones. Algunos campos requieren revisión manual.</p>
        </div>
      )}
    </div>
  )
}
