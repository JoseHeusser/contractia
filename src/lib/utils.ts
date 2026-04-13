import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null, currency: string | null): string {
  if (amount === null || amount === undefined) return '—'
  const curr = (currency || 'CLP').toUpperCase()
  if (curr === 'UF') {
    return `${amount.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} UF`
  }
  // CLP or default
  return `$${Math.round(amount).toLocaleString('es-CL')}`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''))
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    uploaded: 'Subido',
    ocr_processing: 'Procesando OCR',
    ocr_done: 'OCR Completado',
    extracting: 'Extrayendo datos',
    ready: 'Listo',
    needs_review: 'Requiere revisión',
    error: 'Error',
  }
  return labels[status] ?? status
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    isapre: 'Isapre',
    seguro_complementario: 'Seguro Complementario',
    seguro_catastrofico: 'Seguro Catastrófico',
    finanzas: 'Finanzas',
    otro: 'Otro',
  }
  return labels[category] ?? category
}
