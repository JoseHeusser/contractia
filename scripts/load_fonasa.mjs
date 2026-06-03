// Carga fonasa_arancel.json en la tabla public.fonasa_arancel vía PostgREST.
// Requiere que la migración 0001_knowledge_base.sql ya esté aplicada.
//
// Uso:  node --env-file=.env.local scripts/load_fonasa.mjs
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SB_URL || !KEY) { console.error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const jsonPath = fileURLToPath(new URL('./fonasa_arancel.json', import.meta.url))
const rows = JSON.parse(await readFile(jsonPath, 'utf8'))
console.log(`Cargando ${rows.length} prestaciones...`)

const BATCH = 500
let done = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH).map(r => ({
    codigo: r.codigo,
    codigo_norm: r.codigo_norm,
    grupo: r.grupo ?? null,
    denominacion: r.denominacion,
    n1_total: r.n1_total ?? null, n1_benef: r.n1_benef ?? null,
    n2_total: r.n2_total ?? null, n2_benef: r.n2_benef ?? null,
    n3_total: r.n3_total ?? null, n3_benef: r.n3_benef ?? null,
  }))
  const res = await fetch(`${SB_URL}/rest/v1/fonasa_arancel?on_conflict=codigo`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  })
  if (!res.ok) { console.error('Error batch', i, await res.text()); process.exit(1) }
  done += batch.length
  console.log(`  ${done}/${rows.length}`)
}
console.log('✓ Arancel FONASA cargado.')
