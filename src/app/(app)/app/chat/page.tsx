'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Plus, Loader2 } from 'lucide-react'
import { Mascot, AssistantAvatar, Spark } from '@/components/Mascot'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  role: string
  content: string
  created_at: string
}

interface Thread {
  id: string
  title: string
  updated_at: string
}

interface Contract {
  id: string
  contract_display_name: string
}

// Solo presentación: convierte las citas "[Extracto N]" / "[Norma N]" que escribe
// el asistente en un chip con la ✦ dorada de la marca (vía `code` de Markdown).
const CITATION_MARK = '✦'
function markCitations(markdown: string): string {
  return markdown.replace(
    /\[((?:Extracto|Norma)s?\s[^\]\n`]{1,60})\](?!\()/g,
    (_, label: string) => `\`${CITATION_MARK}${label}\``
  )
}

export default function ChatPage() {
  const supabase = createClient()
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [selectedContracts, setSelectedContracts] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: th }, { data: co }] = await Promise.all([
        supabase.from('chat_threads').select('id, title, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('contracts').select('id, contract_display_name').eq('user_id', user.id).in('status', ['ready', 'needs_review']),
      ])

      setThreads(th ?? [])
      setContracts(co ?? [])

      // Preseleccionar el contrato si se llegó desde "Consultar al asistente"
      const preselect = new URLSearchParams(window.location.search).get('contractId')
      if (preselect && (co ?? []).some(c => c.id === preselect)) {
        setSelectedContracts([preselect])
      }
    }
    load()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadThread(threadId: string) {
    setActiveThread(threadId)
    setLoadingMessages(true)
    const { data } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('thread_id', threadId)
      .order('created_at')
    setMessages(data ?? [])
    setLoadingMessages(false)
  }

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userMessage, created_at: new Date().toISOString() }])

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, threadId: activeThread, contractIds: selectedContracts }),
      })
      const data = await res.json()

      if (res.ok) {
        if (!activeThread) {
          setActiveThread(data.threadId)
          setThreads(prev => [{ id: data.threadId, title: userMessage.slice(0, 50), updated_at: new Date().toISOString() }, ...prev])
        }
        setMessages(prev => [
          ...prev.filter(m => m.id !== tempId),
          { id: `user-${Date.now()}`, role: 'user', content: userMessage, created_at: new Date().toISOString() },
          { id: data.messageId ?? `assistant-${Date.now()}`, role: 'assistant', content: data.content, created_at: new Date().toISOString() },
        ])
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setLoading(false)
    }
  }

  function toggleContract(id: string) {
    setSelectedContracts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const SUGGESTIONS = [
    '¿Qué cubre mi plan en una urgencia?',
    '¿Cuánto pago por una consulta médica?',
    '¿Tengo cobertura dental?',
  ]

  return (
    <div className="flex h-full">
      {/* Thread sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-line bg-white">
        <div className="p-3 border-b border-line">
          <button
            onClick={() => { setActiveThread(null); setMessages([]) }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-3 py-2.5 text-sm font-semibold text-indigo hover:border-violet hover:bg-lavender transition-colors"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nueva conversación
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {threads.map(thread => (
            <button
              key={thread.id}
              onClick={() => loadThread(thread.id)}
              aria-current={activeThread === thread.id ? 'true' : undefined}
              className={cn(
                'w-full text-left rounded-xl px-3 py-2 text-sm transition-colors',
                activeThread === thread.id ? 'bg-lavender text-indigo font-semibold' : 'text-ink-muted hover:bg-surface hover:text-indigo'
              )}
            >
              <p className="truncate">{thread.title}</p>
            </button>
          ))}
          {threads.length === 0 && (
            <p className="text-xs text-ink-muted text-center py-8">Aún no tienes conversaciones</p>
          )}
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface">
        {/* Contract selector */}
        {contracts.length > 0 && (
          <div className="px-4 py-2.5 border-b border-line bg-white flex items-center gap-2 flex-wrap">
            <span className="text-xs text-ink-muted font-medium">Pregunta sobre:</span>
            {contracts.map(c => (
              <button
                key={c.id}
                onClick={() => toggleContract(c.id)}
                aria-pressed={selectedContracts.includes(c.id)}
                className={cn(
                  'text-xs font-medium rounded-full border px-3 py-1 transition-colors',
                  selectedContracts.includes(c.id)
                    ? 'bg-indigo border-indigo text-white'
                    : 'bg-white border-line-strong text-ink-soft hover:border-violet hover:text-violet'
                )}
              >
                {c.contract_display_name}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
            {!activeThread && messages.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                <Mascot height={190} preload className="mb-4 w-28 sm:w-32" />
                <h1 className="text-2xl font-bold text-indigo">¿Qué quieres saber de tu contrato?</h1>
                <p className="mt-1 font-display text-base font-semibold text-violet">Pregunta. Entiende. Decide.</p>
                <p className="mt-3 max-w-sm text-sm text-ink-muted">
                  Escríbeme tu duda tal como la dirías. Te respondo en simple y te marco con{' '}
                  <Spark className="-mt-0.5" /> la parte del contrato de donde sale.
                  {contracts.length > 0 && ' Elige arriba uno o más contratos para enfocar la respuesta.'}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setInput(q)}
                      className="rounded-full border border-line-strong bg-white px-3.5 py-2 text-sm font-medium text-indigo transition-colors hover:border-violet hover:bg-lavender"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingMessages && (
              <div className="flex justify-center py-10" role="status" aria-label="Cargando conversación">
                <Loader2 className="h-6 w-6 animate-spin text-violet" aria-hidden />
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={cn('flex items-end gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role !== 'user' && <AssistantAvatar size={32} className="mb-0.5" />}
                <div className={cn(
                  'min-w-0 rounded-2xl px-4 py-3 text-sm leading-relaxed break-words',
                  msg.role === 'user'
                    ? 'max-w-[80%] bg-indigo text-white font-medium rounded-br-md whitespace-pre-wrap'
                    : 'max-w-[calc(100%-2.5rem)] sm:max-w-[85%] bg-lavender text-ink rounded-bl-md'
                )}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1 marker:text-violet">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1 marker:text-violet marker:font-semibold">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-indigo">{children}</strong>,
                        a: ({ children, href }) => <a href={href} className="font-medium text-violet underline underline-offset-2">{children}</a>,
                        // Las citas textuales del contrato llevan la ✦ dorada de la marca
                        blockquote: ({ children }) => (
                          <blockquote className="relative my-2 rounded-xl border border-lavender-deep bg-white/70 py-2 pl-8 pr-3 text-ink-soft">
                            <Spark className="absolute left-2.5 top-3" />
                            {children}
                          </blockquote>
                        ),
                        code: ({ children }) => {
                          const text = typeof children === 'string' ? children : ''
                          if (text.startsWith(CITATION_MARK)) {
                            return (
                              <span className="mx-0.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-lavender-deep bg-white px-2 py-0.5 align-baseline text-xs font-semibold text-indigo">
                                <Spark className="h-3 w-3" />
                                {text.slice(CITATION_MARK.length)}
                              </span>
                            )
                          }
                          return <code className="bg-white/80 text-indigo rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                        },
                        h3: ({ children }) => <h3 className="font-semibold text-indigo mt-2 mb-1">{children}</h3>,
                        h4: ({ children }) => <h4 className="font-medium text-indigo mt-2 mb-1">{children}</h4>,
                        // Tablas legibles, no comprimidas (obs. #17)
                        table: ({ children }) => (
                          <div className="my-2 overflow-x-auto rounded-lg border border-lavender-deep bg-white">
                            <table className="w-full border-collapse text-xs">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-surface">{children}</thead>,
                        th: ({ children }) => <th className="border-b border-line-strong px-3 py-2 text-left font-semibold text-indigo whitespace-nowrap">{children}</th>,
                        td: ({ children }) => <td className="border-b border-line px-3 py-2 align-top text-ink-soft">{children}</td>,
                        tr: ({ children }) => <tr>{children}</tr>,
                      }}
                    >
                      {markCitations(msg.content)}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-end gap-2 justify-start" role="status" aria-label="Gotu está escribiendo">
                <AssistantAvatar size={32} className="mb-0.5" />
                <div className="bg-lavender rounded-2xl rounded-bl-md px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-violet animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-line bg-white p-3 sm:p-4">
          <div className="mx-auto w-full max-w-3xl">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Pregúntale a Gotu sobre tu contrato…"
                aria-label="Tu pregunta"
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-line-strong bg-white px-4 py-2.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-violet focus:ring-2 focus:ring-violet/30 transition-all max-h-32 overflow-y-auto"
                style={{ minHeight: '44px' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                aria-label="Enviar pregunta"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-indigo text-white hover:bg-violet disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="text-xs text-ink-muted mt-1.5 hidden sm:block">Enter para enviar, Shift+Enter para nueva línea</p>
          </div>
        </div>
      </div>
    </div>
  )
}
