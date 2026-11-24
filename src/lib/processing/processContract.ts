import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json, TablesInsert } from '@/types/database'
import { extractDocumentText, ProcessingError, type DocumentText } from './extractText'
import { chunkPages, embedDocuments } from './embeddings'
import { extractContract, type ContractExtraction } from './extractContract'

/**
 * Pipeline de procesamiento de un contrato (reemplaza el workflow WF1 de n8n):
 *
 *   uploaded → ocr_processing → ocr_done → extracting → ready | needs_review | error
 *
 * 1. Descarga cada documento del bucket `contracts` y obtiene su texto por página.
 * 2. En paralelo:
 *    a. fragmenta el texto, genera embeddings (Voyage) y los guarda en
 *       document_chunks (los usa el chat);
 *    b. extrae los datos estructurados con Claude.
 * 3. Escribe contrato, evidencias, coberturas y alertas.
 *
 * Es idempotente: borra las filas derivadas antes de escribir. Si mientras corre
 * se vuelve a disparar (p. ej. el usuario agregó un documento), la corrida más
 * antigua descarta sus resultados.
 */
export async function processContract(contractId: string): Promise<void> {
  const db = createAdminClient()
  const startedAt = Date.now()
  const runId = crypto.randomUUID()

  const { data: contract } = await db
    .from('contracts')
    .select('id, user_id, contract_display_name, category, retry_count')
    .eq('id', contractId)
    .single()
  if (!contract) return

  const userId = contract.user_id

  await db.from('events').insert({
    user_id: userId,
    contract_id: contractId,
    event_type: 'processing_started',
    payload: { run_id: runId },
  })

  /** true si otra corrida más nueva tomó este contrato (o fue eliminado) */
  const superseded = async () => {
    const { data } = await db
      .from('events')
      .select('payload')
      .eq('contract_id', contractId)
      .eq('event_type', 'processing_started')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const latest = (data?.payload as { run_id?: string } | null)?.run_id
    return latest !== runId
  }

  const setStatus = (status: string) =>
    db.from('contracts').update({ status, error_code: null, error_message: null }).eq('id', contractId)

  try {
    await setStatus('ocr_processing')

    const { data: docs } = await db
      .from('contract_documents')
      .select('id, user_id, storage_path, file_mime, metadata, created_at')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true })
    if (!docs?.length) {
      throw new ProcessingError('no_documents', 'El contrato no tiene documentos para procesar.')
    }

    // Este cliente ignora RLS: no confiar en storage_path. Solo se descargan
    // archivos dentro de la carpeta del dueño del contrato.
    const allowedPrefix = `${userId}/${contractId}/`
    for (const doc of docs) {
      if (
        doc.user_id !== userId ||
        !doc.storage_path.startsWith(allowedPrefix) ||
        doc.storage_path.includes('..')
      ) {
        throw new ProcessingError('invalid_document', 'Uno de los documentos del contrato no es válido.')
      }
    }

    // ── 1. Texto por página ────────────────────────────────────────────────
    const texts: DocumentText[] = []
    for (const doc of docs) {
      const { data: blob, error } = await db.storage.from('contracts').download(doc.storage_path)
      if (error || !blob) {
        throw new ProcessingError('download_failed', 'No se pudo leer uno de los archivos subidos.')
      }
      const text = await extractDocumentText(new Uint8Array(await blob.arrayBuffer()), doc.file_mime)
      texts.push(text)

      const metadata = { ...(isObject(doc.metadata) ? doc.metadata : {}), text_method: text.method }
      await db.from('contract_documents').update({ pages: text.pageCount, metadata }).eq('id', doc.id)
    }
    if (await superseded()) return
    await setStatus('ocr_done')

    // ── 2. Embeddings + extracción en paralelo ─────────────────────────────
    await setStatus('extracting')

    const chunks = texts.flatMap((t, i) => chunkPages(i, t.pages))

    const [embeddingResult, extractionResult] = await Promise.allSettled([
      embedDocuments(chunks.map((c) => c.content)),
      extractContract({
        contractName: contract.contract_display_name,
        category: contract.category,
        documents: docs.map((d, i) => ({
          name: originalName(d.metadata) ?? `Documento ${i + 1}`,
          pages: texts[i].pages,
        })),
        today: new Date().toISOString().slice(0, 10),
      }),
    ])

    if (extractionResult.status === 'rejected') throw extractionResult.reason
    const extraction = extractionResult.value

    if (await superseded()) return

    // ── 3. Escritura ───────────────────────────────────────────────────────
    await Promise.all([
      db.from('benefits').delete().eq('contract_id', contractId),
      db.from('alerts').delete().eq('contract_id', contractId),
      db.from('document_chunks').delete().eq('contract_id', contractId),
    ])
    // evidence_snippets después de alerts (FK alerts.evidence_snippet_id)
    await db.from('evidence_snippets').delete().eq('contract_id', contractId)

    if (embeddingResult.status === 'fulfilled') {
      const vectors = embeddingResult.value
      const rows: TablesInsert<'document_chunks'>[] = chunks.map((c, i) => ({
        contract_id: contractId,
        document_id: docs[c.documentIndex].id,
        user_id: userId,
        chunk_index: i,
        content: c.content,
        page_start: c.pageStart,
        page_end: c.pageEnd,
        token_count: Math.ceil(c.content.length / 4),
        embedding: `[${vectors[i].join(',')}]`,
      }))
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await db.from('document_chunks').insert(rows.slice(i, i + 100))
        if (error) throw new Error(`document_chunks insert: ${error.message}`)
      }
    } else {
      console.error('[processContract] embeddings failed', contractId, embeddingResult.reason)
      await db.from('events').insert({
        user_id: userId,
        contract_id: contractId,
        event_type: 'embedding_failed',
        payload: { run_id: runId, error: String(embeddingResult.reason).slice(0, 500) },
      })
    }

    await writeExtraction(db, { contractId, userId, docIds: docs.map((d) => d.id), extraction })

    const status = extraction.needs_review_reasons.length > 0 ? 'needs_review' : 'ready'
    await db.from('contracts').update({ status }).eq('id', contractId)

    await db.from('events').insert({
      user_id: userId,
      contract_id: contractId,
      event_type: 'processing_completed',
      duration_ms: Date.now() - startedAt,
      payload: {
        run_id: runId,
        status,
        documents: docs.length,
        pages: texts.reduce((n, t) => n + t.pageCount, 0),
        text_methods: texts.map((t) => t.method),
        chunks: embeddingResult.status === 'fulfilled' ? chunks.length : 0,
        benefits: extraction.benefits.length,
        alerts: extraction.alerts.length,
      },
    })
  } catch (err) {
    console.error('[processContract] failed', contractId, err)
    if (await superseded().catch(() => false)) return

    const code = err instanceof ProcessingError ? err.code : 'processing_failed'
    const message =
      err instanceof ProcessingError
        ? err.userMessage
        : 'Ocurrió un error al procesar el contrato. Intenta nuevamente en unos minutos.'

    await db
      .from('contracts')
      .update({
        status: 'error',
        error_code: code,
        error_message: message,
        retry_count: (contract.retry_count ?? 0) + 1,
      })
      .eq('id', contractId)

    await db.from('events').insert({
      user_id: userId,
      contract_id: contractId,
      event_type: 'processing_failed',
      duration_ms: Date.now() - startedAt,
      payload: { run_id: runId, code, error: String(err).slice(0, 500) },
    })
  }
}

// ─── Escritura de la extracción ──────────────────────────────────────────────

type Db = ReturnType<typeof createAdminClient>
type SourceRef = { document: number; page: number | null; quote: string }

async function writeExtraction(
  db: Db,
  { contractId, userId, docIds, extraction: x }: {
    contractId: string
    userId: string
    docIds: string[]
    extraction: ContractExtraction
  },
) {
  const snippets: TablesInsert<'evidence_snippets'>[] = []
  const addSnippet = (fieldKey: string, ref: SourceRef | null): string | null => {
    if (!ref?.quote?.trim()) return null
    const id = crypto.randomUUID()
    const docIndex = ref.document >= 1 && ref.document <= docIds.length ? ref.document - 1 : 0
    snippets.push({
      id,
      contract_id: contractId,
      document_id: docIds[docIndex],
      user_id: userId,
      field_key: fieldKey,
      snippet: ref.quote.trim(),
      page: ref.page,
    })
    return id
  }

  for (const ev of x.evidence) addSnippet(ev.field_key, ev)

  const benefits: TablesInsert<'benefits'>[] = x.benefits.map((b, i) => {
    const snippetId = addSnippet(`benefit:${i}`, b.source)
    return {
      contract_id: contractId,
      user_id: userId,
      name: b.name,
      category: b.category,
      includes_simple: b.includes_simple,
      copay: { ...b.copay, coverage_percentage: b.coverage_percentage } as Json,
      deductible: summary(b.deductible),
      limits: summary(b.limits),
      waiting_period: b.waiting_period_days != null ? { days: b.waiting_period_days } : null,
      network_rules: summary(b.network_rules),
      requirements: b.requirements,
      restrictions: b.restrictions,
      evidence_snippet_ids: snippetId ? [snippetId] : null,
      sort_order: i,
    }
  })

  const alerts: TablesInsert<'alerts'>[] = x.alerts.map((a, i) => ({
    contract_id: contractId,
    user_id: userId,
    type: a.type,
    severity: a.severity,
    title: a.title,
    message: a.message,
    due_date: isoDate(a.due_date),
    status: 'open',
    evidence_snippet_id: addSnippet(`alert:${i}`, a.source),
  }))

  if (snippets.length) {
    const { error } = await db.from('evidence_snippets').insert(snippets)
    if (error) throw new Error(`evidence_snippets insert: ${error.message}`)
  }

  const contractUpdate = {
    provider_name: x.provider_name,
    policyholder_name: x.policyholder_name,
    ai_summary_simple: x.ai_summary_simple,
    key_points: x.key_points,
    monthly_cost: x.monthly_cost,
    monthly_cost_currency: x.monthly_cost_currency,
    payment_method: x.payment_method,
    late_payment_terms: x.late_payment_terms,
    copay_type: x.copay_type,
    copay_percentage: x.copay_percentage,
    copay_amount: x.copay_amount,
    copay_currency: x.copay_currency,
    copay_summary: x.copay_summary,
    deductible_type: x.deductible_type,
    deductible_amount: x.deductible_amount,
    deductible_currency: x.deductible_currency,
    deductible_summary: x.deductible_summary,
    effective_date: isoDate(x.effective_date),
    end_date: isoDate(x.end_date),
    renewal_date: isoDate(x.renewal_date),
    auto_renew: x.auto_renew,
    price_adjustment_clause: x.price_adjustment_clause,
    explicit_increase: x.explicit_increase,
    explicit_increase_rate: x.explicit_increase_rate,
    explicit_increase_date: isoDate(x.explicit_increase_date),
    explicit_increase_evidence: x.explicit_increase_evidence,
    cancellation_notice_days: x.cancellation_notice_days,
    cancellation_summary: x.cancellation_summary,
    reimbursement_summary: x.reimbursement_summary,
    privacy_summary: x.privacy_summary,
    claims_phone: x.claims_phone,
    claims_email: x.claims_email,
    claims_url: x.claims_url,
    exclusions: x.exclusions,
    waiting_periods: x.waiting_periods,
    missing_references: x.missing_references,
    needs_review_reasons: x.needs_review_reasons,
    missing_fields: missingFields(x),
  }

  const { error: contractError } = await db.from('contracts').update(contractUpdate).eq('id', contractId)
  if (contractError) throw new Error(`contracts update: ${contractError.message}`)

  if (benefits.length) {
    const { error } = await db.from('benefits').insert(benefits)
    if (error) throw new Error(`benefits insert: ${error.message}`)
  }
  if (alerts.length) {
    const { error } = await db.from('alerts').insert(alerts)
    if (error) throw new Error(`alerts insert: ${error.message}`)
  }
}

/** Datos clave que el usuario puede completar a mano con "Editar". */
function missingFields(x: ContractExtraction): string[] {
  const missing: string[] = []
  if (!x.provider_name) missing.push('Isapre / aseguradora')
  if (!x.policyholder_name) missing.push('Titular')
  if (x.monthly_cost == null) missing.push('Costo mensual')
  if (!isoDate(x.effective_date)) missing.push('Inicio de vigencia')
  if (!isoDate(x.renewal_date) && !isoDate(x.end_date)) missing.push('Término / renovación')
  return missing
}

function isoDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return Number.isNaN(Date.parse(value)) ? null : value
}

function summary(text: string | null): Json {
  return text ? { summary: text } : null
}

function isObject(v: Json | null): v is { [key: string]: Json | undefined } {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function originalName(metadata: Json | null): string | null {
  return isObject(metadata) && typeof metadata.original_name === 'string' ? metadata.original_name : null
}
