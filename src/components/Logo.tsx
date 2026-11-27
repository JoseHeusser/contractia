import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  /** `full`: ícono + wordmark · `wordmark`: solo texto · `icon`: solo ícono */
  variant?: 'full' | 'wordmark' | 'icon'
  /** Usa `dark` sobre fondos índigo/oscuros (letras blancas, "o" dorada). */
  tone?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZES = {
  sm: { icon: 28, text: 'text-2xl', gap: 'gap-1.5' },
  md: { icon: 34, text: 'text-[1.75rem]', gap: 'gap-2' },
  lg: { icon: 44, text: 'text-4xl', gap: 'gap-2.5' },
  xl: { icon: 64, text: 'text-6xl', gap: 'gap-3' },
} as const

/**
 * Logo de Gotu: wordmark "gotu" en minúscula, redondeado y bold,
 * con la "o" en dorado y el resto en índigo.
 */
export function Logo({ variant = 'full', tone = 'light', size = 'md', className }: LogoProps) {
  const s = SIZES[size]
  const showIcon = variant !== 'wordmark'
  const showText = variant !== 'icon'

  return (
    <span
      role="img"
      aria-label="Gotu"
      className={cn('inline-flex items-center select-none', s.gap, className)}
    >
      {showIcon && (
        <Image
          src="/brand/gotu-icon-violet.png"
          alt=""
          aria-hidden
          width={s.icon}
          height={s.icon}
          className="flex-shrink-0 rounded-[28%] shadow-sm"
        />
      )}
      {showText && (
        <span
          aria-hidden
          className={cn(
            'font-display font-bold leading-none tracking-tight',
            s.text,
            tone === 'dark' ? 'text-white' : 'text-indigo'
          )}
        >
          g<span className="text-gold">o</span>tu
        </span>
      )}
    </span>
  )
}
