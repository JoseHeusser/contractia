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
        className="inline-flex items-center gap-2 rounded-lg border border-lavender-deep bg-lavender px-3 py-2 text-sm font-medium text-violet hover:bg-lavender-deep transition-colors"
      >
        <Plus className="h-4 w-4" />
        Agregar documento
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-deep/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="font-semibold text-ink">Agregar documento al contrato</h3>
              <button onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-lg p-1 text-ink-faint hover:bg-lavender hover:text-indigo"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5">
              <p className="text-xs text-ink-muted mb-3">
                Sube documentos relacionados (condiciones generales, anexos, tablas de tope). El contrato se volverá a analizar con todos los archivos.
              </p>
              <div
                {...getRootProps()}
                className={cn(
                  'rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
                  isDragActive ? 'border-violet/50 bg-lavender' : 'border-line-strong bg-surface hover:border-violet/50'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="h-6 w-6 text-violet mx-auto mb-2" />
                <p className="text-sm text-ink-muted">Arrastra o <span className="text-violet font-medium">haz clic</span></p>
                <p className="text-xs text-ink-faint mt-1">PDF, JPG, PNG, WEBP — máx. 50MB</p>
              </div>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                      <FileText className="h-4 w-4 text-violet flex-shrink-0" />
                      <span className="text-sm text-ink-soft truncate flex-1">{f.name}</span>
                      <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-ink-faint hover:text-ink-muted">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <button onClick={() => setOpen(false)} className="rounded-xl border border-line-strong px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface">Cancelar</button>
              <button onClick={handleUpload} disabled={!files.length || uploading} className="inline-flex items-center gap-2 rounded-xl bg-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50">
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</> : 'Subir y reprocesar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
