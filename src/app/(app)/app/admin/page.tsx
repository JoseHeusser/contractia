import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { AdminUsersTable } from './AdminUsersTable'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/app')

  const [{ data: profiles }, { data: contractStats }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('contracts').select('user_id, created_at'),
  ])

  const totalUsers = profiles?.length ?? 0
  const activeUsers = profiles?.filter(p => p.is_active).length ?? 0
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0)
  const contractsThisMonth = contractStats?.filter(c => new Date(c.created_at) >= thisMonth).length ?? 0

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
        <p className="text-sm text-gray-500 mt-1">Gestión de usuarios y actividad de la plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total usuarios', value: totalUsers },
          { label: 'Usuarios activos', value: activeUsers },
          { label: 'Contratos este mes', value: contractsThisMonth },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Usuarios</h2>
        </div>
        <AdminUsersTable profiles={profiles ?? []} />
      </div>
    </div>
  )
}
