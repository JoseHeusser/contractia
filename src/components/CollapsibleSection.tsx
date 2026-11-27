'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  /** Etiqueta breve a la derecha del título (ej: "5 coberturas") */
  badge?: string
  defaultOpen?: boolean
  children: React.ReactNode
}

/**
 * Sección colapsable tipo acordeón para reducir la densidad de información
 * en el detalle del contrato (obs. #3 — "tanta información para leer").
 */
export function CollapsibleSection({ title, badge, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="bg-white rounded-xl border border-line overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-surface/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {badge && (
            <span className="text-xs text-ink-muted bg-lavender rounded-full px-2 py-0.5">{badge}</span>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 text-ink-faint transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-6 pb-6 pt-0">{children}</div>}
    </section>
  )
}
