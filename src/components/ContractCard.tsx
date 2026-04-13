import Link from 'next/link'
import { StatusBadge } from './StatusBadge'
import { formatCurrency, formatDate, categoryLabel } from '@/lib/utils'
import { Calendar, DollarSign, ArrowRight } from 'lucide-react'
import type { Tables } from '@/types/database'

interface ContractCardProps {
  contract: Tables<'contracts'>
}

export function ContractCard({ contract }: ContractCardProps) {
  return (
    <Link
      href={`/app/contracts/${contract.id}`}
      className="group block bg-white rounded-xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <StatusBadge status={contract.status} />
        <span className="text-xs text-gray-400 bg-gray-50 rounded-full px-2.5 py-0.5 border border-gray-100">
          {categoryLabel(contract.category)}
        </span>
      </div>

      <h3 className="font-semibold text-gray-900 mb-0.5 leading-tight">
        {contract.contract_display_name}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {contract.provider_name ?? 'Proveedor no detectado'}
      </p>

      <div className="space-y-1.5">
        {contract.monthly_cost !== null && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <DollarSign className="h-3.5 w-3.5 text-gray-400" />
            <span>{formatCurrency(contract.monthly_cost, contract.monthly_cost_currency)} / mes</span>
          </div>
        )}
        {(contract.renewal_date || contract.end_date) && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <span>
              {contract.renewal_date ? `Renueva ${formatDate(contract.renewal_date)}` : `Vence ${formatDate(contract.end_date)}`}
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-4">
        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
      </div>
    </Link>
  )
}
