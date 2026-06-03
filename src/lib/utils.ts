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

/**
 * Suma costos mensuales agrupados por moneda. Evita mezclar UF y CLP en un
 * único total (obs. #16): UF y Pesos quedan en líneas separadas.
 */
export function sumByCurrency(
  items: Array<{ monthly_cost: number | null; monthly_cost_currency: string | null }>
): Array<{ currency: string; total: number }> {
  const totals: Record<string, number> = {}
  for (const it of items) {
    if (it.monthly_cost == null) continue
    const curr = (it.monthly_cost_currency || 'CLP').toUpperCase()
    totals[curr] = (totals[curr] ?? 0) + it.monthly_cost
  }
  // CLP primero, luego UF, luego el resto
  const order = (c: string) => (c === 'CLP' ? 0 : c === 'UF' ? 1 : 2)
  return Object.entries(totals)
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => order(a.currency) - order(b.currency))
}

/**
 * Oculta alertas con mensajes técnicos (errores internos del servidor) y
 * suaviza alertas sobre documentos generales que el usuario no posee
 * (obs. #2 y #5). Devuelve solo las alertas que tiene sentido mostrar.
 */
const TECHNICAL_ALERT_PATTERNS = [
  /internal server error/i,
  /error interno del servidor/i,
  /\b(error|status|código|code|http)\s*[:#]?\s*5\d{2}\b/i, // "error 500", "status: 502"
  /traceback/i,
  /\bexception\b/i,
  /null reference|referenceerror|typeerror/i,
  /econnrefused|fetch failed|stack trace/i,
]

export function sanitizeAlerts<T extends { title?: string | null; message?: string | null; type?: string | null }>(
  alerts: T[] | null | undefined
): T[] {
  if (!alerts) return []
  return alerts.filter((a) => {
    const text = `${a.title ?? ''} ${a.message ?? ''}`
    if (TECHNICAL_ALERT_PATTERNS.some((p) => p.test(text))) return false
    return true
  })
}
