import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BenefitsList } from '@/components/BenefitsList'
import { Shield } from 'lucide-react'

export default async function BenefitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: benefits } = await supabase
    .from('benefits')
    .select('*, contracts(contract_display_name, provider_name)')
    .eq('user_id', user.id)
    .order('sort_order')

  // Detect duplicates by category
  const categoryCount: Record<string, number> = {}
  benefits?.forEach(b => {
    if (b.category) categoryCount[b.category] = (categoryCount[b.category] ?? 0) + 1
  })
  const duplicateCategories = new Set(Object.entries(categoryCount).filter(([, n]) => n > 1).map(([k]) => k))

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Beneficios</h1>
        <p className="text-sm text-gray-500 mt-1">Todos tus beneficios en un solo lugar</p>
      </div>

      {duplicateCategories.size > 0 && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-100 p-4 flex gap-3">
          <Shield className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Posible duplicación detectada</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Tienes múltiples contratos con cobertura en: {Array.from(duplicateCategories).join(', ')}. Podrías estar pagando de más.
            </p>
          </div>
        </div>
      )}

      {benefits && benefits.length > 0 ? (
        <BenefitsList benefits={benefits} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Shield className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">Sin beneficios registrados</p>
          <p className="text-xs text-gray-500">Los beneficios aparecerán automáticamente al procesar tus contratos.</p>
        </div>
      )}
    </div>
  )
}
