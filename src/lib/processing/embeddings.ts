import 'server-only'
import type { PageText } from './extractText'

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-3' // 1024 dims, igual que document_chunks.embedding

// ~1.800 caracteres ≈ 450 tokens: fragmentos citables sin perder contexto.
const CHUNK_CHARS = 1800
const CHUNK_OVERLAP = 200

// Límites por request de Voyage: 128 textos y 120K tokens. Se usa un margen
// menor por si la cuenta está en el tier gratuito (10K TPM).
const BATCH_MAX_ITEMS = 64
const BATCH_MAX_CHARS = 30_000

export type Chunk = {
  documentIndex: number
  content: string
  pageStart: number
  pageEnd: number
}

/** Divide el texto de cada página en fragmentos con solapamiento. */
export function chunkPages(documentIndex: number, pages: PageText[]): Chunk[] {
  const chunks: Chunk[] = []
  for (const { page, text } of pages) {
    if (text.length <= CHUNK_CHARS) {
      if (text.trim()) chunks.push({ documentIndex, content: text, pageStart: page, pageEnd: page })
      continue
    }
    let start = 0
    while (start < text.length) {
      let end = Math.min(start + CHUNK_CHARS, text.length)
      // Cortar en un límite de párrafo u oración si hay uno cerca
      if (end < text.length) {
        const window = text.slice(start + CHUNK_CHARS / 2, end)
        const cut = Math.max(window.lastIndexOf('\n'), window.lastIndexOf('. '))
        if (cut > 0) end = start + CHUNK_CHARS / 2 + cut + 1
      }
      const content = text.slice(start, end).trim()
      if (content) chunks.push({ documentIndex, content, pageStart: page, pageEnd: page })
      if (end >= text.length) break
      start = end - CHUNK_OVERLAP
    }
  }
  return chunks
}

/** Embeddings de documento (input_type "document") en lotes, con reintento ante 429. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) throw new Error('Falta VOYAGE_API_KEY')

  const out: number[][] = []
  let batch: string[] = []
  let batchChars = 0

  const flush = async () => {
    if (!batch.length) return
    out.push(...(await embedBatch(apiKey, batch)))
    batch = []
    batchChars = 0
  }

  for (const text of texts) {
    if (batch.length >= BATCH_MAX_ITEMS || batchChars + text.length > BATCH_MAX_CHARS) await flush()
    batch.push(text)
    batchChars += text.length
  }
  await flush()
  return out
}

async function embedBatch(apiKey: string, input: string[], attempt = 0): Promise<number[][]> {
  const res = await fetch(VOYAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: VOYAGE_MODEL, input, input_type: 'document' }),
  })

  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    const retryAfter = Number(res.headers.get('retry-after'))
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 20_000
    await new Promise((r) => setTimeout(r, waitMs))
    return embedBatch(apiKey, input, attempt + 1)
  }
  if (!res.ok) {
    throw new Error(`Voyage ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }

  const data = (await res.json()) as { data: Array<{ index: number; embedding: number[] }> }
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}
