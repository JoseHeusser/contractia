import Image from 'next/image'
import { cn } from '@/lib/utils'

interface MascotProps {
  /** Alto en px; el ancho se calcula con la proporción original (769×1097). */
  height?: number
  /** Si la mascota es puramente decorativa, se oculta a lectores de pantalla. */
  decorative?: boolean
  preload?: boolean
  className?: string
}

const RATIO = 769 / 1097

/** Mascota de Gotu: el signo de interrogación pensativo. */
export function Mascot({ height = 160, decorative = true, preload = false, className }: MascotProps) {
  const width = Math.round(height * RATIO)
  return (
    <Image
      src="/brand/gotu-mascot.png"
      alt={decorative ? '' : 'Gotu, la mascota: un signo de interrogación pensativo'}
      aria-hidden={decorative || undefined}
      width={width}
      height={height}
      preload={preload}
      className={cn('h-auto max-w-full select-none', className)}
    />
  )
}

/** Avatar circular del asistente (ícono de la app) para el chat. */
export function AssistantAvatar({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/gotu-icon-violet.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={cn('flex-shrink-0 rounded-[28%] shadow-sm', className)}
    />
  )
}

/** Estrellita dorada de la marca (marca citas y destacados). */
export function Spark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('inline-block h-3.5 w-3.5 fill-gold', className)}
    >
      <path d="M12 1.5c.9 5.6 3 7.7 8.6 8.6a1.9 1.9 0 0 1 0 3.8c-5.6.9-7.7 3-8.6 8.6-.9-5.6-3-7.7-8.6-8.6a1.9 1.9 0 0 1 0-3.8c5.6-.9 7.7-3 8.6-8.6Z" />
    </svg>
  )
}
