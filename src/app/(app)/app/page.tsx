import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/supabase/server'
import { formatCurrency, categoryLabel, sumByCurrency, sanitizeAlerts } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'
import { AlertsPanel } from '@/components/AlertsPanel'
import { DollarSign, FileText, Bell, Shield, ArrowRight, Upload, Layers, MessageCircle } from 'lucide-react'
import { Mascot } from '@/components/Mascot'

// Acentos por categoría con la paleta de marca — obs. #12
const CATEGORY_ACCENT: Record<string, string> = {
  isapre: 'bg-indigo',
  seguro_complementario: 'bg-violet',
  seguro_catastrofico: 'bg-gold',
  finanzas: 'bg-violet-soft',
  otro: 'bg-ink-faint',
}

export default async function DashboardPage() {
  const { user, profile, supabase } = await getSession()
  if (!user) redirect('/login')

  const [
    { data: contracts },
    { data: alertsRaw },
    { data: benefits },
  ] = await Promise.all([
    supabase.from('contracts').select('id, contract_display_name, status, provider_name, category, monthly_cost, monthly_cost_currency').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('alerts').select('*').eq('user_id', user.id).eq('status', 'open').order('created_at', { ascending: false }).limit(8),
    supabase.from('benefits').select('id').eq('user_id', user.id),
  ])

  const alerts = sanitizeAlerts(alertsRaw).slice(0, 5)
  const activeContracts = contracts?.filter(c => c.status === 'ready' || c.status === 'needs_review') ?? []
  // Totales por moneda — no mezclar UF y CLP (obs. #16)
  const costByCurrency = sumByCurrency(activeContracts)
  const recentContracts = contracts?.slice(0, 3) ?? []

  // Conteo por categoría (obs. #11)
  const categoryCounts: Record<string, number> = {}
  for (const c of activeContracts) {
    const cat = c.category ?? 'otro'
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
  }
  const categoryBreakdown = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Usuario'

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-indigo p-6 text-white sm:p-8">
        <div aria-hidden className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-violet/60 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-lavender first-letter:uppercase">
              {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Hola, {firstName}</h1>
            <p className="mt-1 font-display text-base font-medium text-lavender">
              Pregunta. Entiende. <span className="text-gold">Decide.</span>
            </p>
            <Link
              href="/app/chat"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo transition-colors hover:bg-lavender focus-visible:outline-white"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Pregúntale a Gotu
            </Link>
          </div>
          <Mascot height={150} className="-mb-10 hidden w-24 flex-shrink-0 drop-shadow-xl sm:block sm:-mb-14 sm:w-28" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: costByCurrency.length > 1 ? 'Costo mensual (por moneda)' : 'Costo mensual total',
            value: costByCurrency.length === 0
              ? '—'
              : costByCurrency.map(c => formatCurrency(c.total, c.currency)).join(' + '),
            icon: DollarSign,
            color: 'blue',
          },
          {
            label: 'Contratos activos',
            value: String(activeContracts.length),
            icon: FileText,
            color: 'green',
          },
          {
            label: 'Alertas abiertas',
            value: String(alerts?.length ?? 0),
            icon: Bell,
            color: alerts?.length ? 'amber' : 'gray',
          },
          {
            label: 'Beneficios disponibles',
            value: String(benefits?.length ?? 0),
            icon: Shield,
            color: 'purple',
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-line p-4">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg mb-3 ${
              stat.color === 'blue' ? 'bg-lavender' :
              stat.color === 'green' ? 'bg-green-50' :
              stat.color === 'amber' ? 'bg-amber-50' :
              stat.color === 'purple' ? 'bg-gold-soft' : 'bg-surface'
            }`}>
              <stat.icon className={`h-4 w-4 ${
                stat.color === 'blue' ? 'text-violet' :
                stat.color === 'green' ? 'text-green-600' :
                stat.color === 'amber' ? 'text-amber-600' :
                stat.color === 'purple' ? 'text-gold-ink' : 'text-ink-faint'
              }`} />
            </div>
            <p className="font-display text-2xl font-semibold text-indigo break-words">{stat.value}</p>
            <p className="text-xs text-ink-muted mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Por categoría (obs. #11 + #12) */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-line p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-violet" />
            <h2 className="font-semibold text-ink">Contratos por categoría</h2>
          </div>
          {/* Barra de distribución */}
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-lavender mb-4">
            {categoryBreakdown.map(([cat, count]) => (
              <div
                key={cat}
                className={CATEGORY_ACCENT[cat] ?? CATEGORY_ACCENT.otro}
                style={{ width: `${(count / activeContracts.length) * 100}%` }}
                title={`${categoryLabel(cat)}: ${count}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categoryBreakdown.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${CATEGORY_ACCENT[cat] ?? CATEGORY_ACCENT.otro}`} />
                <span className="text-sm text-ink-soft">{categoryLabel(cat)}</span>
                <span className="text-sm font-semibold text-ink ml-auto">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-ink">Alertas</h2>
          </div>
          {alerts && alerts.length > 0 ? (
            <AlertsPanel alerts={alerts.map(a => ({ ...a, contracts: null }))} />
          ) : (
            <div className="bg-white rounded-2xl border border-line p-8 text-center">
              <Bell className="h-8 w-8 text-violet-soft mx-auto mb-2" aria-hidden />
              <p className="text-sm font-medium text-ink-soft">Todo tranquilo por acá</p>
              <p className="text-xs text-ink-muted mt-0.5">No tienes alertas pendientes.</p>
            </div>
          )}
        </div>

        {/* Recent contracts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-ink">Contratos recientes</h2>
            <Link href="/app/contracts" className="text-sm font-medium text-violet underline-offset-2 hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentContracts.length > 0 ? (
            <div className="space-y-2">
              {recentContracts.map((contract) => (
                <Link
                  key={contract.id}
                  href={`/app/contracts/${contract.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-line p-4 hover:border-violet/50 hover:bg-lavender/30 transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink truncate">{contract.contract_display_name}</p>
                      <span className="flex-shrink-0 text-[10px] text-violet bg-lavender border border-lavender-deep rounded-full px-2 py-0.5">
                        {categoryLabel(contract.category ?? 'otro')}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">{contract.provider_name ?? 'Proveedor no detectado'}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <StatusBadge status={contract.status} />
                    <ArrowRight className="h-4 w-4 text-lavender-deep group-hover:text-violet transition-colors" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-line-strong p-8 text-center">
              <Mascot height={96} className="mx-auto mb-3 w-16" />
              <p className="text-sm font-semibold text-indigo mb-1">Aún no subes ningún contrato</p>
              <p className="text-xs text-ink-muted mb-4">Sube el PDF de tu isapre o seguro y te lo explico en simple.</p>
              <Link
                href="/app/contracts/new"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo px-4 py-2 text-sm font-medium text-white hover:bg-violet transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                Subir contrato
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
