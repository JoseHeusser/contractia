import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { Mascot, Spark } from '@/components/Mascot'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Panel de marca (desktop) */}
      <aside className="relative hidden overflow-hidden bg-indigo lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-violet/50 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-violet/40 blur-3xl" />
        <Link href="/" aria-label="Gotu, inicio" className="relative self-start rounded-lg focus-visible:outline-white">
          <Logo variant="wordmark" tone="dark" size="lg" />
        </Link>
        <div className="relative flex flex-col items-center text-center">
          <div className="relative">
            <div aria-hidden className="absolute inset-x-4 bottom-2 top-10 rounded-full bg-lavender/20 blur-2xl" />
            <Mascot height={320} preload className="relative w-52 drop-shadow-2xl xl:w-60" />
          </div>
          <p className="mt-8 font-display text-3xl font-semibold text-white xl:text-4xl">
            Pregunta. Entiende. <span className="text-gold">Decide.</span>
          </p>
          <p className="mt-3 max-w-sm text-base text-lavender">
            Tu contrato de salud explicado en simple, con respuestas que siempre citan la cláusula.
          </p>
        </div>
        <p className="relative inline-flex items-center gap-2 text-sm text-lavender">
          <Spark />
          Tu contrato es privado: solo tú puedes verlo.
        </p>
      </aside>

      {/* Formulario */}
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:py-12">
        <div className="mb-6 flex flex-col items-center lg:hidden">
          <Mascot height={110} preload className="mb-3 w-[4.75rem]" />
          <Link href="/" aria-label="Gotu, inicio" className="rounded-lg">
            <Logo variant="wordmark" size="lg" />
          </Link>
          <p className="mt-2 font-display text-base font-semibold text-violet">
            Pregunta. Entiende. Decide.
          </p>
        </div>
        <div className="w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
