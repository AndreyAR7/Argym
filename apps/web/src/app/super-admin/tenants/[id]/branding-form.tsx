'use client'

import { useState } from 'react'
import { Upload, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateTenantBrandingAction } from './actions'

export function BrandingForm({
  tenantId,
  logoUrl,
  primaryColor,
}: {
  tenantId: string
  logoUrl: string | null
  primaryColor: string | null
}) {
  const [preview, setPreview] = useState(logoUrl)
  const [color, setColor] = useState(primaryColor ?? '#f97316')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSave() {
    setLoading(true)
    setMsg(null)

    let logoUrlToSave = logoUrl
    if (file) {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'png'
      const path = `${tenantId}/logo.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('tenant-logos')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        setLoading(false)
        setMsg({ type: 'err', text: uploadError.message })
        return
      }
      const { data } = supabase.storage.from('tenant-logos').getPublicUrl(path)
      logoUrlToSave = `${data.publicUrl}?v=${Date.now()}`
    }

    const result = await updateTenantBrandingAction(tenantId, {
      logoUrl: logoUrlToSave,
      primaryColor: color,
    })
    setLoading(false)
    setFile(null)
    setMsg(result.error
      ? { type: 'err', text: result.error }
      : { type: 'ok', text: 'Branding actualizado.' })
  }

  return (
    <div
      className="rounded-lg border p-5 mb-6 space-y-4"
      style={{ background: '#0d0d0d', borderColor: '#1f1f1f' }}
    >
      <h2 className="text-sm font-semibold" style={{ color: '#a3a3a3' }}>
        Branding (login/registro de este gimnasio)
      </h2>

      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ background: '#1a1a1a', border: '1px solid #262626' }}
        >
          {preview ? (
            <img src={preview} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs" style={{ color: '#525252' }}>Sin logo</span>
          )}
        </div>

        <label
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors"
          style={{ background: '#1a1a1a', color: '#e5e5e5', border: '1px solid #262626' }}
        >
          <Upload size={14} />
          Elegir imagen
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPickFile} />
        </label>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: '#737373' }}>Color de marca</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-9 h-9 rounded-md border cursor-pointer"
            style={{ borderColor: '#262626', background: 'transparent' }}
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="rounded-md border text-sm px-3 py-2 outline-none focus:border-blue-500 w-32"
            style={{ background: '#111111', borderColor: '#1f1f1f', color: '#e5e5e5' }}
          />
        </div>
      </div>

      {msg && (
        <p
          className="text-sm px-3 py-2 rounded-md"
          style={{
            background: msg.type === 'ok' ? '#14532d33' : '#7c2d1233',
            color:      msg.type === 'ok' ? '#22c55e'   : '#f97316',
          }}
        >
          {msg.text}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={loading}
        className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
        style={{ background: '#3b82f6', color: '#fff' }}
      >
        {loading ? 'Guardando…' : <><Check size={14} /> Guardar branding</>}
      </button>
    </div>
  )
}
