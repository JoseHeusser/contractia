import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [{ data: contract }, { data: benefits }, { data: alerts }, { data: evidence }] = await Promise.all([
    supabase.from('contracts').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('benefits').select('*').eq('contract_id', id).order('sort_order'),
    supabase.from('alerts').select('*').eq('contract_id', id).eq('status', 'open'),
    supabase.from('evidence_snippets').select('*').eq('contract_id', id),
  ])

  if (!contract) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ contract, benefits, alerts, evidence })
}
