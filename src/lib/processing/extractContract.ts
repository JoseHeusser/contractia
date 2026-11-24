import 'server-only'
import { z } from 'zod'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { anthropic, EXTRACTION_MODEL } from './anthropic'
import { ProcessingError, type PageText } from './extractText'

// ─── Schema de salida ────────────────────────────────────────────────────────
// Los nombres de campo calzan con las columnas de `contracts`, `benefits` y
// `alerts`; los field_key de evidencia calzan con los que lee la UI
// (src/app/(app)/app/contracts/[id]/page.tsx).

const str = z.string().nullable()
const num = z.number().nullable()
const bool = z.boolean().nullable()
const date = z.string().nullable().describe('Fecha ISO YYYY-MM-DD, o null')
const currency = z.enum(['CLP', 'UF', 'USD']).nullable()

export const EVIDENCE_FIELD_KEYS = [
  'provider_name',
  'policyholder_name',
  'monthly_cost',
  'effective_date',
  'end_date',
  'renewal_date',
  'copay',
  'deductible',
  'price_adjustment',
  'cancellation',
  'reimbursement',
  'privacy',
  'exclusions',
  'waiting_periods',
] as const

const SourceRef = z.object({
  document: z.number().int().describe('Número del <documento> (empieza en 1)'),
  page: z.number().int().nullable().describe('Número de [Página N] donde aparece la cita'),
  quote: z
    .string()
    .describe('Cita LITERAL y breve (1-3 oraciones) copiada del texto del documento, sin parafrasear'),
})

const BENEFIT_CATEGORIES = [
  'hospitalizacion',
  'ambulatorio',
  'dental',
  'mental',
  'farmacia',
  'maternidad',
  'vision',
  'otro',
] as const

const ALERT_TYPES = [
  'price_increase',
  'renewal',
  'waiting_period',
  'exclusion',
  'deadline',
  'missing_document',
  'coverage_gap',
  'other',
] as const

export const ContractExtraction = z.object({
  provider_name: str.describe('Isapre, aseguradora o compañía que emite el plan/póliza'),
  policyholder_name: str.describe('Nombre del titular / afiliado / asegurado'),
  ai_summary_simple: z
    .string()
    .describe('Resumen de 3-5 oraciones en lenguaje simple: qué cubre, cuánto cuesta y lo más importante a tener en cuenta'),
  key_points: z.array(z.string()).describe('3-8 puntos clave, una oración cada uno'),

  monthly_cost: num.describe('Costo/prima mensual total como número, sin símbolos'),
  monthly_cost_currency: currency,
  payment_method: str,
  late_payment_terms: str.describe('Qué pasa si se atrasa el pago'),

  copay_type: z.enum(['percentage', 'fixed', 'mixed', 'none']).nullable(),
  copay_percentage: num.describe('Copago general en % que paga el afiliado (100 - % de bonificación), si es único'),
  copay_amount: num,
  copay_currency: currency,
  copay_summary: str.describe('Copago/bonificación explicado en 1-2 oraciones simples'),

  deductible_type: z.enum(['annual', 'per_event', 'none', 'other']).nullable(),
  deductible_amount: num,
  deductible_currency: currency,
  deductible_summary: str,

  effective_date: date.describe('Inicio de vigencia'),
  end_date: date.describe('Término de vigencia'),
  renewal_date: date.describe('Próxima renovación / adecuación anual'),
  auto_renew: bool,

  price_adjustment_clause: bool.describe('¿El contrato permite reajustar el precio (p. ej. adecuación anual, cambio de precio base, tabla de factores)?'),
  explicit_increase: bool.describe('¿El documento informa un alza concreta ya decidida?'),
  explicit_increase_rate: num.describe('Porcentaje del alza informada'),
  explicit_increase_date: date,
  explicit_increase_evidence: str,

  cancellation_notice_days: z.number().int().nullable(),
  cancellation_summary: str.describe('Cómo y con cuánta anticipación se puede terminar el contrato'),
  reimbursement_summary: str.describe('Cómo se pide un reembolso o se reclama una prestación'),
  privacy_summary: str.describe('Qué dice sobre uso de datos personales / de salud'),

  claims_phone: str,
  claims_email: str,
  claims_url: str,

  exclusions: z.array(z.object({ description: z.string() })),
  waiting_periods: z.array(
    z.object({ description: z.string(), days: z.number().int().nullable() }),
  ),
  missing_references: z
    .array(z.string())
    .describe('Otros documentos que el contrato menciona como parte integrante y NO vienen adjuntos (p. ej. "Plan de salud complementario", "Arancel del prestador")'),
  needs_review_reasons: z
    .array(z.string())
    .describe('Motivos concretos por los que un humano debería revisar la extracción (texto ilegible, datos contradictorios, documento que no es un contrato de salud). Vacío si todo está claro.'),

  evidence: z
    .array(SourceRef.extend({ field_key: z.enum(EVIDENCE_FIELD_KEYS) }))
    .describe('Una cita de respaldo por cada dato extraído que aparezca en el documento'),

  benefits: z
    .array(
      z.object({
        name: z.string().describe('Nombre de la prestación o cobertura'),
        category: z.enum(BENEFIT_CATEGORIES),
        includes_simple: str.describe('Qué incluye, en lenguaje simple'),
        copay: z.object({
          type: z.enum(['percentage', 'fixed', 'none', 'unknown']),
          percentage: num.describe('% que paga el afiliado (100 - bonificación)'),
          amount: num,
          currency: currency,
        }),
        coverage_percentage: num.describe('% de bonificación que paga la isapre/aseguradora'),
        deductible: str,
        limits: str.describe('Topes por evento, anuales, en UF o veces arancel'),
        waiting_period_days: z.number().int().nullable(),
        network_rules: str.describe('Prestadores preferentes / red cerrada / libre elección'),
        requirements: str,
        restrictions: str,
        source: SourceRef.nullable(),
      }),
    )
    .describe('Coberturas individuales del plan, de las más importantes a las menos'),

  alerts: z
    .array(
      z.object({
        type: z.enum(ALERT_TYPES),
        severity: z.enum(['high', 'med', 'low']),
        title: z.string().describe('Título corto, máx. 8 palabras'),
        message: z.string().describe('1-2 oraciones accionables para el afiliado'),
        due_date: date,
        source: SourceRef.nullable(),
      }),
    )
    .describe('Lo que el afiliado debería saber o hacer: alzas, fechas límite, carencias vigentes, exclusiones relevantes, documentos faltantes'),
})

export type ContractExtraction = z.infer<typeof ContractExtraction>

export type DocumentForExtraction = {
  name: string
  pages: PageText[]
}

const SYSTEM_PROMPT = `Eres un analista experto en contratos de salud chilenos: planes de isapre (contrato de salud previsional, plan complementario, Garantías Explícitas en Salud, Cobertura Adicional para Enfermedades Catastróficas) y seguros complementarios o catastróficos.

Tu trabajo es leer los documentos del usuario y extraer datos estructurados para explicárselos en lenguaje simple.

Reglas:
- Usa SOLO lo que dice el documento. Si un dato no aparece, déjalo en null (o lista vacía). Nunca inventes montos, fechas ni porcentajes.
- Montos: número sin separadores de miles ni símbolos. Indica la moneda (CLP, UF o USD).
- En planes de isapre la cobertura se expresa como "bonificación" (% que paga la isapre). El copago es lo que paga el afiliado: copago % = 100 - bonificación %.
- Fechas en formato YYYY-MM-DD. Si solo hay mes y año, usa el día 01.
- Cada cita (quote) debe ser texto copiado literalmente del documento indicado, con el número de página del marcador [Página N] bajo el que aparece.
- Escribe resúmenes, mensajes y títulos en español de Chile, claros y sin jerga legal.
- Alertas: prioriza lo que puede costarle dinero o una cobertura al afiliado. Severidad "high" para alzas de precio o fechas límite cercanas, "med" para carencias y exclusiones importantes, "low" para información útil.`

/** Llama a Claude con el texto de todos los documentos del contrato. */
export async function extractContract(params: {
  contractName: string
  category: string
  documents: DocumentForExtraction[]
  today: string
}): Promise<ContractExtraction> {
  const docsXml = params.documents
    .map((doc, i) => {
      const body = doc.pages.map((p) => `[Página ${p.page}]\n${p.text}`).join('\n\n')
      return `<documento indice="${i + 1}" nombre="${escapeAttr(doc.name)}">\n${body}\n</documento>`
    })
    .join('\n\n')

  const stream = anthropic.beta.messages.stream({
    model: EXTRACTION_MODEL,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: 'high',
      format: betaZodOutputFormat(ContractExtraction),
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content:
          `${docsXml}\n\n` +
          `Contrato: "${params.contractName}" (categoría declarada por el usuario: ${params.category}).\n` +
          `Fecha de hoy: ${params.today}.\n\n` +
          'Extrae los datos del contrato según el esquema.',
      },
    ],
  })

  const message = await stream.finalMessage()

  if (message.stop_reason === 'refusal') {
    throw new ProcessingError('extraction_refused', 'No fue posible analizar este documento.')
  }
  if (message.stop_reason === 'max_tokens') {
    throw new ProcessingError(
      'extraction_truncated',
      'El contrato es demasiado extenso para analizarlo completo. Intenta subir solo las secciones principales.',
    )
  }
  if (!message.parsed_output) {
    throw new ProcessingError('extraction_invalid', 'El análisis del contrato no devolvió un resultado válido.')
  }
  return message.parsed_output
}

function escapeAttr(s: string): string {
  return s.replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c]!)
}
