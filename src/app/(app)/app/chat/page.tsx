'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Plus, MessageCircle, Loader2 } from 'lucide-react'
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

  return (
    <div className="flex h-full">
      {/* Thread sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-100 bg-white">
        <div className="p-3 border-b border-gray-100">
          <button
            onClick={() => { setActiveThread(null); setMessages([]) }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva conversación
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {threads.map(thread => (
            <button
              key={thread.id}
              onClick={() => loadThread(thread.id)}
              className={cn(
                'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors',
                activeThread === thread.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <p className="truncate">{thread.title}</p>
            </button>
          ))}
          {threads.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">Sin conversaciones aún</p>
          )}
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Contract selector */}
        {contracts.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-100 bg-white flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Contratos:</span>
            {contracts.map(c => (
              <button
                key={c.id}
                onClick={() => toggleContract(c.id)}
                className={cn(
                  'text-xs rounded-full border px-2.5 py-0.5 transition-colors',
                  selectedContracts.includes(c.id)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                )}
              >
                {c.contract_display_name}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeThread && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 mb-4">
                <MessageCircle className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Asistente ContractIA</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Haz una pregunta sobre tus contratos. Selecciona uno o más contratos arriba para enfocar la conversación.
              </p>
            </div>
          )}

          {loadingMessages && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
              )}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      code: ({ children }) => <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                      h3: ({ children }) => <h3 className="font-semibold mt-2 mb-1">{children}</h3>,
                      h4: ({ children }) => <h4 className="font-medium mt-2 mb-1">{children}</h4>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 bg-white p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Escribe tu pregunta sobre el contrato..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all max-h-32 overflow-y-auto"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Enter para enviar, Shift+Enter para nueva línea</p>
        </div>
      </div>
    </div>
  )
}
