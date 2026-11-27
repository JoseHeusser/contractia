import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BenefitsList, type BenefitWithContract } from '@/components/BenefitsList'
import { Info } from 'lucide-react'
import { Mascot } from '@/components/Mascot'

const CATEGORY_LABELS: Record<string, string> = {
  hospitalizacion: 'Hospitalización', ambulatorio: 'Ambulatorio', dental: 'Dental',
  mental: 'Salud Mental', farmacia: 'Farmacia', maternidad: 'Maternidad',
  vision: 'Visión', otro: 'Otro',
}

export default async function BenefitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: benefitsData } = await supabase
    .from('benefits')
    .select('*, contracts(contract_display_name, provider_name, category)')
    .eq('user_id', user.id)
    .order('sort_order')

  // El cliente tipado no resuelve la relación (Relationships vacío); casteamos.
  const benefits = (benefitsData ?? []) as unknown as BenefitWithContract[]

  // Categorías cubiertas por más de un contrato → con qué contratos (obs. #7, #13)
  const categoryContracts: Record<string, Set<string>> = {}
  benefits?.forEach(b => {
    const name = (b.contracts as { contract_display_name?: string } | null)?.contract_display_name
    if (b.category && name) {
      if (!categoryContracts[b.category]) categoryContracts[b.category] = new Set()
      categoryContracts[b.category].add(name)
    }
  })
  const overlaps = Object.entries(categoryContracts)
    .filter(([, names]) => names.size > 1)
    .map(([cat, names]) => ({ cat, names: Array.from(names) }))

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Beneficios</h1>
        <p className="text-sm text-ink-muted mt-1">Todos tus beneficios en un solo lugar</p>
      </div>

      {overlaps.length > 0 && (
        <div className="mb-6 rounded-xl bg-lavender border border-lavender-deep p-4 flex gap-3">
          <Info className="h-5 w-5 text-violet flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo">Coberturas que se complementan</p>
            <p className="text-xs text-ink-soft mt-1">
              Tienes cobertura en{' '}
              {overlaps.map((o, i) => (
                <span key={o.cat}>
                  <strong>{CATEGORY_LABELS[o.cat] ?? o.cat}</strong> ({o.names.join(' y ')})
                  {i < overlaps.length - 1 ? '; ' : ''}
                </span>
              ))}
              .
            </p>
            <p className="text-xs text-ink-soft mt-1.5">
              Normalmente <strong>no es un cobro doble</strong>: el seguro complementario suele cubrir <em>después</em> de tu
              isapre (primero paga la isapre y luego el complementario sobre el copago restante). Revisa el detalle en{' '}
              <a href="/app/comparar" className="underline font-semibold text-violet">Comparar</a> para ver cómo se combinan.
            </p>
          </div>
        </div>
      )}

      {benefits && benefits.length > 0 ? (
        <BenefitsList benefits={benefits} showContract />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Mascot height={150} className="mb-4 w-24" />
          <p className="text-base font-semibold text-indigo mb-1 font-display">Todavía no hay beneficios</p>
          <p className="text-xs text-ink-muted">Los beneficios aparecerán automáticamente al procesar tus contratos.</p>
        </div>
      )}
    </div>
  )
}
