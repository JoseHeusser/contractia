import 'server-only'
import { extractText, getDocumentProxy } from 'unpdf'
import { anthropic, EXTRACTION_MODEL } from './anthropic'

export type PageText = { page: number; text: string }

export type DocumentText = {
  pages: PageText[]
  pageCount: number
  /** 'pdf_text' = capa de texto del PDF; 'claude_ocr' = transcrito por Claude */
  method: 'pdf_text' | 'claude_ocr'
}

// Un PDF con menos de esto por página en promedio se trata como escaneado.
const MIN_CHARS_PER_PAGE = 200

// La API acepta hasta 32 MB por request; base64 infla ~33 %.
const MAX_OCR_BYTES = 22 * 1024 * 1024

const PAGE_MARKER = /^=== PÁGINA (\d+) ===\s*$/m

/**
 * Obtiene el texto de un documento, separado por página.
 * PDFs con capa de texto → unpdf (rápido, sin costo de IA).
 * PDFs escaneados e imágenes → transcripción con Claude.
 */
export async function extractDocumentText(bytes: Uint8Array, mime: string): Promise<DocumentText> {
  if (mime === 'application/pdf') {
    // unpdf puede transferir (vaciar) el buffer que recibe; se le pasa una copia
    // para conservar `bytes` por si hay que hacer OCR después.
    const pdf = await getDocumentProxy(new Uint8Array(bytes))
    const { totalPages, text } = await extractText(pdf, { mergePages: false })
    const pages = text.map((t, i) => ({ page: i + 1, text: normalize(t) }))
    const totalChars = pages.reduce((n, p) => n + p.text.length, 0)

    if (totalPages > 0 && totalChars / totalPages >= MIN_CHARS_PER_PAGE) {
      return { pages, pageCount: totalPages, method: 'pdf_text' }
    }
    return transcribeWithClaude(bytes, mime, totalPages)
  }

  return transcribeWithClaude(bytes, mime, 1)
}

async function transcribeWithClaude(bytes: Uint8Array, mime: string, pageCount: number): Promise<DocumentText> {
  if (bytes.byteLength > MAX_OCR_BYTES) {
    throw new ProcessingError(
      'file_too_large_for_ocr',
      'El documento es un escaneo demasiado grande para procesarlo. Prueba con un PDF que tenga texto seleccionable o divídelo en partes.',
    )
  }

  const data = Buffer.from(bytes).toString('base64')
  const source =
    mime === 'application/pdf'
      ? ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } } as const)
      : ({
          type: 'image',
          source: { type: 'base64', media_type: toImageMediaType(mime), data },
        } as const)

  // Streaming: la transcripción de un escaneo largo puede ser extensa.
  const stream = anthropic.messages.stream({
    model: EXTRACTION_MODEL,
    max_tokens: 64000,
    output_config: { effort: 'low' },
    system:
      'Transcribes documentos escaneados de contratos de salud chilenos. Devuelves el texto tal cual aparece, sin resumir, corregir ni comentar.',
    messages: [
      {
        role: 'user',
        content: [
          source,
          {
            type: 'text',
            text:
              'Transcribe el texto completo de este documento, página por página. ' +
              'Antes de cada página escribe una línea exacta "=== PÁGINA N ===" (N empieza en 1). ' +
              'Las tablas transcríbelas fila por fila separando columnas con " | ". ' +
              'Si una parte es ilegible escribe [ilegible]. No agregues nada más.',
          },
        ],
      },
    ],
  })
  const message = await stream.finalMessage()

  if (message.stop_reason === 'refusal') {
    throw new ProcessingError('ocr_refused', 'No fue posible leer el documento.')
  }
  const raw = message.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')

  const pages = splitPages(raw)
  if (!pages.length) {
    throw new ProcessingError('ocr_empty', 'No se encontró texto legible en el documento.')
  }
  return { pages, pageCount: Math.max(pageCount, pages.length), method: 'claude_ocr' }
}

function splitPages(raw: string): PageText[] {
  const parts = raw.split(PAGE_MARKER)
  // split con grupo de captura: [antes, n1, texto1, n2, texto2, ...]
  if (parts.length < 3) {
    const text = normalize(raw)
    return text ? [{ page: 1, text }] : []
  }
  const pages: PageText[] = []
  for (let i = 1; i < parts.length; i += 2) {
    const text = normalize(parts[i + 1] ?? '')
    if (text) pages.push({ page: Number(parts[i]), text })
  }
  return pages
}

function normalize(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function toImageMediaType(mime: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  if (mime === 'image/png' || mime === 'image/webp' || mime === 'image/gif') return mime
  if (mime === 'image/jpeg') return mime
  // image/tiff no está soportado por la API de visión
  throw new ProcessingError(
    'unsupported_image',
    'Las imágenes TIFF no se pueden procesar. Sube el documento como PDF, JPG o PNG.',
  )
}

export class ProcessingError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
  ) {
    super(userMessage)
  }
}
