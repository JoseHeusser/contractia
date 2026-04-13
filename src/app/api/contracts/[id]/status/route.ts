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

  const { data: contract } = await supabase
    .from('contracts')
    .select('status, error_code, error_message, retry_count')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!contract) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json(contract)
}
