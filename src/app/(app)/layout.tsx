import { redirect } from 'next/navigation'
import { getSession } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSession()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userName={profile?.full_name || profile?.email || 'Usuario'}
        userEmail={profile?.email || ''}
        isAdmin={profile?.role === 'admin'}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
