'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // El link del email vuelve a /auth/callback, que intercambia el código
        // por la sesión y redirige a /app.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-indigo mb-2">¡Listo, ya tienes cuenta!</h2>
        <p className="text-ink-muted mb-6">
          Te enviamos un correo a <strong className="text-ink">{email}</strong>. Confírmalo y podrás subir tu primer contrato.
        </p>
        <Link
          href="/login"
          className="text-sm font-semibold text-violet underline-offset-2 hover:underline"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-indigo mb-1">Crea tu cuenta</h1>
      <p className="text-sm text-ink-muted mb-6">
        Es gratis y toma un minuto. ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-violet underline-offset-2 hover:underline font-semibold">
          Iniciar sesión
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-ink-soft mb-1.5">
            Nombre completo
          </label>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-line-strong px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-violet focus:ring-2 focus:ring-violet/30 transition-all"
            placeholder="Ana García"
          />
        </div>

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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-line-strong px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-violet focus:ring-2 focus:ring-violet/30 transition-all"
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-soft mb-1.5">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-line-strong px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-violet focus:ring-2 focus:ring-violet/30 transition-all"
            placeholder="Repite tu contraseña"
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
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>

        <p className="text-xs text-center text-ink-muted">
          Al crear una cuenta aceptas nuestros términos de servicio y política de privacidad.
        </p>
      </form>
    </>
  )
}
