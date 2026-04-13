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
    `${supabaseUrl}/rest/v1/contracts?id=in.(${contractIds.join(',')})&select=contract_display_name,insurer_name,plan_name,category,status,premium_monthly_clp,premium_monthly_uf,copago_percentage,deducible_uf,tope_anual_uf,reajuste_percentage,reajuste_period_months,start_date,end_date,auto_renew,raw_summary`,
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

  // Build a compact data block for Claude to answer from
  const dataBlock = contracts
    .map((c) => {
      const lines: string[] = [`**${c.contract_display_name ?? 'Contrato'}**`]
      if (c.insurer_name) lines.push(`Aseguradora/Isapre: ${c.insurer_name}`)
      if (c.plan_name) lines.push(`Plan: ${c.plan_name}`)
      if (c.premium_monthly_clp) lines.push(`Prima mensual: $${Number(c.premium_monthly_clp).toLocaleString('es-CL')} CLP`)
      if (c.premium_monthly_uf) lines.push(`Prima mensual: ${c.premium_monthly_uf} UF`)
      if (c.copago_percentage != null) lines.push(`Copago: ${c.copago_percentage}%`)
      if (c.deducible_uf != null) lines.push(`Deducible: ${c.deducible_uf} UF`)
      if (c.tope_anual_uf != null) lines.push(`Tope anual: ${c.tope_anual_uf} UF`)
      if (c.reajuste_percentage != null) lines.push(`Reajuste: ${c.reajuste_percentage}%`)
      if (c.reajuste_period_months) lines.push(`Período reajuste: ${c.reajuste_period_months} meses`)
      if (c.start_date) lines.push(`Inicio vigencia: ${c.start_date}`)
      if (c.end_date) lines.push(`Término vigencia: ${c.end_date}`)
      if (c.auto_renew != null) lines.push(`Renovación automática: ${c.auto_renew ? 'Sí' : 'No'}`)
      return lines.join('\n')
    })
    .join('\n\n')

  // Check if there's actually data to answer with (not all nulls)
  const hasData = contracts.some(
    (c) =>
      c.premium_monthly_clp ||
      c.premium_monthly_uf ||
      c.copago_percentage != null ||
      c.deducible_uf != null ||
      c.tope_anual_uf != null ||
      c.start_date ||
      c.end_date ||
      c.insurer_name ||
      c.plan_name,
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
  limit = 5,
): Promise<Array<{ id: string; content: string; page_start: number | null }>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_document_chunks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
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

// ─── Claude RAG answer ────────────────────────────────────────────────────────

async function askClaude(
  question: string,
  chunks: Array<{ content: string; page_start: number | null }>,
  history: Array<{ role: string; content: string }>,
  noContractsSelected: boolean,
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      content: 'El asistente IA no está configurado aún. Agrega ANTHROPIC_API_KEY al entorno.',
      inputTokens: 0,
      outputTokens: 0,
    }
  }

  const context = chunks
    .map((c, i) => `[Fragmento ${i + 1}${c.page_start ? ` — pág. ${c.page_start}` : ''}]\n${c.content}`)
    .join('\n\n---\n\n')

  // When no contracts are selected, use Haiku for a general answer (much cheaper)
  const model = noContractsSelected ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6'
  const maxTokens = noContractsSelected ? 512 : 1024

  const systemPrompt = noContractsSelected
    ? `Eres el asistente de ContractIA, especializado en contratos de salud chilenos (isapres, seguros complementarios). Responde preguntas generales sobre salud en Chile de forma clara y en español. Recomienda al usuario seleccionar un contrato para obtener respuestas específicas sobre sus coberturas.`
    : `Eres el asistente de ContractIA, especializado en contratos de salud chilenos (isapres, seguros complementarios).

Tu trabajo es responder preguntas del usuario sobre sus contratos de salud de forma clara y en lenguaje simple.

REGLAS:
- Responde SIEMPRE basándote en los fragmentos del contrato proporcionados
- Si la respuesta no está en los fragmentos, dilo explícitamente: "Esta información no aparece en los fragmentos disponibles del contrato"
- NUNCA inventes datos, montos, fechas o coberturas
- Cita siempre el fragmento que respalda tu respuesta usando [Fragmento N]
- Usa lenguaje simple, sin jerga legal
- Si la pregunta requiere información externa (tarifarios, red de prestadores), indícalo claramente
- Responde en español`

  const userContent = context
    ? `Fragmentos relevantes del contrato:\n\n${context}\n\n---\n\nPregunta: ${question}`
    : `Pregunta: ${question}`

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
  return {
    content: data.content?.[0]?.text ?? 'Sin respuesta',
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
  let chunks: Array<{ content: string; page_start: number | null; id: string }> = []
  let answerSource: 'sql' | 'rag' | 'no_context' = 'no_context'

  const hasContracts = contractIds && contractIds.length > 0

  if (hasContracts && looksLikeSqlQuestion(message)) {
    // Try to answer from structured DB fields first (cheap, fast)
    const sqlResult = await answerFromSQL(message, contractIds!)
    if (sqlResult.answered) {
      assistantContent = sqlResult.content
      answerSource = 'sql'
    }
  }

  if (!assistantContent) {
    // Fall back to RAG
    if (hasContracts) {
      const embedding = await embedQuery(message)
      if (embedding) {
        chunks = await retrieveChunks(embedding, contractIds!)
      }

      // If contracts are selected but no chunks exist yet, the contract is still processing
      // Don't call Claude — return a free predefined message
      if (chunks.length === 0) {
        assistantContent = 'El contrato seleccionado aún no tiene fragmentos indexados. Es posible que el procesamiento todavía esté en curso. Intenta nuevamente en unos minutos o verifica que el contrato esté en estado **listo** desde la sección Contratos.'
        answerSource = 'no_context'
      }
    }

    if (!assistantContent) {
      const ragResult = await askClaude(message, chunks, recentHistory, !hasContracts)
      assistantContent = ragResult.content
      inputTokens = ragResult.inputTokens
      outputTokens = ragResult.outputTokens
      answerSource = hasContracts ? 'rag' : 'no_context'
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
