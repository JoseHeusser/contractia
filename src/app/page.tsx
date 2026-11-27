import Link from 'next/link'
import { FileText, Shield, MessageCircle } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">Gotu</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="inline-flex items-center rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 mb-6">
          Plataforma para el mercado chileno
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-6">
          Entiende tu contrato de{' '}
          <span className="text-blue-600">salud</span> en minutos
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-gray-600 mb-10">
          Sube tu póliza de isapre o seguro complementario y obtén un resumen claro,
          alertas de puntos críticos y un asistente IA para resolver tus dudas.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
          >
            Comenzar gratis
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Extracción automática
            </h3>
            <p className="text-gray-600">
              Nuestra IA lee y estructura todos los datos clave de tu contrato: coberturas,
              copagos, deducibles, períodos de carencia y más.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Evidencia verificable
            </h3>
            <p className="text-gray-600">
              Cada dato extraído está respaldado por el fragmento exacto del documento original.
              Siempre sabes de dónde proviene la información.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Asistente IA
            </h3>
            <p className="text-gray-600">
              Haz preguntas en lenguaje natural sobre tu cobertura. El asistente responde
              citando el contrato para que puedas confiar en cada respuesta.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Gotu. Plataforma de análisis de contratos de salud para Chile.
        </div>
      </footer>
    </div>
  )
}
