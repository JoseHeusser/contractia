'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2 } from 'lucide-react'

interface EditableContract {
  id: string
  contract_display_name: string
  provider_name: string | null
  policyholder_name: string | null
  monthly_cost: number | null
  monthly_cost_currency: string | null
  claims_phone: string | null
  claims_email: string | null
}

/**
 * Permite editar la información clave del contrato cuando el sistema no la
 * leyó bien o no aparece en el documento (obs. #24).
 */
export function EditContractButton({ contract }: { contract: EditableContract }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    contract_display_name: contract.contract_display_name ?? '',
    provider_name: contract.provider_name ?? '',
    policyholder_name: contract.policyholder_name ?? '',
    monthly_cost: contract.monthly_cost?.toString() ?? '',
    monthly_cost_currency: (contract.monthly_cost_currency ?? 'CLP').toUpperCase(),
    claims_phone: contract.claims_phone ?? '',
    claims_email: contract.claims_email ?? '',
  })

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.contract_display_name.trim()) {
      setError('El nombre no puede estar vacío.')
      return
    }
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/contracts/${contract.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        monthly_cost: form.monthly_cost === '' ? null : form.monthly_cost,
      }),
    })
    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Error al guardar.')
    }
    setSaving(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:border-blue-200 hover:text-blue-600 transition-colors"
      >
        <Pencil className="h-4 w-4" />
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="font-semibold text-gray-900">Editar contrato</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Nombre del contrato">
                <input value={form.contract_display_name} onChange={e => set('contract_display_name', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Proveedor / Aseguradora">
                <input value={form.provider_name} onChange={e => set('provider_name', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Titular del contrato">
                <input value={form.policyholder_name} onChange={e => set('policyholder_name', e.target.value)} className={inputCls} />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Field label="Costo mensual">
                    <input type="number" step="any" value={form.monthly_cost} onChange={e => set('monthly_cost', e.target.value)} className={inputCls} />
                  </Field>
                </div>
                <Field label="Moneda">
                  <select value={form.monthly_cost_currency} onChange={e => set('monthly_cost_currency', e.target.value)} className={inputCls}>
                    <option value="CLP">CLP ($)</option>
                    <option value="UF">UF</option>
                  </select>
                </Field>
              </div>
              <Field label="Teléfono del prestador">
                <input value={form.claims_phone} onChange={e => set('claims_phone', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Email del prestador">
                <input type="email" value={form.claims_email} onChange={e => set('claims_email', e.target.value)} className={inputCls} />
              </Field>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
