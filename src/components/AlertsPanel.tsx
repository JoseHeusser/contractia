import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Alert {
  id: string
  type: string
  severity: string
  title: string
  message: string
  due_date: string | null
  contracts?: { contract_display_name: string } | null
}

interface AlertsPanelProps {
  alerts: Alert[]
}

const severityConfig = {
  high: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-100', badge: 'bg-red-100 text-red-700' },
  med: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', badge: 'bg-amber-100 text-amber-700' },
  low: { icon: Info, color: 'text-violet', bg: 'bg-lavender border-lavender-deep', badge: 'bg-lavender-deep text-violet' },
}

const severityLabel = { high: 'Alta', med: 'Media', low: 'Baja' }

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const cfg = severityConfig[alert.severity as keyof typeof severityConfig] ?? severityConfig.low
        return (
          <div key={alert.id} className={`rounded-xl border p-4 ${cfg.bg}`}>
            <div className="flex items-start gap-3">
              <cfg.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-medium text-ink">{alert.title}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                    {severityLabel[alert.severity as keyof typeof severityLabel] ?? alert.severity}
                  </span>
                </div>
                <p className="text-xs text-ink-muted">{alert.message}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-muted">
                  {alert.contracts && <span>{alert.contracts.contract_display_name}</span>}
                  {alert.due_date && <span>Vence: {formatDate(alert.due_date)}</span>}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
