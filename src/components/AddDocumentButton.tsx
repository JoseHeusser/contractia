'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Plus, X, Loader2, Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Agrega documentos relacionados al mismo contrato sin crear uno nuevo
 * (obs. #1). Vuelve a procesar el contrato con todos sus documentos.
 */
export function AddDocumentButton({ contractId }: { contractId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length) {
      setFiles(prev => [...prev, ...accepted])
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
    onDropRejected: () => setError('Archivo no válido (PDF, JPG, PNG o WEBP, máx. 50MB).'),
  })

  async function handleUpload() {
    if (!files.length) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      const res = await fetch(`/api/contracts/${contractId}/documents`, { method: 'POST', body: formData })
      if (res.ok) {
        setOpen(false)
        setFiles([])
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Error al subir.')
      }
    } catch {
      setError('Error de red. Intenta nuevamente.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Agregar documento
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="font-semibold text-gray-900">Agregar documento al contrato</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5">
              <p className="text-xs text-gray-500 mb-3">
                Sube documentos relacionados (condiciones generales, anexos, tablas de tope). El contrato se volverá a analizar con todos los archivos.
              </p>
              <div
                {...getRootProps()}
                className={cn(
                  'rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
                  isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Arrastra o <span className="text-blue-600 font-medium">haz clic</span></p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WEBP — máx. 50MB</p>
              </div>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2">
                      <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate flex-1">{f.name}</span>
                      <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleUpload} disabled={!files.length || uploading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</> : 'Subir y reprocesar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
