'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { Tables } from '@/types/database'

type Profile = Tables<'profiles'>

interface AdminUsersTableProps {
  profiles: Profile[]
}

export function AdminUsersTable({ profiles: initial }: AdminUsersTableProps) {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>(initial)
  const [editingLimit, setEditingLimit] = useState<string | null>(null)
  const [limitValue, setLimitValue] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  async function toggleActive(id: string, current: boolean) {
    setSaving(id)
    const { error } = await supabase.from('profiles').update({ is_active: !current }).eq('id', id)
    if (!error) setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p))
    setSaving(null)
  }

  async function changeRole(id: string, role: string) {
    setSaving(id)
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (!error) setProfiles(prev => prev.map(p => p.id === id ? { ...p, role } : p))
    setSaving(null)
  }

  async function saveLimit(id: string) {
    const num = parseInt(limitValue)
    if (isNaN(num) || num < 0) return
    setSaving(id)
    const { error } = await supabase.from('profiles').update({ contracts_limit: num }).eq('id', id)
    if (!error) setProfiles(prev => prev.map(p => p.id === id ? { ...p, contracts_limit: num } : p))
    setEditingLimit(null)
    setSaving(null)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs font-medium text-gray-500">
            <th className="px-5 py-3 text-left">Usuario</th>
            <th className="px-4 py-3 text-left">Rol</th>
            <th className="px-4 py-3 text-left">Plan</th>
            <th className="px-4 py-3 text-left">Límite</th>
            <th className="px-4 py-3 text-left">Estado</th>
            <th className="px-4 py-3 text-left">Registrado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {profiles.map((profile) => (
            <tr key={profile.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-3.5">
                <p className="font-medium text-gray-900">{profile.full_name ?? '—'}</p>
                <p className="text-xs text-gray-500">{profile.email}</p>
              </td>
              <td className="px-4 py-3.5">
                <select
                  value={profile.role}
                  onChange={e => changeRole(profile.id, e.target.value)}
                  disabled={saving === profile.id}
                  className="text-xs rounded-full border px-2 py-0.5 outline-none transition-colors bg-white border-gray-200"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td className="px-4 py-3.5">
                <span className="text-xs text-gray-600">{profile.plan}</span>
              </td>
              <td className="px-4 py-3.5">
                {editingLimit === profile.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={limitValue}
                      onChange={e => setLimitValue(e.target.value)}
                      className="w-16 text-xs border border-blue-300 rounded px-1.5 py-0.5 outline-none"
                      autoFocus
                    />
                    <button onClick={() => saveLimit(profile.id)} className="text-xs text-blue-600 hover:underline">OK</button>
                    <button onClick={() => setEditingLimit(null)} className="text-xs text-gray-400 hover:underline">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingLimit(profile.id); setLimitValue(String(profile.contracts_limit)) }}
                    className="text-xs text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {profile.contracts_limit}
                  </button>
                )}
              </td>
              <td className="px-4 py-3.5">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.is_active}
                    onChange={() => toggleActive(profile.id, profile.is_active)}
                    disabled={saving === profile.id}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
                </label>
              </td>
              <td className="px-4 py-3.5 text-xs text-gray-500">
                {formatDate(profile.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
