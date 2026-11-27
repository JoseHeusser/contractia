'use client'

import { useState, useMemo, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, CheckCircle, MinusCircle, ChevronDown, ChevronUp, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Mascot } from '@/components/Mascot'
import type { Json } from '@/types/database'

interface Contract {
  id: string
  contract_display_name: string
  provider_name: string | null
  monthly_cost: number | null
  monthly_cost_currency: string | null
  category: string
}

interface Benefit {
  id: string
  contract_id: string
  name: string
  category: string | null
  includes_simple: string | null
  copay: Json | null
  deductible: Json | null
  waiting_period: Json | null
}

interface CompararClientProps {
  contracts: Contract[]
  benefits: Benefit[]
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
  ambulatorio: 'bg-green-50 text-green-700 border-green-200',
  dental: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  mental: 'bg-purple-50 text-purple-700 border-purple-200',
  farmacia: 'bg-orange-50 text-orange-700 border-orange-200',
  maternidad: 'bg-pink-50 text-pink-700 border-pink-200',
  vision: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  otro: 'bg-surface text-ink-soft border-line-strong',
}

function formatCopay(copay: Json): string {
  if (!copay || typeof copay !== 'object' || Array.isArray(copay)) return '—'
  const c = copay as Record<string, Json>
  if (c.type === 'none') return 'Sin copago'
  if (c.type === 'percentage' && c.percentage) return `${c.percentage}%`
  if (c.type === 'fixed' && c.amount) return `$${c.amount}`
  return '—'
}

export function CompararClient({ contracts, benefits }: CompararClientProps) {
  // Solo se comparan contratos de la MISMA categoría (decisión reunión, obs. #10/#C11)
  const contractsByCategory = useMemo(() => {
    const map: Record<string, Contract[]> = {}
    for (const c of contracts) {
      const cat = c.category ?? 'otro'
      ;(map[cat] ??= []).push(c)
    }
    return map
  }, [contracts])

  // Categorías que tienen al menos 2 contratos (comparables)
  const comparableCategories = useMemo(
    () => Object.keys(contractsByCategory).filter(cat => contractsByCategory[cat].length >= 2),
    [contractsByCategory]
  )

  const [activeCat, setActiveCat] = useState<string>(comparableCategories[0] ?? '')
  const catContracts = contractsByCategory[activeCat] ?? []

  const [selectedIds, setSelectedIds] = useState<string[]>(catContracts.slice(0, 2).map(c => c.id))
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Al cambiar de categoría, reiniciar la selección a los 2 primeros de esa categoría
  useEffect(() => {
    setSelectedIds((contractsByCategory[activeCat] ?? []).slice(0, 2).map(c => c.id))
  }, [activeCat, contractsByCategory])

  const selected = catContracts.filter(c => selectedIds.includes(c.id))

  function toggleContract(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleCategory(cat: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Build benefit map: category → { contractId → benefits[] }
  const categoryMap = useMemo(() => {
    const map: Record<string, Record<string, Benefit[]>> = {}
    const filteredBenefits = benefits.filter(b => selectedIds.includes(b.contract_id))

    filteredBenefits.forEach(b => {
      const cat = b.category ?? 'otro'
      if (!map[cat]) map[cat] = {}
      if (!map[cat][b.contract_id]) map[cat][b.contract_id] = []
      map[cat][b.contract_id].push(b)
    })
    return map
  }, [benefits, selectedIds])

  // Detect overlaps: categories covered by 2+ selected contracts
  const overlaps = useMemo(() => {
    return Object.entries(categoryMap)
      .filter(([, contractMap]) => {
        const contractsWithCoverage = Object.keys(contractMap).filter(cid => selectedIds.includes(cid))
        return contractsWithCoverage.length >= 2
      })
      .map(([cat]) => cat)
  }, [categoryMap, selectedIds])

  // Auto-expandir las categorías duplicadas para que se vea directamente cuáles son (obs. #9)
  useEffect(() => {
    if (overlaps.length > 0) setExpandedCategories(new Set(overlaps))
  }, [overlaps])

  // Estimate wasted cost (rough: proportional to # overlapping categories)
  const totalOverlapCost = useMemo(() => {
    if (overlaps.length === 0 || selected.length < 2) return 0
    // Take the cheaper contract's monthly cost as the "potentially wasted" amount
    // This is a rough estimate
    const costs = selected
      .filter(c => c.monthly_cost)
      .sort((a, b) => (a.monthly_cost ?? 0) - (b.monthly_cost ?? 0))
    if (costs.length < 2) return 0
    const cheaper = costs[0]
    const totalCategories = Object.keys(categoryMap).length
    if (totalCategories === 0) return 0
    const overlapRatio = overlaps.length / totalCategories
    return Math.round((cheaper.monthly_cost ?? 0) * overlapRatio)
  }, [overlaps, selected, categoryMap])

  const allCategories = Object.keys(categoryMap).sort()

  if (comparableCategories.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-ink mb-2">Comparar contratos</h1>
        <div className="mt-8 rounded-3xl border border-dashed border-line-strong bg-white px-6 py-12 text-center">
          <Mascot height={150} className="mx-auto mb-4 w-24" />
          <p className="font-display text-lg font-semibold text-indigo">Necesitas al menos 2 contratos de la misma categoría para comparar</p>
          <p className="text-sm text-ink-muted mt-1 max-w-lg mx-auto">
            La comparación solo tiene sentido entre contratos del mismo tipo (ej. Isapre con Isapre, o seguro complementario con seguro complementario).
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Comparar contratos</h1>
        <p className="text-sm text-ink-muted mt-1">
          Compara contratos de la misma categoría para detectar coberturas que se repiten
        </p>
      </div>

      {/* Category selector — solo se compara dentro de una categoría (obs. #10/#C11) */}
      {comparableCategories.length > 1 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-ink-soft mb-2">Categoría a comparar:</p>
          <div className="flex flex-wrap gap-2">
            {comparableCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  activeCat === cat
                    ? 'bg-indigo border-indigo text-white'
                    : 'bg-white border-line-strong text-ink-soft hover:border-violet/50'
                )}
              >
                {CATEGORY_LABELS[cat] ?? cat} ({contractsByCategory[cat].length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contract selector (solo contratos de la categoría activa) */}
      <div className="mb-6">
        <p className="text-sm font-medium text-ink-soft mb-3">Selecciona los contratos a comparar:</p>
        <div className="flex flex-wrap gap-2">
          {catContracts.map(c => (
            <button
              key={c.id}
              onClick={() => toggleContract(c.id)}
              className={cn(
                'rounded-lg border px-4 py-2 text-left transition-colors',
                selectedIds.includes(c.id)
                  ? 'bg-indigo border-indigo text-white'
                  : 'bg-white border-line-strong text-ink-soft hover:border-violet/50'
              )}
            >
              <span className="block text-sm font-semibold">{c.contract_display_name}</span>
              {c.provider_name && (
                <span className={cn('block text-xs', selectedIds.includes(c.id) ? 'text-lavender' : 'text-ink-muted')}>
                  {c.provider_name}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {selected.length < 2 ? (
        <div className="text-center py-10 text-ink-faint text-sm">
          Selecciona al menos 2 contratos para comparar
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className={cn(
              'rounded-xl border p-4',
              overlaps.length > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
            )}>
              <p className="text-2xl font-bold text-ink">{overlaps.length}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {overlaps.length === 1 ? 'Categoría duplicada' : 'Categorías duplicadas'}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-white p-4">
              <p className="text-2xl font-bold text-ink">{allCategories.length}</p>
              <p className="text-xs text-ink-muted mt-0.5">Categorías totales</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-4">
              <p className="text-2xl font-bold text-ink">
                {formatCurrency(
                  selected.reduce((s, c) => s + (c.monthly_cost ?? 0), 0),
                  selected[0]?.monthly_cost_currency
                )}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">Costo mensual total</p>
            </div>
            {totalOverlapCost > 0 && (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-2xl font-bold text-amber-700">
                  ~{formatCurrency(totalOverlapCost, selected[0]?.monthly_cost_currency)}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">Estimado pago doble/mes</p>
              </div>
            )}
          </div>

          {/* Overlap alert */}
          {overlaps.length > 0 && (
            <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Posible pago doble detectado en {overlaps.length} {overlaps.length === 1 ? 'categoría' : 'categorías'}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Tienes cobertura similar en <strong>{overlaps.map(o => CATEGORY_LABELS[o] ?? o).join(', ')}</strong> en múltiples contratos. Revisa si realmente necesitas ambas coberturas.
                </p>
              </div>
            </div>
          )}

          {/* Comparison table */}
          <div className="bg-white rounded-xl border border-line overflow-hidden">
            {/* Header row */}
            <div className={cn(
              'grid border-b border-line',
              `grid-cols-${Math.min(selected.length + 1, 5)}`
            )}
            style={{ gridTemplateColumns: `180px repeat(${selected.length}, 1fr)` }}
            >
              <div className="px-4 py-3 bg-surface border-r border-line" />
              {selected.map(c => (
                <div key={c.id} className="px-4 py-3 bg-surface border-r border-line last:border-r-0">
                  <p className="text-sm font-semibold text-ink truncate">{c.contract_display_name}</p>
                  <p className="text-xs text-ink-muted truncate">{c.provider_name ?? '—'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <DollarSign className="h-3 w-3 text-ink-faint" />
                    <span className="text-xs font-medium text-ink-soft">
                      {formatCurrency(c.monthly_cost, c.monthly_cost_currency)}/mes
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Category rows */}
            {allCategories.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-ink-faint">
                No se encontraron beneficios en los contratos seleccionados
              </div>
            ) : (
              allCategories.map(cat => {
                const isOverlap = overlaps.includes(cat)
                const isExpanded = expandedCategories.has(cat)
                const contractsWithCat = selected.filter(c => categoryMap[cat]?.[c.id]?.length > 0)

                return (
                  <div key={cat} className={cn(
                    'border-b border-line last:border-b-0',
                    isOverlap && 'bg-amber-50/40'
                  )}>
                    {/* Category header row */}
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="w-full text-left"
                    >
                      <div
                        style={{ gridTemplateColumns: `180px repeat(${selected.length}, 1fr)` }}
                        className="grid items-center hover:bg-surface/80 transition-colors"
                      >
                        {/* Category name */}
                        <div className="px-4 py-3 border-r border-line flex items-center gap-2">
                          <span className={cn(
                            'text-xs rounded-full border px-2.5 py-0.5 font-medium',
                            CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.otro
                          )}>
                            {CATEGORY_LABELS[cat] ?? cat}
                          </span>
                          {isOverlap && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                          )}
                        </div>

                        {/* Coverage presence per contract */}
                        {selected.map(c => {
                          const hasCoverage = (categoryMap[cat]?.[c.id]?.length ?? 0) > 0
                          return (
                            <div key={c.id} className="px-4 py-3 border-r border-line last:border-r-0 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {hasCoverage ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <MinusCircle className="h-4 w-4 text-lavender-deep flex-shrink-0" />
                                )}
                                <span className={cn(
                                  'text-xs',
                                  hasCoverage ? 'text-ink-soft' : 'text-ink-faint'
                                )}>
                                  {hasCoverage
                                    ? `${categoryMap[cat][c.id].length} cobertura${categoryMap[cat][c.id].length > 1 ? 's' : ''}`
                                    : 'Sin cobertura'}
                                </span>
                              </div>
                              {c.id === selected[selected.length - 1].id && (
                                <span className="ml-2 text-ink-faint">
                                  {isExpanded
                                    ? <ChevronUp className="h-3.5 w-3.5" />
                                    : <ChevronDown className="h-3.5 w-3.5" />}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </button>

                    {/* Expanded detail rows */}
                    {isExpanded && contractsWithCat.length > 0 && (
                      <div
                        className="border-t border-line bg-white"
                        style={{ gridTemplateColumns: `180px repeat(${selected.length}, 1fr)` }}
                      >
                        {/* Find max benefits in any single contract for this category */}
                        {(() => {
                          const maxBenefits = Math.max(
                            ...selected.map(c => categoryMap[cat]?.[c.id]?.length ?? 0)
                          )
                          return Array.from({ length: maxBenefits }).map((_, i) => (
                            <div
                              key={i}
                              className="grid border-t border-line"
                              style={{ gridTemplateColumns: `180px repeat(${selected.length}, 1fr)` }}
                            >
                              <div className="px-4 py-2 border-r border-line bg-surface/50">
                                <span className="text-xs text-ink-faint">Detalle {i + 1}</span>
                              </div>
                              {selected.map(c => {
                                const benefit = categoryMap[cat]?.[c.id]?.[i]
                                return (
                                  <div key={c.id} className="px-4 py-2.5 border-r border-line last:border-r-0">
                                    {benefit ? (
                                      <div>
                                        <p className="text-xs font-medium text-ink-soft">{benefit.name}</p>
                                        {benefit.includes_simple && (
                                          <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">{benefit.includes_simple}</p>
                                        )}
                                        {benefit.copay && (
                                          <p className="text-xs text-ink-muted mt-1">
                                            Copago: <span className="font-medium">{formatCopay(benefit.copay)}</span>
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-lavender-deep">—</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ))
                        })()}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Recommendation */}
          {overlaps.length > 0 && (
            <div className="mt-6 rounded-xl bg-lavender border border-lavender-deep p-4">
              <p className="text-sm font-semibold text-indigo mb-1">Recomendación</p>
              <p className="text-sm text-indigo">
                Tienes cobertura duplicada en <strong>{overlaps.map(o => CATEGORY_LABELS[o] ?? o).join(', ')}</strong>.
                Considera revisar con tu aseguradora si puedes eliminar una de las coberturas o reducir el plan para ahorrar en tu costo mensual.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
