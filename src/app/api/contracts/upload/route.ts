import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff']
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const name = (formData.get('name') as string | null)?.trim()
  const category = (formData.get('category') as string | null) ?? 'isapre'

  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  if (!ALLOWED_MIMES.includes(file.type)) return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'El archivo supera el límite de 50MB' }, { status: 400 })

  // Create contract row
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .insert({ user_id: user.id, contract_display_name: name, category, status: 'uploaded' })
    .select('id')
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Error al crear el contrato' }, { status: 500 })
  }

  // Upload file to storage
  const fileExt = file.name.split('.').pop() ?? 'pdf'
  const storagePath = `${user.id}/${contract.id}/original.${fileExt}`
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('contracts')
    .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    // Rollback contract
    await supabase.from('contracts').delete().eq('id', contract.id)
    return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 })
  }

  // Create document record
  const { data: document, error: docError } = await supabase
    .from('contract_documents')
    .insert({
      contract_id: contract.id,
      user_id: user.id,
      storage_path: storagePath,
      file_mime: file.type,
      file_size_bytes: file.size,
      metadata: { original_name: file.name },
    })
    .select('id')
    .single()

  if (docError || !document) {
    return NextResponse.json({ error: 'Error al registrar el documento' }, { status: 500 })
  }

  // Register event
  await supabase.from('events').insert({
    user_id: user.id,
    contract_id: contract.id,
    event_type: 'upload_completed',
    payload: { document_id: document.id, file_size: file.size, file_mime: file.type },
  })

  // Call n8n webhook if configured
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, contractId: contract.id, documentId: document.id, storagePath }),
      })
    } catch {
      // Non-fatal — webhook failure doesn't block the response
    }
  }

  return NextResponse.json({ contractId: contract.id, documentId: document.id })
}
