import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompararClient } from './CompararClient'

export default async function CompararPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: contracts }, { data: benefits }] = await Promise.all([
    supabase
      .from('contracts')
      .select('id, contract_display_name, provider_name, monthly_cost, monthly_cost_currency, category')
      .eq('user_id', user.id)
      .in('status', ['ready', 'needs_review'])
      .order('created_at', { ascending: false }),
    supabase
      .from('benefits')
      .select('id, contract_id, name, category, includes_simple, copay, deductible, waiting_period')
      .eq('user_id', user.id)
      .order('sort_order'),
  ])

  return (
    <CompararClient
      contracts={contracts ?? []}
      benefits={benefits ?? []}
    />
  )
}
