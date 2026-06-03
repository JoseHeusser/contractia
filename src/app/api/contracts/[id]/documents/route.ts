import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff']
const MAX_SIZE = 50 * 1024 * 1024 // 50MB por archivo

/**
 * Agrega uno o más documentos a un contrato YA existente y vuelve a disparar
 * el procesamiento (WF1). Resuelve obs. #1: el usuario podía ver una alerta
 * pidiendo subir otro documento, pero no tenía dónde hacerlo.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar propiedad del contrato
  const { data: contract } = await supabase
    .from('contracts')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!contract) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
  }

  const files = formData.getAll('files') as File[]
  if (!files.length) return NextResponse.json({ error: 'Al menos un archivo es requerido' }, { status: 400 })
  for (const file of files) {
    if (!ALLOWED_MIMES.includes(file.type)) return NextResponse.json({ error: `Tipo no permitido: ${file.type}` }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: `El archivo "${file.name}" supera 50MB` }, { status: 400 })
  }

  // Continuar la numeración de archivos a partir de los existentes
  const { count: existingCount } = await supabase
    .from('contract_documents')
    .select('id', { count: 'exact', head: true })
    .eq('contract_id', id)
  let index = existingCount ?? 0

  const storagePaths: string[] = []
  const documentIds: string[] = []

  for (const file of files) {
    const fileExt = file.name.split('.').pop() ?? 'pdf'
    const storagePath = `${user.id}/${id}/original_${index}.${fileExt}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false })
    if (uploadError) return NextResponse.json({ error: `Error al subir "${file.name}"` }, { status: 500 })

    const { data: document, error: docError } = await supabase
      .from('contract_documents')
      .insert({
        contract_id: id,
        user_id: user.id,
        storage_path: storagePath,
        file_mime: file.type,
        file_size_bytes: file.size,
        metadata: { original_name: file.name, file_index: index },
      })
      .select('id')
      .single()
    if (docError || !document) return NextResponse.json({ error: 'Error al registrar el documento' }, { status: 500 })

    storagePaths.push(storagePath)
    documentIds.push(document.id)
    index++
  }

  // Volver a estado de procesamiento para re-analizar el contrato completo
  await supabase.from('contracts').update({ status: 'uploaded' }).eq('id', id)

  await supabase.from('events').insert({
    user_id: user.id,
    contract_id: id,
    event_type: 'documents_added',
    payload: { document_ids: documentIds, file_count: files.length },
  })

  // Re-disparar WF1 con todos los documentos del contrato
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (webhookUrl) {
    try {
      const { data: allDocs } = await supabase
        .from('contract_documents')
        .select('id, storage_path')
        .eq('contract_id', id)
      const allPaths = (allDocs ?? []).map(d => d.storage_path)
      const allIds = (allDocs ?? []).map(d => d.id)
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          contractId: id,
          documentId: allIds[0],
          storagePath: allPaths[0],
          storagePaths: allPaths,
          documentIds: allIds,
          fileCount: allPaths.length,
          reprocess: true,
        }),
      })
    } catch {
      // No fatal
    }
  }

  return NextResponse.json({ contractId: id, documentIds })
}
