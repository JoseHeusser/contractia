'use client'

import { useState, useRef, useEffect } from 'react'
import { Quote, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EvidencePopoverProps {
  snippet: string
  page?: number | null
  section?: string | null
  fieldKey?: string
  children: React.ReactNode
  className?: string
}

export function EvidencePopover({ snippet, page, section, children, className }: EvidencePopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
        title="Ver evidencia en el contrato"
      >
        {children}
        <Quote className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-80 rounded-xl border border-blue-100 bg-white shadow-lg shadow-blue-900/10">
          <div className="p-3 border-b border-gray-100 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-600">Evidencia del contrato</span>
            {page && (
              <span className="ml-auto text-xs text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">
                Pág. {page}
              </span>
            )}
          </div>
          <div className="p-3">
            {section && (
              <p className="text-xs font-medium text-gray-500 mb-1.5">{section}</p>
            )}
            <blockquote className="text-xs text-gray-700 leading-relaxed border-l-2 border-blue-300 pl-2.5 italic">
              &ldquo;{snippet}&rdquo;
            </blockquote>
          </div>
        </div>
      )}
    </div>
  )
}
