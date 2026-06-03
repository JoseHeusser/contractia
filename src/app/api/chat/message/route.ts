import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

// ─── SQL patterns ────────────────────────────────────────────────────────────
// Questions answerable from structured DB fields without RAG

type SqlAnswer = {
  answered: true
  content: string
} | {
  answered: false
}

const SQL_PATTERNS = [
  // Copago / deducible / tope
  /copago|co[-\s]?pago/i,
  /deducible/i,
  /tope\s+(anual|mensual|cobertura)/i,
  // Costos
  /prima\s+(mensual|anual)/i,
  /costo\s+(mensual|del\s+plan)/i,
  /cuánto\s+(cuesta|pago|vale)/i,
  /cuanto\s+(cuesta|pago|vale)/i,
  /precio\s+(del\s+)?plan/i,
  // Fechas
  /vigencia|vencimiento|fecha\s+(de\s+)?(inicio|término|termino|vencimiento)/i,
  /cuándo\s+(vence|termina|empieza)/i,
  /cuando\s+(vence|termina|empieza)/i,
  // Reajuste / UF
  /reajuste|uf\s*reajuste|porcentaje\s+de\s+reajuste/i,
  // Estado contrato
  /estado\s+(del\s+)?contrato/i,
  /plan\s+de\s+salud/i,
  /nombre\s+(del\s+)?plan/i,
  // Isapre / aseguradora
  /qué\s+(isapre|aseguradora|compañía|empresa)/i,
  /que\s+(isapre|aseguradora|compañia|empresa)/i,
  /con\s+quién\s+tengo/i,
  /con\s+quien\s+tengo/i,
]

function looksLikeSqlQuestion(question: string): boolean {
  return SQL_PATTERNS.some(p => p.test(question))
}

// ─── SQL direct answer ────────────────────────────────────────────────────────

async function answerFromSQL(
  question: string,
  contractIds: string[],
): Promise<SqlAnswer> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const res = await fetch(
    `${supabaseUrl}/rest/v1/contracts?id=in.(${contractIds.join(',')})&select=contract_display_name,provider_name,category,status,monthly_cost,monthly_cost_currency,copay_percentage,copay_amount,copay_type,copay_summary,deductible_amount,deductible_type,deductible_summary,reajuste:explicit_increase_rate,price_adjustment_clause,effective_date,end_date,renewal_date,auto_renew,policyholder_name,ai_summary_simple`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    },
  )

  if (!res.ok) return { answered: false }
  const contracts: Record<string, unknown>[] = await res.json()
  if (!contracts.length) return { answered: false }

  const fmtMoney = (amount: unknown, currency: unknown) => {
    if (amount == null) return null
    const curr = String(currency || 'CLP').toUpperCase()
    return curr === 'UF'
      ? `${amount} UF`
      : `$${Number(amount).toLocaleString('es-CL')} CLP`
  }

  // Build a compact data block for Claude to answer from
  const dataBlock = contracts
    .map((c) => {
      const lines: string[] = [`**${c.contract_display_name ?? 'Contrato'}**`]
      if (c.provider_name) lines.push(`Aseguradora/Isapre: ${c.provider_name}`)
      if (c.category) lines.push(`Categoría: ${c.category}`)
      if (c.policyholder_name) lines.push(`Titular: ${c.policyholder_name}`)
      const cost = fmtMoney(c.monthly_cost, c.monthly_cost_currency)
      if (cost) lines.push(`Costo mensual: ${cost}`)
      if (c.copay_summary) lines.push(`Copago: ${c.copay_summary}`)
      else if (c.copay_percentage != null) lines.push(`Copago: ${c.copay_percentage}%`)
      if (c.deductible_summary) lines.push(`Deducible: ${c.deductible_summary}`)
      else if (c.deductible_amount != null) lines.push(`Deducible: ${fmtMoney(c.deductible_amount, c.monthly_cost_currency)}`)
      if (c.reajuste != null) lines.push(`Reajuste explícito: ${c.reajuste}%`)
      else if (c.price_adjustment_clause) lines.push('Tiene cláusula de reajuste de precio')
      if (c.effective_date) lines.push(`Inicio vigencia: ${c.effective_date}`)
      if (c.end_date) lines.push(`Término vigencia: ${c.end_date}`)
      if (c.renewal_date) lines.push(`Renovación: ${c.renewal_date}`)
      if (c.auto_renew != null) lines.push(`Renovación automática: ${c.auto_renew ? 'Sí' : 'No'}`)
      return lines.join('\n')
    })
    .join('\n\n')

  // Check if there's actually data to answer with (not all nulls)
  const hasData = contracts.some(
    (c) =>
      c.monthly_cost != null ||
      c.copay_percentage != null ||
      c.copay_summary ||
      c.deductible_amount != null ||
      c.effective_date ||
      c.end_date ||
      c.provider_name,
  )

  if (!hasData) return { answered: false }

  // Ask Claude to formulate a natural answer using just the structured data
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { answered: false }

  const sqlRes = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system:
        'Eres el asistente de ContractIA. Responde la pregunta del usuario usando ÚNICAMENTE los datos estructurados del contrato proporcionados. Responde en español, lenguaje simple y directo. Si los datos no son suficientes para responder, responde exactamente con: NO_DATA',
      messages: [
        {
          role: 'user',
          content: `Datos del contrato:\n${dataBlock}\n\nPregunta: ${question}`,
        },
      ],
    }),
  })

  if (!sqlRes.ok) return { answered: false }
  const sqlData = await sqlRes.json()
  const answer = (sqlData.content?.[0]?.text ?? '').trim()

  if (!answer || answer === 'NO_DATA') return { answered: false }
  return { answered: true, content: answer }
}

// ─── Voyage AI embeddings ─────────────────────────────────────────────────────

async function embedQuery(text: string): Promise<number[] | null> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) return null

  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'voyage-3', input: [text], input_type: 'query' }),
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.data?.[0]?.embedding ?? null
}

// ─── Vector retrieval ─────────────────────────────────────────────────────────

async function retrieveChunks(
  embedding: number[],
  contractIds: string[],
  userAccessToken: string,
  limit = 5,
): Promise<Array<{ id: string; document_id: string | null; content: string; page_start: number | null }>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_document_chunks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${userAccessToken}`,
    },
    body: JSON.stringify({
      query_embedding: `[${embedding.join(',')}]`,
      contract_ids: contractIds,
      match_count: limit,
    }),
  })

  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// ─── FONASA: lookup exacto por código + búsqueda por nombre ─────────────────────

function extractFonasaCode(message: string): string | null {
  // Formato agrupado "01 01 001" / "01-01-001" / "01.01.001"
  const grouped = message.match(/\b(\d{2})[\s.\-](\d{2})[\s.\-](\d{3})\b/)
  if (grouped) return grouped[1] + grouped[2] + grouped[3]
  // 7 dígitos seguidos, solo si el mensaje habla de FONASA/código/prestación
  if (/fonasa|c[oó]digo|prestaci[oó]n|arancel/i.test(message)) {
    const plain = message.match(/\b(\d{7})\b/)
    if (plain) return plain[1]
  }
  return null
}

async function answerFromFonasa(message: string): Promise<SqlAnswer> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const headers = { apikey: key, Authorization: `Bearer ${key}` }

  const fmt = (n: number | null) => (n == null ? '—' : `$${Number(n).toLocaleString('es-CL')}`)
  type Row = { codigo: string; denominacion: string; n1_total: number | null; n1_benef: number | null; n2_benef: number | null; n3_benef: number | null }

  const code = extractFonasaCode(message)
  if (code) {
    const res = await fetch(`${supabaseUrl}/rest/v1/fonasa_arancel?codigo_norm=eq.${code}&limit=1`, { headers })
    if (res.ok) {
      const rows: Row[] = await res.json()
      if (rows.length) {
        const r = rows[0]
        const content =
          `**Código FONASA ${r.codigo} — ${r.denominacion}**\n\n` +
          `Bonificación FONASA (Modalidad Libre Elección):\n` +
          `- Nivel 1: ${fmt(r.n1_benef)}${r.n1_total != null ? ` (valor total ${fmt(r.n1_total)})` : ''}\n` +
          (r.n2_benef != null ? `- Nivel 2: ${fmt(r.n2_benef)}\n` : '') +
          (r.n3_benef != null ? `- Nivel 3: ${fmt(r.n3_benef)}\n` : '') +
          `\nTu copago aproximado es el valor total menos la bonificación FONASA, según el nivel del prestador.`
        return { answered: true, content }
      }
    }
  }

  // Búsqueda por nombre cuando se menciona FONASA pero no hay código
  if (/fonasa/i.test(message)) {
    const q = message.replace(/[^\p{L}\s]/gu, ' ').trim()
    const res = await fetch(
      `${supabaseUrl}/rest/v1/fonasa_arancel?denominacion=fts(spanish).${encodeURIComponent(q)}&select=codigo,denominacion,n1_benef,n2_benef,n3_benef&limit=5`,
      { headers },
    )
    if (res.ok) {
      const rows: Row[] = await res.json()
      if (rows.length) {
        const lines = rows.map(r => `| ${r.codigo} | ${r.denominacion} | ${fmt(r.n1_benef)} |`).join('\n')
        const content =
          `Prestaciones FONASA relacionadas (bonificación Nivel 1):\n\n` +
          `| Código | Prestación | Bonif. N1 |\n|---|---|---|\n${lines}\n\n` +
          `Dime el código exacto si quieres el detalle por nivel.`
        return { answered: true, content }
      }
    }
  }
  return { answered: false }
}

// ─── Conocimiento normativo (RAG global: GES, CAE, leyes, etc.) ──────────────────

async function retrieveKnowledge(
  embedding: number[],
  userAccessToken: string,
  limit = 4,
): Promise<Array<{ title: string | null; content: string }>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_knowledge_chunks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${userAccessToken || anon}` },
    body: JSON.stringify({ query_embedding: `[${embedding.join(',')}]`, match_count: limit }),
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// ─── Signed URL generation ────────────────────────────────────────────────────

async function getSignedUrls(
  documentIds: string[],
): Promise<Record<string, string>> {
  if (documentIds.length === 0) return {}

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Fetch storage_path for each document_id
  const ids = documentIds.join(',')
  const res = await fetch(
    `${supabaseUrl}/rest/v1/contract_documents?id=in.(${ids})&select=id,storage_path`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  )
  if (!res.ok) return {}
  const docs: Array<{ id: string; storage_path: string }> = await res.json()

  // Generate signed URLs (1 hour expiry)
  const signedUrls: Record<string, string> = {}
  await Promise.all(
    docs.map(async (doc) => {
      const signRes = await fetch(
        `${supabaseUrl}/storage/v1/object/sign/contracts/${doc.storage_path}`,
        {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expiresIn: 3600 }),
        },
      )
      if (!signRes.ok) return
      const signData = await signRes.json()
      const signedUrl = signData.signedURL
        ? `${supabaseUrl}/storage/v1${signData.signedURL}`
        : signData.signedUrl ?? null
      if (signedUrl) signedUrls[doc.id] = signedUrl
    }),
  )
  return signedUrls
}

// ─── Claude RAG answer ────────────────────────────────────────────────────────

async function askClaude(
  question: string,
  chunks: Array<{ content: string; page_start: number | null }>,
  history: Array<{ role: string; content: string }>,
  noContractsSelected: boolean,
  selectedContractNames: string[],
  knowledgeChunks: Array<{ title: string | null; content: string }> = [],
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      content: 'El asistente IA no está configurado aún. Agrega ANTHROPIC_API_KEY al entorno.',
      inputTokens: 0,
      outputTokens: 0,
    }
  }

  // "Extracto" en vez de "Fragmento" — más entendible (obs. #23)
  const context = chunks
    .map((c, i) => `[Extracto ${i + 1}${c.page_start ? ` — pág. ${c.page_start}` : ''}]\n${c.content}`)
    .join('\n\n---\n\n')

  // When no contracts are selected, use Haiku for a general answer (much cheaper)
  const model = noContractsSelected ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6'
  // Tokens más altos para evitar respuestas truncadas (obs. #18)
  const maxTokens = noContractsSelected ? 1024 : 2048

  // Contexto explícito de la selección actual para que el chat se adapte al
  // cambiar de contrato y no responda sobre uno anterior (obs. #21)
  const activeContext = selectedContractNames.length > 0
    ? `\n\nCONTRATO(S) SELECCIONADO(S) AHORA: ${selectedContractNames.join(', ')}. Responde SOLO sobre estos. Si el historial menciona otro contrato distinto al seleccionado, ignóralo y enfócate en el seleccionado actual.`
    : ''

  const systemPrompt = noContractsSelected
    ? `Eres el asistente de ContractIA, especializado en contratos de salud chilenos (isapres, seguros complementarios). Responde preguntas generales sobre salud en Chile de forma clara y en español. Si se incluye "Información normativa", úsala como fuente (GES, CAE, Ley Ricarte Soto, etc.). Si la pregunta menciona un código FONASA, interprétalo como código de prestación. Recomienda al usuario seleccionar un contrato para obtener respuestas específicas sobre sus coberturas.`
    : `Eres el asistente de ContractIA, especializado en contratos de salud chilenos (isapres, seguros complementarios).

Tu trabajo es responder preguntas del usuario sobre sus contratos de salud de forma clara y en lenguaje simple.

REGLAS:
- Responde SIEMPRE basándote en los extractos del contrato proporcionados
- Si la respuesta no está en los extractos, dilo explícitamente: "Esta información no aparece en los extractos disponibles del contrato"
- NUNCA inventes datos, montos, fechas o coberturas
- Cita siempre el extracto que respalda tu respuesta usando [Extracto N]
- Si el usuario menciona un código FONASA (números de prestación), interprétalo como código de prestación y, si está en los extractos, relaciónalo con la cobertura correspondiente
- Si se incluye "Información normativa de salud", úsala para contexto general (GES, CAE, leyes), pero distingue siempre entre lo que dice el contrato del usuario y la norma general
- Cuando muestres comparaciones o varios valores, usa tablas Markdown bien formadas (con encabezados y separadores) para que se lean ordenadas
- Usa lenguaje simple, sin jerga legal
- Si la pregunta requiere información externa (tarifarios, red de prestadores), indícalo claramente
- Responde en español${activeContext}`

  const knowledgeContext = knowledgeChunks.length
    ? knowledgeChunks.map((k, i) => `[Norma ${i + 1}${k.title ? ` — ${k.title}` : ''}]\n${k.content}`).join('\n\n---\n\n')
    : ''

  const parts: string[] = []
  if (context) parts.push(`Extractos relevantes del contrato:\n\n${context}`)
  if (knowledgeContext) parts.push(`Información normativa de salud en Chile (referencia general, no específica del contrato):\n\n${knowledgeContext}`)
  parts.push(`Pregunta: ${question}`)
  const userContent = parts.join('\n\n---\n\n')

  const messages = [
    ...history.slice(-6).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userContent },
  ]

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt, messages }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Claude error:', err)
    return { content: 'Error al consultar el asistente. Intenta nuevamente.', inputTokens: 0, outputTokens: 0 }
  }

  const data = await res.json()
  let content = data.content?.[0]?.text ?? 'Sin respuesta'
  // Avisar si la respuesta se cortó por límite de tokens (obs. #18)
  if (data.stop_reason === 'max_tokens') {
    content += '\n\n_(La respuesta es extensa y se cortó. Pídeme que continúe o haz una pregunta más específica.)_'
  }
  return {
    content,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const userAccessToken = session?.access_token ?? ''

  const body = await request.json()
  const { message, threadId, contractIds } = body as {
    message: string
    threadId?: string
    contractIds?: string[]
  }

  if (!message?.trim()) return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })

  // Create thread if needed
  let currentThreadId = threadId
  if (!currentThreadId) {
    const { data: thread, error } = await supabase
      .from('chat_threads')
      .insert({ user_id: user.id, title: message.slice(0, 60), contract_ids: contractIds ?? [] })
      .select('id')
      .single()
    if (error || !thread) return NextResponse.json({ error: 'Error al crear conversación' }, { status: 500 })
    currentThreadId = thread.id
  }

  // Load recent history for context
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('thread_id', currentThreadId)
    .order('created_at', { ascending: false })
    .limit(6)
  const recentHistory = (history ?? []).reverse()

  // Save user message
  await supabase.from('chat_messages').insert({
    thread_id: currentThreadId,
    user_id: user.id,
    role: 'user',
    content: message,
  })

  // ── Router: try SQL first, fall back to RAG ──────────────────────────────
  let assistantContent = ''
  let inputTokens = 0
  let outputTokens = 0
  let chunks: Array<{ id: string; document_id: string | null; content: string; page_start: number | null }> = []
  let answerSource: 'sql' | 'rag' | 'no_context' = 'no_context'

  const hasContracts = contractIds && contractIds.length > 0

  // Nombres de los contratos seleccionados — para anclar el contexto del chat (obs. #21)
  let selectedContractNames: string[] = []
  if (hasContracts) {
    const { data: selectedContracts } = await supabase
      .from('contracts')
      .select('contract_display_name')
      .in('id', contractIds!)
    selectedContractNames = (selectedContracts ?? []).map(c => c.contract_display_name).filter(Boolean)
  }

  // Atajo FONASA: código exacto o búsqueda por nombre (no usa tokens de Claude)
  if (!assistantContent && extractFonasaCode(message) !== null) {
    const fonasa = await answerFromFonasa(message)
    if (fonasa.answered) {
      assistantContent = fonasa.content
      answerSource = 'sql'
    }
  }

  if (hasContracts && !assistantContent && looksLikeSqlQuestion(message)) {
    // Try to answer from structured DB fields first (cheap, fast)
    const sqlResult = await answerFromSQL(message, contractIds!)
    if (sqlResult.answered) {
      assistantContent = sqlResult.content
      answerSource = 'sql'
    }
  }

  let knowledgeChunks: Array<{ title: string | null; content: string }> = []

  if (!assistantContent) {
    // Embedding único para chunks del contrato y/o base de conocimiento
    const embedding = await embedQuery(message)
    if (hasContracts && embedding) {
      chunks = await retrieveChunks(embedding, contractIds!, userAccessToken)
    }
    if (embedding) {
      knowledgeChunks = await retrieveKnowledge(embedding, userAccessToken)
    }

    // Si hay contrato seleccionado pero no hay nada de contexto (contrato aún
    // procesándose) y tampoco conocimiento normativo, evita gastar tokens.
    if (hasContracts && chunks.length === 0 && knowledgeChunks.length === 0) {
      assistantContent = 'El contrato seleccionado aún no tiene extractos indexados. Es posible que el procesamiento todavía esté en curso. Intenta nuevamente en unos minutos o verifica que el contrato esté en estado **listo** desde la sección Contratos.'
      answerSource = 'no_context'
    }

    if (!assistantContent) {
      const ragResult = await askClaude(message, chunks, recentHistory, !hasContracts, selectedContractNames, knowledgeChunks)
      assistantContent = ragResult.content
      inputTokens = ragResult.inputTokens
      outputTokens = ragResult.outputTokens
      answerSource = hasContracts ? 'rag' : 'no_context'

      // Inject signed PDF links into [Extracto N] references
      if (chunks.length > 0) {
        const uniqueDocIds = [...new Set(chunks.map((c) => c.document_id).filter(Boolean) as string[])]
        const signedUrls = await getSignedUrls(uniqueDocIds)
        assistantContent = assistantContent.replace(
          /\[Extracto (\d+)([^\]]*)\]/g,
          (match, numStr, rest) => {
            const idx = parseInt(numStr, 10) - 1
            const docId = chunks[idx]?.document_id
            const url = docId ? signedUrls[docId] : null
            return url ? `[Extracto ${numStr}${rest}](${url})` : match
          },
        )
        // Compatibilidad: si el modelo aún usó "Fragmento", también enlazar
        assistantContent = assistantContent.replace(
          /\[Fragmento (\d+)([^\]]*)\]/g,
          (match, numStr, rest) => {
            const idx = parseInt(numStr, 10) - 1
            const docId = chunks[idx]?.document_id
            const url = docId ? signedUrls[docId] : null
            return url ? `[Fragmento ${numStr}${rest}](${url})` : match
          },
        )
      }
    }
  }

  // Save assistant message
  const { data: assistantMsg } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: currentThreadId,
      user_id: user.id,
      role: 'assistant',
      content: assistantContent,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      evidence_snippet_ids: chunks.map((c) => c.id).filter(Boolean),
      context_snapshot: { contract_ids: contractIds ?? [], contract_names: selectedContractNames, answer_source: answerSource },
    })
    .select('id')
    .single()

  // Update thread timestamp
  await supabase
    .from('chat_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', currentThreadId)

  // Log event
  await supabase.from('events').insert({
    user_id: user.id,
    event_type: 'chat_asked',
    payload: {
      thread_id: currentThreadId,
      contract_ids: contractIds,
      chunks_used: chunks.length,
      knowledge_used: knowledgeChunks.length,
      answer_source: answerSource,
    },
  })

  return NextResponse.json({
    threadId: currentThreadId,
    messageId: assistantMsg?.id,
    content: assistantContent,
    chunksUsed: chunks.length,
    answerSource,
  })
}
