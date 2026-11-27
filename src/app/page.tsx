import Link from 'next/link'
import { MessageCircle, FileSearch, Scale, Upload, ArrowRight, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Mascot, AssistantAvatar, Spark } from '@/components/Mascot'

const STEPS = [
  {
    word: 'Pregunta.',
    title: 'Pregúntale lo que quieras',
    text: '“¿Me cubre el dentista?”, “¿Cuánto pago por una urgencia?”. Escribe como hablas y Gotu te responde sin letra chica.',
    icon: MessageCircle,
  },
  {
    word: 'Entiende.',
    title: 'Tu contrato, en simple',
    text: 'Sube el PDF de tu isapre o seguro y te mostramos coberturas, copagos, topes y carencias ordenados y fáciles de leer.',
    icon: FileSearch,
  },
  {
    word: 'Decide.',
    title: 'Decide con la evidencia a la vista',
    text: 'Cada respuesta cita la parte exacta de tu contrato. Compara planes y recibe alertas de lo que importa antes de firmar o reclamar.',
    icon: Scale,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <nav
          aria-label="Principal"
          className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6"
        >
          <Link href="/" aria-label="Gotu, inicio" className="rounded-lg">
            <Logo size="sm" className="sm:hidden" />
            <Logo size="md" className="hidden sm:inline-flex" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/login"
              className="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-violet sm:px-3"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center whitespace-nowrap rounded-full bg-indigo px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet sm:px-4"
            >
              Comenzar gratis
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-lavender/70 via-surface to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-24 lg:pt-20">
            <div className="text-center lg:text-left">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-lavender-deep bg-white px-3.5 py-1.5 text-sm font-medium text-indigo">
                <Spark />
                Para tu isapre o seguro de salud en Chile
              </p>
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-indigo sm:text-5xl lg:text-6xl">
                Tu contrato de salud, por fin{' '}
                <span className="relative whitespace-nowrap">
                  <span className="relative z-10">en simple</span>
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-full bg-gold/60 sm:h-4"
                  />
                </span>
              </h1>
              <p className="mt-5 font-display text-2xl font-semibold text-violet sm:text-3xl">
                Pregunta. Entiende. Decide.
              </p>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-muted lg:mx-0">
                Sube el PDF de tu plan y Gotu te explica qué cubre, cuánto pagas y en qué fijarte.
                Sin jerga legal, y siempre mostrándote de dónde sale cada respuesta.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/signup"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo px-7 py-3.5 text-base font-semibold text-white shadow-brand transition-colors hover:bg-violet sm:w-auto"
                >
                  <Upload className="h-4 w-4" aria-hidden />
                  Sube tu contrato gratis
                </Link>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-full border border-line-strong bg-white px-7 py-3.5 text-base font-semibold text-indigo transition-colors hover:border-violet hover:text-violet sm:w-auto"
                >
                  Ya tengo cuenta
                </Link>
              </div>
              <p className="mt-5 inline-flex items-center gap-1.5 text-sm text-ink-muted">
                <ShieldCheck className="h-4 w-4 text-violet" aria-hidden />
                Tu contrato es privado: solo tú puedes verlo.
              </p>
            </div>

            {/* Mascota + ejemplo de chat */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div
                aria-hidden
                className="absolute left-1/2 top-6 h-64 w-64 -translate-x-1/2 rounded-full bg-lavender-deep/60 blur-2xl sm:h-80 sm:w-80"
              />
              <div className="relative flex justify-center">
                <Mascot height={340} preload className="w-44 drop-shadow-xl sm:w-56 lg:w-60" />
              </div>
              <div className="relative -mt-6 rounded-3xl border border-line bg-white p-4 shadow-card sm:p-5">
                <p className="mb-3 text-xs text-ink-faint">Ejemplo ilustrativo</p>
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo px-4 py-2.5 text-sm font-medium text-white">
                    ¿Mi plan cubre la consulta con el dermatólogo?
                  </p>
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <AssistantAvatar size={36} />
                  <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-lavender px-4 py-2.5 text-sm leading-relaxed text-ink">
                    Sí. Según tu contrato, las consultas de especialidad tienen 70% de bonificación.
                    <Spark className="mx-1 -mt-1" />
                    Te marco la cláusula.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pregunta. Entiende. Decide. */}
        <section aria-labelledby="como-funciona" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 id="como-funciona" className="text-3xl font-bold text-indigo sm:text-4xl">
              Así de simple funciona
            </h2>
            <p className="mt-3 text-lg text-ink-muted">
              Tres pasos para dejar de adivinar qué dice tu plan.
            </p>
          </div>
          <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {STEPS.map((step) => (
              <li
                key={step.word}
                className="rounded-3xl border border-line bg-surface p-7 transition-shadow hover:shadow-card"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo text-white">
                    <step.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="font-display text-xl font-bold text-violet">{step.word}</span>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-indigo">{step.title}</h3>
                <p className="leading-relaxed text-ink-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA final */}
        <section className="px-4 pb-16 sm:px-6 lg:pb-24">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-indigo px-6 py-12 text-center sm:px-12 sm:py-16">
            <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet/50 blur-2xl" />
            <div aria-hidden className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet/40 blur-2xl" />
            <div className="relative">
              <Logo variant="wordmark" tone="dark" size="lg" />
              <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold text-white sm:text-4xl">
                ¿Tienes dudas con tu plan de salud? Pregúntale a Gotu.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-lg text-lavender">
                Sube tu contrato y en minutos sabrás qué cubre y cuánto pagas.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 text-base font-bold text-indigo-deep transition-transform hover:scale-[1.03] focus-visible:outline-white"
              >
                Comenzar gratis
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-ink-muted sm:flex-row sm:px-6">
          <Logo size="sm" />
          <p className="text-center">
            © {new Date().getFullYear()} Gotu · Pregunta. Entiende. Decide. · Hecho para Chile.
          </p>
        </div>
      </footer>
    </div>
  )
}
