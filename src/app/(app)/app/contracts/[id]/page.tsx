import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { StatusBadge } from '@/components/StatusBadge'
import { ProcessingStatus } from '@/components/ProcessingStatus'
import { BenefitsList } from '@/components/BenefitsList'
import { EvidencePopover } from '@/components/EvidencePopover'
import { formatCurrency, formatDate, categoryLabel } from '@/lib/utils'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import {
  MessageCircle, AlertTriangle, TrendingUp, Phone, Mail, Globe,
  Calendar, DollarSign, User, RefreshCw, ExternalLink, Info
} from 'lucide-react'

const PROCESSING_STATUSES = ['uploaded', 'ocr_processing', 'ocr_done', 'extracting']

type Contract = Tables<'contracts'>
type EvidenceSnippet = Tables<'evidence_snippets'>
type Benefit = Tables<'benefits'>
type Alert = Tables<'alerts'>

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: contract }, { data: benefits }, { data: alerts }, { data: evidenceSnippets }] = await Promise.all([
    supabase.from('contracts').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('benefits').select('*').eq('contract_id', id).order('sort_order'),
    supabase.from('alerts').select('*').eq('contract_id', id).eq('status', 'open'),
    supabase.from('evidence_snippets').select('*').eq('contract_id', id),
  ])

  if (!contract) notFound()

  const isProcessing = PROCESSING_STATUSES.includes(contract.status)
  const isReady = contract.status === 'ready' || contract.status === 'needs_review'

  function getSnippet(fieldKey: string): EvidenceSnippet | null {
    return evidenceSnippets?.find(e => e.field_key === fieldKey) ?? null
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={contract.status} />
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-0.5">
              {categoryLabel(contract.category)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{contract.contract_display_name}</h1>
          {contract.provider_name && (
            <p className="text-gray-500 mt-0.5">{contract.provider_name}</p>
          )}
        </div>
        <Link
          href={`/app/chat?contractId=${id}`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          <MessageCircle className="h-4 w-4" />
          Consultar al asistente
        </Link>
      </div>

      {/* Processing state */}
      {isProcessing && (
        <div className="mb-8">
          <ProcessingStatus contractId={id} initialStatus={contract.status} />
        </div>
      )}

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert: Alert) => (
            <div key={alert.id} className={`flex items-start gap-3 rounded-xl border p-4 ${
              alert.severity === 'high' ? 'bg-red-50 border-red-100' :
              alert.severity === 'med' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'
            }`}>
              <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                alert.severity === 'high' ? 'text-red-500' :
                alert.severity === 'med' ? 'text-amber-500' : 'text-blue-500'
              }`} />
              <div>
                <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isReady && (
        <ContractTabs contract={contract} benefits={benefits ?? []} getSnippet={getSnippet} />
      )}
    </div>
  )
}

function ContractTabs({
  contract,
  benefits,
  getSnippet,
}: {
  contract: Contract
  benefits: Benefit[]
  getSnippet: (key: string) => EvidenceSnippet | null
}) {
  return (
    <div className="space-y-8">
      {/* Summary */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Resumen</h2>

        {contract.ai_summary_simple && (
          <p className="text-sm text-gray-700 leading-relaxed mb-5 p-4 bg-blue-50 rounded-lg border border-blue-100">
            {contract.ai_summary_simple}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Costo mensual', value: formatCurrency(contract.monthly_cost, contract.monthly_cost_currency), icon: DollarSign, fieldKey: 'monthly_cost' },
            { label: 'Inicio de vigencia', value: formatDate(contract.effective_date), icon: Calendar, fieldKey: 'effective_date' },
            { label: 'Término / Renovación', value: formatDate(contract.renewal_date ?? contract.end_date), icon: RefreshCw, fieldKey: 'renewal_date' },
            { label: 'Titular', value: contract.policyholder_name ?? '—', icon: User, fieldKey: 'policyholder_name' },
          ].map(({ label, value, icon: Icon, fieldKey }) => {
            const snippet = getSnippet(fieldKey)
            return (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  {snippet ? (
                    <EvidencePopover snippet={snippet.snippet} page={snippet.page} fieldKey={fieldKey}>
                      <span className="text-sm font-medium text-gray-900">{value}</span>
                    </EvidencePopover>
                  ) : (
                    <p className="text-sm font-medium text-gray-900">{value}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {Array.isArray(contract.missing_fields) && contract.missing_fields.length > 0 && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 p-3 flex gap-2">
            <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-800 mb-0.5">Datos no encontrados en el documento:</p>
              <p className="text-xs text-amber-700">{(contract.missing_fields as string[]).join(', ')}</p>
            </div>
          </div>
        )}

        {Array.isArray(contract.missing_references) && contract.missing_references.length > 0 && (
          <div className="mt-3 rounded-lg bg-orange-50 border border-orange-100 p-3 flex gap-2">
            <ExternalLink className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-orange-800 mb-0.5">Documentos referenciados pero no incluidos:</p>
              <p className="text-xs text-orange-700">{(contract.missing_references as string[]).join(', ')}</p>
            </div>
          </div>
        )}
      </section>

      {/* Key Points */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Puntos Clave</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Copago */}
          {(() => {
            const snippet = getSnippet('copay')
            const value = contract.copay_summary ?? '—'
            return (
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Copago</p>
                {snippet ? (
                  <EvidencePopover snippet={snippet.snippet} page={snippet.page} fieldKey="copay">
                    <span className="text-sm text-gray-700">{value}</span>
                  </EvidencePopover>
                ) : <p className="text-sm text-gray-700">{value}</p>}
              </div>
            )
          })()}

          {/* Deducible */}
          {(() => {
            const snippet = getSnippet('deductible')
            const value = contract.deductible_summary ?? '—'
            return (
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Deducible</p>
                {snippet ? (
                  <EvidencePopover snippet={snippet.snippet} page={snippet.page} fieldKey="deductible">
                    <span className="text-sm text-gray-700">{value}</span>
                  </EvidencePopover>
                ) : <p className="text-sm text-gray-700">{value}</p>}
              </div>
            )
          })()}

          {/* Reajuste */}
          {(() => {
            const snippet = getSnippet('price_adjustment')
            let displayValue = 'Sin cláusula de reajuste detectada'
            let badgeEl = null
            if (contract.explicit_increase) {
              displayValue = contract.explicit_increase_rate
                ? `Alza de ${contract.explicit_increase_rate}% el ${formatDate(contract.explicit_increase_date)}`
                : 'Alza detectada'
              badgeEl = (
                <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                  <TrendingUp className="h-3 w-3" /> Alza detectada
                </span>
              )
            } else if (contract.price_adjustment_clause) {
              displayValue = 'Cláusula de reajuste presente (sin monto explícito)'
              badgeEl = (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                  <TrendingUp className="h-3 w-3" /> Reajuste posible
                </span>
              )
            }
            return (
              <div className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs font-medium text-gray-500">Reajuste de precio</p>
                  {badgeEl}
                </div>
                {snippet ? (
                  <EvidencePopover snippet={snippet.snippet} page={snippet.page} fieldKey="price_adjustment">
                    <span className="text-sm text-gray-700">{displayValue}</span>
                  </EvidencePopover>
                ) : <p className="text-sm text-gray-700">{displayValue}</p>}
              </div>
            )
          })()}

          {/* Cancelación */}
          {(() => {
            const snippet = getSnippet('cancellation')
            const value = contract.cancellation_summary ?? '—'
            return (
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Cancelación</p>
                {snippet ? (
                  <EvidencePopover snippet={snippet.snippet} page={snippet.page} fieldKey="cancellation">
                    <span className="text-sm text-gray-700">{value}</span>
                  </EvidencePopover>
                ) : <p className="text-sm text-gray-700">{value}</p>}
              </div>
            )
          })()}

          {/* Reembolso */}
          {(() => {
            const snippet = getSnippet('reimbursement')
            const value = contract.reimbursement_summary ?? '—'
            return (
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Cómo reclamar</p>
                {snippet ? (
                  <EvidencePopover snippet={snippet.snippet} page={snippet.page} fieldKey="reimbursement">
                    <span className="text-sm text-gray-700">{value}</span>
                  </EvidencePopover>
                ) : <p className="text-sm text-gray-700">{value}</p>}
              </div>
            )
          })()}

          {/* Privacidad */}
          {(() => {
            const snippet = getSnippet('privacy')
            const value = contract.privacy_summary ?? '—'
            return (
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Privacidad</p>
                {snippet ? (
                  <EvidencePopover snippet={snippet.snippet} page={snippet.page} fieldKey="privacy">
                    <span className="text-sm text-gray-700">{value}</span>
                  </EvidencePopover>
                ) : <p className="text-sm text-gray-700">{value}</p>}
              </div>
            )
          })()}
        </div>
      </section>

      {/* Coberturas */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Coberturas</h2>
        {benefits.length > 0 ? (
          <BenefitsList benefits={benefits} />
        ) : (
          <p className="text-sm text-gray-500 text-center py-6">No se detectaron coberturas individuales en este contrato.</p>
        )}
      </section>

      {/* Legal */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Legal y Contacto</h2>
        <div className="space-y-4">
          {(contract.cancellation_summary || contract.cancellation_notice_days) && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Cancelación</p>
              <p className="text-sm text-gray-700">{contract.cancellation_summary}</p>
              {contract.cancellation_notice_days && (
                <p className="text-xs text-gray-500 mt-0.5">Aviso previo: {contract.cancellation_notice_days} días</p>
              )}
            </div>
          )}

          {(contract.claims_phone || contract.claims_email || contract.claims_url) && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Canales de reclamo / siniestro</p>
              <div className="flex flex-wrap gap-3">
                {contract.claims_phone && (
                  <a href={`tel:${contract.claims_phone}`} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                    <Phone className="h-3.5 w-3.5" /> {contract.claims_phone}
                  </a>
                )}
                {contract.claims_email && (
                  <a href={`mailto:${contract.claims_email}`} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                    <Mail className="h-3.5 w-3.5" /> {contract.claims_email}
                  </a>
                )}
                {contract.claims_url && (
                  <a href={contract.claims_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                    <Globe className="h-3.5 w-3.5" /> Portal web
                  </a>
                )}
              </div>
            </div>
          )}

          {Array.isArray(contract.exclusions) && contract.exclusions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Exclusiones</p>
              <ul className="space-y-1">
                {(contract.exclusions as Array<{ description: string }>).map((ex, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="text-gray-300 mt-0.5">•</span>
                    {ex.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
