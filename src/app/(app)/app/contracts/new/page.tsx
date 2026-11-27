'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'isapre', label: 'Isapre' },
  { value: 'seguro_complementario', label: 'Seguro Complementario' },
  { value: 'seguro_catastrofico', label: 'Seguro Catastrófico' },
  { value: 'finanzas', label: 'Finanzas / Otro' },
]

export default function NewContractPage() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [name, setName] = useState('')
  const [category, setCategory] = useState('isapre')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    if (!accepted.length) return
    setFiles(prev => {
      const merged = [...prev, ...accepted]
      // Auto-fill name from first file if empty
      if (!name && merged[0]) {
        setName(merged[0].name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
      }
      return merged
    })
    setError(null)
  }, [name])

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

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
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0]
      if (err?.code === 'file-too-large') setError('Uno o más archivos superan el límite de 50MB.')
      else if (err?.code === 'file-invalid-type') setError('Solo se aceptan PDF, JPG, PNG o WEBP.')
      else setError('Archivo no válido.')
    },
  })

  async function handleUpload() {
    if (!files.length || !name.trim()) return
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      formData.append('name', name.trim())
      formData.append('category', category)

      const res = await fetch('/api/contracts/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al subir los archivos.')
        setUploading(false)
        return
      }

      router.push(`/app/contracts/${data.contractId}`)
    } catch {
      setError('Error de red. Intenta nuevamente.')
      setUploading(false)
    }
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Subir contrato</h1>
        <p className="text-sm text-ink-muted mt-1">
          Sube tu póliza o contrato de salud. La IA extraerá todos los datos automáticamente.
        </p>
      </div>

      {/* Warning */}
      <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-6">
        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium mb-0.5">Sube solo archivos de un mismo contrato</p>
          <p className="text-amber-700 text-xs">
            Si tienes múltiples contratos distintos, súbelos por separado. Esta pantalla agrupa todos los archivos como un solo contrato.
          </p>
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors mb-4',
          isDragActive ? 'border-violet/50 bg-lavender' : 'border-line-strong bg-surface hover:border-violet/50 hover:bg-lavender/50',
          files.length > 0 && !isDragActive && 'border-lavender-deep bg-lavender/30'
        )}
      >
        <input {...getInputProps()} />
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-lavender-deep mb-3">
          <Upload className="h-6 w-6 text-violet" />
        </div>
        <p className="text-sm font-medium text-ink-soft mb-1">
          {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra los archivos aquí'}
        </p>
        <p className="text-xs text-ink-muted">
          o <span className="text-violet font-medium">haz clic para seleccionar</span>
        </p>
        <p className="text-xs text-ink-faint mt-2">PDF, JPG, PNG o WEBP — máximo 50MB por archivo</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mb-6 space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-white border border-line px-4 py-3">
              <div className="h-8 w-8 rounded-lg bg-lavender flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-violet" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{file.name}</p>
                <p className="text-xs text-ink-faint">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="p-1 rounded-full hover:bg-lavender text-ink-faint hover:text-ink-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <p className="text-xs text-ink-faint text-right">
            {files.length} archivo{files.length > 1 ? 's' : ''} — {(totalSize / 1024 / 1024).toFixed(2)} MB total
          </p>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-ink-soft mb-1.5">
            Nombre del contrato
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Isapre Cruz Blanca 2025"
            className="w-full rounded-xl border border-line-strong px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-violet focus:ring-2 focus:ring-violet/30 transition-all"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-ink-soft mb-1.5">
            Categoría
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-line-strong px-3.5 py-2.5 text-sm text-ink outline-none focus:border-violet focus:ring-2 focus:ring-violet/30 transition-all bg-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!files.length || !name.trim() || uploading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo px-4 py-3 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo y procesando...</>
          ) : (
            <><Upload className="h-4 w-4" /> Subir y procesar {files.length > 1 ? `${files.length} archivos` : 'contrato'}</>
          )}
        </button>
      </div>
    </div>
  )
}
