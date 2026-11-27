'use client'

import { useState } from 'react'
import { Shield, Clock, Info, AlertCircle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'
import type { Json } from '@/types/database'

export type BenefitWithContract = Tables<'benefits'> & {
  contracts?: { contract_display_name: string; provider_name?: string | null; category?: string | null } | null
}
type Benefit = BenefitWithContract

interface BenefitsListProps {
  benefits: Benefit[]
  /** Muestra a qué contrato pertenece cada beneficio (obs. #5, #19, #22) */
  showContract?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  hospitalizacion: 'Hospitalización',
  ambulatorio: 'Ambulatorio',
  dental: 'Dental',
  mental: 'Salud Mental',
  farmacia: 'Farmacia',
  maternidad: 'Maternidad',
  vision: 'Visión',
  otro: 'Otro',
}

const CATEGORY_COLORS: Record<string, string> = {
  hospitalizacion: 'bg-lavender text-violet border-lavender-deep',
  ambulatorio: 'bg-green-50 text-green-700 border-green-100',
  dental: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  mental: 'bg-purple-50 text-purple-700 border-purple-100',
  farmacia: 'bg-orange-50 text-orange-700 border-orange-100',
  maternidad: 'bg-pink-50 text-pink-700 border-pink-100',
  vision: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  otro: 'bg-surface text-ink-soft border-line',
}

function formatCopay(copay: Json): string {
  if (!copay || typeof copay !== 'object' || Array.isArray(copay)) return '—'
  const c = copay as Record<string, Json>
  if (c.type === 'none') return 'Sin copago'
  if (c.type === 'percentage' && c.percentage) return `${c.percentage}%`
  if (c.type === 'fixed' && c.amount) return `$${c.amount}`
  return '—'
}

function formatWaiting(waiting: Json): string | null {
  if (!waiting || typeof waiting !== 'object' || Array.isArray(waiting)) return null
  const w = waiting as Record<string, Json>
  if (w.days && typeof w.days === 'number') return `${w.days} días de carencia`
  return null
}

export function BenefitsList({ benefits, showContract = false }: BenefitsListProps) {
  const categories = ['todos', ...Array.from(new Set(benefits.map(b => b.category ?? 'otro')))]
  const [activeCategory, setActiveCategory] = useState('todos')

  const filtered = activeCategory === 'todos'
    ? benefits
    : benefits.filter(b => (b.category ?? 'otro') === activeCategory)

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              activeCategory === cat
                ? 'bg-indigo border-indigo text-white'
                : 'bg-white border-line-strong text-ink-muted hover:border-violet/50 hover:text-violet'
            )}
          >
            {cat === 'todos' ? 'Todos' : (CATEGORY_LABELS[cat] ?? cat)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-ink-faint">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sin beneficios en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((benefit) => {
            const waitingText = formatWaiting(benefit.waiting_period)
            return (
              <div key={benefit.id} className="bg-white rounded-xl border border-line p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-ink text-sm leading-tight">{benefit.name}</h4>
                  {benefit.category && (
                    <span className={cn(
                      'flex-shrink-0 text-xs rounded-full border px-2 py-0.5',
                      CATEGORY_COLORS[benefit.category] ?? CATEGORY_COLORS.otro
                    )}>
                      {CATEGORY_LABELS[benefit.category] ?? benefit.category}
                    </span>
                  )}
                </div>

                {showContract && benefit.contracts && (
                  <div className="inline-flex items-center gap-1.5 mb-2 rounded-md bg-lavender border border-lavender-deep px-2 py-0.5">
                    <FileText className="h-3 w-3 text-violet" />
                    <span className="text-xs font-medium text-violet">{benefit.contracts.contract_display_name}</span>
                  </div>
                )}

                {benefit.includes_simple && (
                  <p className="text-xs text-ink-muted mb-3">{benefit.includes_simple}</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {benefit.copay && (
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <Info className="h-3 w-3" />
                      <span>Copago: <span className="font-medium text-ink-soft">{formatCopay(benefit.copay)}</span></span>
                    </div>
                  )}
                  {waitingText && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600">
                      <Clock className="h-3 w-3" />
                      <span>{waitingText}</span>
                    </div>
                  )}
                </div>

                {benefit.restrictions && (
                  <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-2">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-snug">
                      <span className="font-semibold">Restricción:</span> {benefit.restrictions}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
