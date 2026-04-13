import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ContractCard } from '@/components/ContractCard'
import { Upload, FileText } from 'lucide-react'

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Contratos</h1>
          <p className="text-sm text-gray-500 mt-1">{contracts?.length ?? 0} contrato{contracts?.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/app/contracts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Subir contrato
        </Link>
      </div>

      {contracts && contracts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 mb-4">
            <FileText className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin contratos aún</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            Sube tu póliza de isapre, seguro complementario o cualquier contrato de salud para comenzar.
          </p>
          <Link
            href="/app/contracts/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Subir primer contrato
          </Link>
        </div>
      )}
    </div>
  )
}
