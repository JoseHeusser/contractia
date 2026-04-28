import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: contract } = await supabase
    .from('contracts')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!contract) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Get storage paths to delete files
  const { data: documents } = await supabase
    .from('contract_documents')
    .select('storage_path, ocr_storage_path')
    .eq('contract_id', id)

  // Delete storage files
  if (documents && documents.length > 0) {
    const paths: string[] = []
    for (const doc of documents) {
      if (doc.storage_path) paths.push(doc.storage_path)
      if (doc.ocr_storage_path) paths.push(doc.ocr_storage_path)
    }
    if (paths.length > 0) {
      await supabase.storage.from('contracts').remove(paths)
    }
  }

  // Delete all related DB rows (order matters for FK constraints)
  await Promise.all([
    supabase.from('benefits').delete().eq('contract_id', id),
    supabase.from('alerts').delete().eq('contract_id', id),
    supabase.from('evidence_snippets').delete().eq('contract_id', id),
    supabase.from('events').delete().eq('contract_id', id),
  ])
  await supabase.from('contract_documents').delete().eq('contract_id', id)
  await supabase.from('contracts').delete().eq('id', id)

  return NextResponse.json({ success: true })
}

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
