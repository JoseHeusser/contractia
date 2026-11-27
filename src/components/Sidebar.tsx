'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, Shield, MessageCircle, Users, LogOut, Menu, X, GitCompare } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface SidebarProps {
  userName: string
  userEmail: string
  isAdmin: boolean
}

const navItems = [
  { href: '/app', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { href: '/app/contracts', label: 'Contratos', icon: FileText },
  { href: '/app/benefits', label: 'Beneficios', icon: Shield },
  { href: '/app/comparar', label: 'Comparar', icon: GitCompare },
  { href: '/app/chat', label: 'Pregúntale a Gotu', icon: MessageCircle },
]

export function Sidebar({ userName, userEmail, isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const linkClass = (active: boolean) =>
    cn(
      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
      active
        ? 'bg-lavender text-indigo font-semibold'
        : 'text-ink-muted font-medium hover:bg-surface hover:text-indigo'
    )

  const iconClass = (active: boolean) =>
    cn('h-[18px] w-[18px] flex-shrink-0', active ? 'text-violet' : 'text-ink-faint group-hover:text-violet')

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <Link href="/app" onClick={() => setMobileOpen(false)} aria-label="Gotu, ir al inicio" className="inline-flex rounded-lg">
          <Logo size="md" />
        </Link>
      </div>

      {/* Nav */}
      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={linkClass(active)}
            >
              <item.icon className={iconClass(active)} aria-hidden />
              {item.label}
            </Link>
          )
        })}
        {isAdmin && (
          <Link
            href="/app/admin"
            onClick={() => setMobileOpen(false)}
            aria-current={isActive('/app/admin') ? 'page' : undefined}
            className={linkClass(isActive('/app/admin'))}
          >
            <Users className={iconClass(isActive('/app/admin'))} aria-hidden />
            Admin
          </Link>
        )}
      </nav>

      {/* Lema */}
      <p className="px-5 pb-3 font-display text-sm font-semibold text-violet">
        Pregunta. Entiende. Decide.
      </p>

      {/* User */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-9 w-9 rounded-full bg-indigo flex items-center justify-center flex-shrink-0">
            <span className="font-display text-sm font-semibold text-white">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{userName}</p>
            <p className="text-xs text-ink-muted truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-ink-faint hover:bg-lavender hover:text-indigo transition-colors"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-line flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white/95 backdrop-blur border-b border-line px-4 flex items-center justify-between">
        <Link href="/app" aria-label="Gotu, ir al inicio" className="inline-flex rounded-lg">
          <Logo size="sm" />
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
          className="p-2 rounded-lg text-indigo hover:bg-lavender transition-colors"
        >
          {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20">
          <div className="absolute inset-0 bg-indigo-deep/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-14 bottom-0 w-64 bg-white shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Mobile content offset */}
      <div className="md:hidden h-14 flex-shrink-0" />
    </>
  )
}
