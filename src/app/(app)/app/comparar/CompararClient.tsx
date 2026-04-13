'use client'

import { useState, useMemo } from 'react'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, CheckCircle, MinusCircle, ChevronDown, ChevronUp, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  hospitalizacion: 'bg-blue-50 text-blue-700 border-blue-200',
  ambulatorio: 'bg-green-50 text-green-700 border-green-200',
  dental: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  mental: 'bg-purple-50 text-purple-700 border-purple-200',
  farmacia: 'bg-orange-50 text-orange-700 border-orange-200',
  maternidad: 'bg-pink-50 text-pink-700 border-pink-200',
  vision: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  otro: 'bg-gray-50 text-gray-700 border-gray-200',
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
  const [selectedIds, setSelectedIds] = useState<string[]>(contracts.slice(0, 2).map(c => c.id))
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const selected = contracts.filter(c => selectedIds.includes(c.id))

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

  if (contracts.length < 2) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Comparar contratos</h1>
        <div className="mt-12 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Necesitas al menos 2 contratos procesados para comparar</p>
          <p className="text-sm text-gray-400 mt-1">Sube y procesa más contratos para detectar coberturas duplicadas</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Comparar contratos</h1>
        <p className="text-sm text-gray-500 mt-1">Detecta coberturas duplicadas y posible pago doble entre tus contratos</p>
      </div>

      {/* Contract selector */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Selecciona los contratos a comparar:</p>
        <div className="flex flex-wrap gap-2">
          {contracts.map(c => (
            <button
              key={c.id}
              onClick={() => toggleContract(c.id)}
              className={cn(
                'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                selectedIds.includes(c.id)
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
              )}
            >
              {c.contract_display_name}
            </button>
          ))}
        </div>
      </div>

      {selected.length < 2 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
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
              <p className="text-2xl font-bold text-gray-900">{overlaps.length}</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {overlaps.length === 1 ? 'Categoría duplicada' : 'Categorías duplicadas'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="text-2xl font-bold text-gray-900">{allCategories.length}</p>
              <p className="text-xs text-gray-600 mt-0.5">Categorías totales</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  selected.reduce((s, c) => s + (c.monthly_cost ?? 0), 0),
                  selected[0]?.monthly_cost_currency
                )}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">Costo mensual total</p>
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
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Header row */}
            <div className={cn(
              'grid border-b border-gray-100',
              `grid-cols-${Math.min(selected.length + 1, 5)}`
            )}
            style={{ gridTemplateColumns: `180px repeat(${selected.length}, 1fr)` }}
            >
              <div className="px-4 py-3 bg-gray-50 border-r border-gray-100" />
              {selected.map(c => (
                <div key={c.id} className="px-4 py-3 bg-gray-50 border-r border-gray-100 last:border-r-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.contract_display_name}</p>
                  <p className="text-xs text-gray-500 truncate">{c.provider_name ?? '—'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <DollarSign className="h-3 w-3 text-gray-400" />
                    <span className="text-xs font-medium text-gray-700">
                      {formatCurrency(c.monthly_cost, c.monthly_cost_currency)}/mes
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Category rows */}
            {allCategories.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">
                No se encontraron beneficios en los contratos seleccionados
              </div>
            ) : (
              allCategories.map(cat => {
                const isOverlap = overlaps.includes(cat)
                const isExpanded = expandedCategories.has(cat)
                const contractsWithCat = selected.filter(c => categoryMap[cat]?.[c.id]?.length > 0)

                return (
                  <div key={cat} className={cn(
                    'border-b border-gray-50 last:border-b-0',
                    isOverlap && 'bg-amber-50/40'
                  )}>
                    {/* Category header row */}
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="w-full text-left"
                    >
                      <div
                        style={{ gridTemplateColumns: `180px repeat(${selected.length}, 1fr)` }}
                        className="grid items-center hover:bg-gray-50/80 transition-colors"
                      >
                        {/* Category name */}
                        <div className="px-4 py-3 border-r border-gray-100 flex items-center gap-2">
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
                            <div key={c.id} className="px-4 py-3 border-r border-gray-100 last:border-r-0 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {hasCoverage ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <MinusCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                )}
                                <span className={cn(
                                  'text-xs',
                                  hasCoverage ? 'text-gray-700' : 'text-gray-400'
                                )}>
                                  {hasCoverage
                                    ? `${categoryMap[cat][c.id].length} cobertura${categoryMap[cat][c.id].length > 1 ? 's' : ''}`
                                    : 'No cubierto'}
                                </span>
                              </div>
                              {c.id === selected[selected.length - 1].id && (
                                <span className="ml-2 text-gray-400">
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
                        className="border-t border-gray-100 bg-white"
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
                              className="grid border-t border-gray-50"
                              style={{ gridTemplateColumns: `180px repeat(${selected.length}, 1fr)` }}
                            >
                              <div className="px-4 py-2 border-r border-gray-100 bg-gray-50/50">
                                <span className="text-xs text-gray-400">Detalle {i + 1}</span>
                              </div>
                              {selected.map(c => {
                                const benefit = categoryMap[cat]?.[c.id]?.[i]
                                return (
                                  <div key={c.id} className="px-4 py-2.5 border-r border-gray-100 last:border-r-0">
                                    {benefit ? (
                                      <div>
                                        <p className="text-xs font-medium text-gray-800">{benefit.name}</p>
                                        {benefit.includes_simple && (
                                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{benefit.includes_simple}</p>
                                        )}
                                        {benefit.copay && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            Copago: <span className="font-medium">{formatCopay(benefit.copay)}</span>
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-300">—</span>
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
            <div className="mt-6 rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-sm font-semibold text-blue-900 mb-1">Recomendación</p>
              <p className="text-sm text-blue-800">
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
