import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ContractCard } from '@/components/ContractCard'
import { Upload } from 'lucide-react'
import { Mascot } from '@/components/Mascot'

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
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">Mis contratos</h1>
          <p className="text-sm text-ink-muted mt-1">{contracts?.length ?? 0} contrato{contracts?.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/app/contracts/new"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet transition-colors"
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
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line-strong bg-white px-6 py-16 text-center">
          <Mascot height={170} className="mb-5 w-28" />
          <h2 className="text-xl font-semibold text-indigo mb-1">Aún no tienes contratos</h2>
          <p className="text-sm text-ink-muted mb-6 max-w-sm">
            Sube el PDF de tu isapre, seguro complementario o cualquier contrato de salud y te lo explico en simple.
          </p>
          <Link
            href="/app/contracts/new"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet transition-colors"
          >
            <Upload className="h-4 w-4" />
            Subir primer contrato
          </Link>
        </div>
      )}
    </div>
  )
}
