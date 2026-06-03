// Ingesta documentos normativos a public.knowledge_chunks (RAG global).
// Extrae texto con pdftotext, los divide en chunks, los embebe con Voyage (voyage-3)
// y los sube vía PostgREST. Re-ejecutable: borra los chunks previos de cada source.
//
// Uso:
//   node --env-file=.env.local scripts/ingest_knowledge.mjs "../knowledge/001 Documentos de Salud (MVP Salud).pdf"
// (Pasa uno o más PDFs. NO incluyas el Libro Arancel: ese va a fonasa_arancel.)
import { execFileSync } from 'node:child_process'
import { basename } from 'node:path'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const VOYAGE = process.env.VOYAGE_API_KEY
if (!URL || !KEY || !VOYAGE) { console.error('Faltan env: SUPABASE_URL / SERVICE_ROLE_KEY / VOYAGE_API_KEY'); process.exit(1) }

const files = process.argv.slice(2)
if (!files.length) { console.error('Pasa al menos un PDF como argumento.'); process.exit(1) }

function pdfText(path) {
  return execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

// Chunking por párrafos, ~1200 chars con solape de ~150
function chunk(text, size = 1200, overlap = 150) {
  const paras = text.split(/\n\s*\n/).map(p => p.replace(/\s+\n/g, '\n').trim()).filter(Boolean)
  const chunks = []
  let buf = ''
  for (const p of paras) {
    if ((buf + '\n\n' + p).length > size && buf) {
      chunks.push(buf.trim())
      buf = buf.slice(Math.max(0, buf.length - overlap))
    }
    buf += (buf ? '\n\n' : '') + p
  }
  if (buf.trim()) chunks.push(buf.trim())
  return chunks.filter(c => c.length > 40)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function embed(texts, attempt = 1) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${VOYAGE}` },
    body: JSON.stringify({ model: 'voyage-3', input: texts, input_type: 'document' }),
  })
  if (!res.ok) {
    const body = await res.text()
    // Rate limit del tier gratis (3 RPM / 10K TPM): reintenta con backoff
    if ((res.status === 429 || /rate limit/i.test(body)) && attempt <= 6) {
      console.log(`  rate limit, esperando 25s (intento ${attempt})...`)
      await sleep(25000)
      return embed(texts, attempt + 1)
    }
    throw new Error('Voyage error: ' + body)
  }
  const data = await res.json()
  return data.data.map(d => d.embedding)
}

async function deleteSource(source) {
  await fetch(`${URL}/rest/v1/knowledge_chunks?source=eq.${encodeURIComponent(source)}`, {
    method: 'DELETE',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'return=minimal' },
  })
}

async function insert(records) {
  const res = await fetch(`${URL}/rest/v1/knowledge_chunks`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(records),
  })
  if (!res.ok) throw new Error('Insert error: ' + await res.text())
}

for (const file of files) {
  const source = basename(file)
  console.log(`\n→ ${source}`)
  const text = pdfText(file)
  const chunks = chunk(text)
  console.log(`  ${chunks.length} chunks`)
  await deleteSource(source)

  // Lotes chicos por el límite del tier gratis de Voyage (10K TPM); espera ~21s (3 RPM)
  const BATCH = 8
  let done = 0
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH)
    const embeddings = await embed(slice)
    const records = slice.map((content, j) => ({ source, title: source.replace(/\.pdf$/i, ''), content, embedding: embeddings[j] }))
    await insert(records)
    done += slice.length
    console.log(`  ${done}/${chunks.length}`)
    if (i + BATCH < chunks.length) await sleep(21000)
  }
}
console.log('\n✓ Conocimiento normativo ingestado.')
