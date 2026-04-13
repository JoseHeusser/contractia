'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'isapre', label: 'Isapre' },
  { value: 'seguro_complementario', label: 'Seguro Complementario' },
  { value: 'seguro_catastrofico', label: 'Seguro Catastrófico' },
  { value: 'finanzas', label: 'Finanzas / Otro' },
]

export default function NewContractPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('isapre')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    if (!name) {
      setName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
    }
    setError(null)
  }, [name])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 50 * 1024 * 1024,
    maxFiles: 1,
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0]
      if (err?.code === 'file-too-large') setError('El archivo supera el límite de 50MB.')
      else if (err?.code === 'file-invalid-type') setError('Solo se aceptan PDF, JPG, PNG o WEBP.')
      else setError('Archivo no válido.')
    },
  })

  async function handleUpload() {
    if (!file || !name.trim()) return
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', name.trim())
      formData.append('category', category)

      const res = await fetch('/api/contracts/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al subir el archivo.')
        setUploading(false)
        return
      }

      router.push(`/app/contracts/${data.contractId}`)
    } catch {
      setError('Error de red. Intenta nuevamente.')
      setUploading(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Subir contrato</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sube tu póliza o contrato de salud. La IA extraerá todos los datos automáticamente.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors mb-6',
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50',
          file && 'border-green-300 bg-green-50'
        )}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); setName('') }}
              className="ml-2 p-1 rounded-full hover:bg-green-200 text-green-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-3">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra tu contrato aquí'}
            </p>
            <p className="text-xs text-gray-500">o <span className="text-blue-600 font-medium">haz clic para seleccionar</span></p>
            <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG o WEBP — máximo 50MB</p>
          </>
        )}
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Nombre del contrato
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Isapre Cruz Blanca 2025"
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1.5">
            Categoría
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
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
          disabled={!file || !name.trim() || uploading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo y procesando...</>
          ) : (
            <><Upload className="h-4 w-4" /> Subir y procesar</>
          )}
        </button>
      </div>
    </div>
  )
}
