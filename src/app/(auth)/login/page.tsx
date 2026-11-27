'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : error.message
      )
      setLoading(false)
      return
    }

    router.push('/app')
    router.refresh()
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-indigo mb-1">¡Hola de nuevo!</h1>
      <p className="text-sm text-ink-muted mb-6">
        Inicia sesión para seguir con tus contratos. ¿No tienes cuenta?{' '}
        <Link href="/signup" className="text-violet underline-offset-2 hover:underline font-semibold">
          Crear una cuenta
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink-soft mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-line-strong px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-violet focus:ring-2 focus:ring-violet/30 transition-all"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink-soft mb-1.5">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-line-strong px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-violet focus:ring-2 focus:ring-violet/30 transition-all"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
      </form>
    </>
  )
}
