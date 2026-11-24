import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processContract } from '@/lib/processing/processContract'

// El procesamiento corre en after() y comparte este límite de tiempo.
export const maxDuration = 300

const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff']
const MAX_SIZE = 50 * 1024 * 1024 // 50MB por archivo

/**
 * Agrega uno o más documentos a un contrato YA existente y vuelve a disparar
 * el procesamiento (processContract). Resuelve obs. #1: el usuario podía ver una alerta
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

  // Limpiar filas derivadas antes de reprocesar para evitar DUPLICADOS
  // (processContract las regenera desde cero). NO se borran los documentos ni el contrato.
  await Promise.all([
    supabase.from('benefits').delete().eq('contract_id', id),
    supabase.from('alerts').delete().eq('contract_id', id),
    supabase.from('evidence_snippets').delete().eq('contract_id', id),
    supabase.from('document_chunks').delete().eq('contract_id', id),
  ])

  // Volver a estado de procesamiento para re-analizar el contrato completo
  await supabase.from('contracts').update({ status: 'uploaded' }).eq('id', id)

  await supabase.from('events').insert({
    user_id: user.id,
    contract_id: id,
    event_type: 'documents_added',
    payload: { document_ids: documentIds, file_count: files.length },
  })

  // Reprocesar el contrato completo (todos sus documentos) en segundo plano
  after(() => processContract(id))

  return NextResponse.json({ contractId: id, documentIds })
}
