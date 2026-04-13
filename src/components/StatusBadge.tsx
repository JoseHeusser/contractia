import { cn, statusLabel } from '@/lib/utils'
import { Loader2, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config: Record<
    string,
    { color: string; icon: React.ReactNode; spin?: boolean }
  > = {
    ready: {
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: <CheckCircle className="h-3.5 w-3.5" />,
    },
    needs_review: {
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
    error: {
      color: 'bg-red-50 text-red-700 border-red-200',
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
    uploaded: {
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
    ocr_processing: {
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
    ocr_done: {
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
    extracting: {
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
  }

  const cfg = config[status] ?? {
    color: 'bg-gray-50 text-gray-600 border-gray-200',
    icon: <Clock className="h-3.5 w-3.5" />,
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        cfg.color,
        className
      )}
    >
      {cfg.icon}
      {statusLabel(status)}
    </span>
  )
}
