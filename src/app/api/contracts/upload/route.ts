import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processContract } from '@/lib/processing/processContract'

// El procesamiento corre en after() y comparte este límite de tiempo.
export const maxDuration = 300

const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff']
const MAX_SIZE = 50 * 1024 * 1024 // 50MB per file

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

  const filesRaw = formData.getAll('files') as File[]
  const files = filesRaw.length > 0 ? filesRaw : ([formData.get('file')].filter(Boolean) as File[])
  const name = (formData.get('name') as string | null)?.trim()
  const category = (formData.get('category') as string | null) ?? 'isapre'

  if (!files.length) return NextResponse.json({ error: 'Al menos un archivo es requerido' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  for (const file of files) {
    if (!ALLOWED_MIMES.includes(file.type)) return NextResponse.json({ error: `Tipo no permitido: ${file.type}` }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: `El archivo "${file.name}" supera 50MB` }, { status: 400 })
  }

  // Create contract row
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .insert({ user_id: user.id, contract_display_name: name, category, status: 'uploaded' })
    .select('id')
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Error al crear el contrato' }, { status: 500 })
  }

  // Upload all files to storage + create document records
  const storagePaths: string[] = []
  const documentIds: string[] = []

  for (const file of files) {
    const fileExt = file.name.split('.').pop() ?? 'pdf'
    const index = storagePaths.length
    const storagePath = `${user.id}/${contract.id}/original_${index}.${fileExt}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      await supabase.from('contracts').delete().eq('id', contract.id)
      return NextResponse.json({ error: `Error al subir "${file.name}"` }, { status: 500 })
    }

    const { data: document, error: docError } = await supabase
      .from('contract_documents')
      .insert({
        contract_id: contract.id,
        user_id: user.id,
        storage_path: storagePath,
        file_mime: file.type,
        file_size_bytes: file.size,
        metadata: { original_name: file.name, file_index: index },
      })
      .select('id')
      .single()

    if (docError || !document) {
      await supabase.from('contracts').delete().eq('id', contract.id)
      return NextResponse.json({ error: 'Error al registrar el documento' }, { status: 500 })
    }

    storagePaths.push(storagePath)
    documentIds.push(document.id)
  }

  // Register event
  await supabase.from('events').insert({
    user_id: user.id,
    contract_id: contract.id,
    event_type: 'upload_completed',
    payload: { document_ids: documentIds, file_count: files.length },
  })

  // Procesar en segundo plano: la respuesta vuelve de inmediato y la UI
  // consulta /api/contracts/[id]/status hasta que termine.
  after(() => processContract(contract.id))

  return NextResponse.json({ contractId: contract.id, documentIds })
}
