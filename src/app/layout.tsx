import type { Metadata, Viewport } from 'next'
import { Fredoka, Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

// Tipografía redondeada y bold para el wordmark "gotu" y los títulos.
const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
})

export const metadata: Metadata = {
  title: {
    default: 'Gotu — Pregunta. Entiende. Decide.',
    template: '%s · Gotu',
  },
  description:
    'Pregunta. Entiende. Decide. Sube tu contrato de salud y Gotu te lo explica en simple: coberturas, copagos y alertas, con respuestas que citan tu contrato.',
  applicationName: 'Gotu',
}

export const viewport: Viewport = {
  themeColor: '#2A1B78',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-CL" className={`${inter.variable} ${fredoka.variable} h-full`}>
      <body className="min-h-full bg-surface text-ink antialiased">{children}</body>
    </html>
  )
}
