// Ejecuta un archivo .sql contra Postgres (Supabase) usando SUPABASE_DB_URL.
// Requiere el paquete `pg` (instálalo sin guardar: npm install pg --no-save).
//
// Uso:
//   SUPABASE_DB_URL="postgresql://postgres:PASS@HOST:5432/postgres" \
//     node scripts/run_migration.mjs supabase/migrations/0001_knowledge_base.sql
import { readFile } from 'node:fs/promises'
import pg from 'pg'

const dbUrl = process.env.SUPABASE_DB_URL
const file = process.argv[2]
if (!dbUrl || !file) { console.error('Falta SUPABASE_DB_URL o el archivo .sql'); process.exit(1) }

const sql = await readFile(file, 'utf8')
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query(sql)
  console.log(`✓ Migración aplicada: ${file}`)
} catch (e) {
  console.error('Error aplicando migración:', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
