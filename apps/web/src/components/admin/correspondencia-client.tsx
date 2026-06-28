'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Zap, FileText, Plus, ToggleLeft, ToggleRight, Trash2, Edit3, Send, CheckCircle2, Eye, EyeOff, Server, FlaskConical, AlertCircle, Download, Loader2 } from 'lucide-react'
import { useConfirm } from '@/context/confirm-context'
import { useToast } from '@/context/toast-context'
import { createClient } from '@/lib/supabase/client'
import { testSmtpAction, seedDefaultTemplatesAction, seedDefaultRulesAction, updateTemplateAction, deleteTemplateAction } from '@/app/admin/correspondencia/actions'

// ── Types ──────────────────────────────────────────────────────
interface Rule {
  id: string; name: string; event_type: string; recipients: string
  delay_minutes: number; is_active: boolean; template_id: string | null
  email_templates: { name: string }[] | { name: string } | null
}
interface Template { id: string; name: string; subject: string; body_html: string; variables: string[]; created_at: string }
interface SmtpConfig {
  id?: string; host: string; port: number; username: string; password: string
  from_email: string; from_name: string; use_tls: boolean; is_active: boolean
}

const EVENT_LABELS: Record<string, string> = {
  'appointment.created':   'Cita creada',
  'appointment.confirmed': 'Cita confirmada',
  'appointment.cancelled': 'Cita cancelada',
  'appointment.reminder':  'Recordatorio de cita',
  'plan.purchased':        'Plan adquirido',
  'plan.expiring':         'Plan por vencer',
  'plan.expired':          'Plan vencido',
  'promotion.used':        'Promoción utilizada',
  'client.approved':       'Cliente aprobado',
  'client.welcome':        'Bienvenida al cliente',
}

const RECIPIENT_LABELS: Record<string, string> = {
  client:           'Solo cliente',
  coach:            'Solo coach',
  admin:            'Solo administrador',
  client_and_coach: 'Cliente y coach',
  all:              'Todos',
}

const EVENT_COLORS: Record<string, string> = {
  'appointment.created': 'var(--color-admin)',
  'appointment.confirmed': 'var(--color-coach)',
  'appointment.cancelled': 'var(--color-destructive)',
  'appointment.reminder': 'var(--color-client)',
  'plan.purchased': 'var(--color-coach)',
  'plan.expiring': '#f59e0b',
  'plan.expired': 'var(--color-destructive)',
  'promotion.used': '#8b5cf6',
  'client.approved': 'var(--color-coach)',
  'client.welcome': 'var(--color-admin)',
}

// ── Main Component ──────────────────────────────────────────────
export function CorrespondenciaClient({ rules: initialRules, templates: initialTemplates, smtpConfig: initialSmtp, tenantId }: {
  rules: Rule[]; templates: Template[]; smtpConfig: SmtpConfig | null; tenantId: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'rules' | 'templates' | 'smtp'>('rules')
  const [rules, setRules]         = useState<Rule[]>(initialRules)
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [smtp, setSmtp]       = useState<SmtpConfig>(initialSmtp ?? {
    host: '', port: 587, username: '', password: '',
    from_email: '', from_name: '', use_tls: true, is_active: false,
  })

  const [showRuleModal,     setShowRuleModal]     = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate,   setEditingTemplate]   = useState<Template | null>(null)
  const [smtpSaved,         setSmtpSaved]         = useState(false)
  const [showPassword,      setShowPassword]      = useState(false)
  const [seedStatus,        setSeedStatus]        = useState<string | null>(null)
  const [rulesSeedStatus,   setRulesSeedStatus]   = useState<string | null>(null)
  const [isPending,         startTransition]      = useTransition()
  const { confirm } = useConfirm()
  const { showToast } = useToast()

  const supabase = createClient()

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-input)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  async function handleSeedTemplates() {
    setSeedStatus('loading')
    startTransition(async () => {
      const res = await seedDefaultTemplatesAction()
      if (res.error) {
        setSeedStatus(`Error: ${res.error}`)
      } else {
        setSeedStatus(`✓ ${res.inserted} plantillas actualizadas`)
        router.refresh()
      }
      setTimeout(() => setSeedStatus(null), 5000)
    })
  }

  async function handleSeedRules() {
    setRulesSeedStatus('loading')
    startTransition(async () => {
      const res = await seedDefaultRulesAction()
      if (res.error) {
        setRulesSeedStatus(`Error: ${res.error}`)
      } else if (res.created === 0 && res.skipped > 0) {
        setRulesSeedStatus(`✓ Todas las reglas ya existen (${res.skipped} existentes)`)
        router.refresh()
      } else {
        setRulesSeedStatus(`✓ ${res.created} reglas creadas${res.skipped ? `, ${res.skipped} ya existían` : ''}`)
        router.refresh()
      }
      setTimeout(() => setRulesSeedStatus(null), 5000)
    })
  }

  async function handleDeleteTemplate(id: string) {
    const ok = await confirm({
      title: 'Eliminar plantilla',
      message: '¿Eliminar esta plantilla? Las reglas que la usan quedarán sin plantilla.',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return
    const res = await deleteTemplateAction(id)
    if (!res.error) {
      setTemplates(prev => prev.filter(t => t.id !== id))
      showToast('success', 'Plantilla eliminada')
    } else {
      showToast('error', res.error)
    }
  }

  async function toggleRule(id: string, current: boolean) {
    const { error } = await supabase.from('communication_rules').update({ is_active: !current }).eq('id', id)
    if (!error) setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !current } : r))
  }

  async function deleteRule(id: string) {
    const ok = await confirm({
      title: 'Eliminar regla',
      message: '¿Eliminar esta regla de automatización?',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return
    const { error } = await supabase.from('communication_rules').delete().eq('id', id)
    if (!error) {
      setRules(prev => prev.filter(r => r.id !== id))
      showToast('success', 'Regla eliminada')
    } else {
      showToast('error', 'No se pudo eliminar la regla')
    }
  }

  async function saveSmtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      tenant_id:  tenantId,
      host:       fd.get('host') as string,
      port:       parseInt(fd.get('port') as string) || 587,
      username:   fd.get('username') as string,
      password:   (fd.get('password') as string) || smtp.password,
      from_email: fd.get('from_email') as string,
      from_name:  fd.get('from_name') as string,
      use_tls:    fd.get('use_tls') === 'true',
      is_active:  true,
    }

    startTransition(async () => {
      let error
      if (smtp.id) {
        ;({ error } = await supabase.from('smtp_configs').update(payload).eq('id', smtp.id))
      } else {
        const res = await supabase.from('smtp_configs').insert(payload).select().single()
        error = res.error
        if (!error && res.data) setSmtp({ ...payload, id: res.data.id })
      }
      if (!error) { setSmtpSaved(true); setTimeout(() => setSmtpSaved(false), 3000) }
    })
  }

  const tabs = [
    { id: 'rules'     as const, label: 'Reglas',    Icon: Zap      },
    { id: 'templates' as const, label: 'Plantillas', Icon: FileText },
    { id: 'smtp'      as const, label: 'SMTP',       Icon: Server   },
  ]

  return (
    <div className="mt-6">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit mb-6" style={{ backgroundColor: 'var(--color-muted)' }}>
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === id
              ? { backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }
              : { color: 'var(--color-muted-foreground)' }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── RULES TAB ─────────────────────────────────────────── */}
      {tab === 'rules' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Las reglas envían emails automáticamente cuando ocurre un evento en el sistema.
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleSeedRules}
                disabled={isPending || rulesSeedStatus === 'loading'}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border disabled:opacity-60 transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)', backgroundColor: 'var(--color-muted)' }}
              >
                {rulesSeedStatus === 'loading'
                  ? <><Loader2 size={13} className="animate-spin" />Configurando…</>
                  : <><Zap size={13} />Configurar automáticamente</>
                }
              </button>
              <button onClick={() => setShowRuleModal(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shrink-0"
                style={{ backgroundColor: 'var(--color-admin)', color: 'white' }}>
                <Plus size={15} />Nueva regla
              </button>
            </div>
          </div>

          {rulesSeedStatus && rulesSeedStatus !== 'loading' && (
            <div className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: rulesSeedStatus.startsWith('Error')
                  ? 'color-mix(in srgb, var(--color-destructive) 8%, transparent)'
                  : 'color-mix(in srgb, var(--color-coach) 8%, transparent)',
                color: rulesSeedStatus.startsWith('Error') ? 'var(--color-destructive)' : 'var(--color-coach)',
                border: `1px solid ${rulesSeedStatus.startsWith('Error') ? 'color-mix(in srgb, var(--color-destructive) 25%, transparent)' : 'color-mix(in srgb, var(--color-coach) 25%, transparent)'}`,
              }}>
              {rulesSeedStatus}
            </div>
          )}

          {rules.length === 0 ? (
            <EmptyState
              Icon={Zap}
              title="Sin reglas configuradas"
              desc='Haz clic en "Configurar automáticamente" para crear las reglas predeterminadas, o crea una manualmente.'
              action="Configurar automáticamente"
              onAction={handleSeedRules}
            />
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ backgroundColor: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>
                    {['Regla', 'Evento', 'Plantilla', 'Destinatarios', 'Estado', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--color-muted-foreground)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  {rules.map(rule => (
                    <tr key={rule.id} className="hover:bg-[var(--color-muted)] transition-colors">
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-foreground)' }}>{rule.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `color-mix(in srgb, ${EVENT_COLORS[rule.event_type] ?? 'var(--color-admin)'} 12%, transparent)`, color: EVENT_COLORS[rule.event_type] ?? 'var(--color-admin)' }}>
                          {EVENT_LABELS[rule.event_type] ?? rule.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        {(Array.isArray(rule.email_templates) ? rule.email_templates[0]?.name : rule.email_templates?.name) ?? <span className="italic">Sin plantilla</span>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        {RECIPIENT_LABELS[rule.recipients] ?? rule.recipients}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleRule(rule.id, rule.is_active)}
                          className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                          style={{ color: rule.is_active ? 'var(--color-coach)' : 'var(--color-muted-foreground)' }}>
                          {rule.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          {rule.is_active ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded-md hover:bg-[var(--color-destructive)]/10 transition-colors"
                          style={{ color: 'var(--color-destructive)' }}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TEMPLATES TAB ─────────────────────────────────────── */}
      {tab === 'templates' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Diseña los emails enviados por las reglas. Usa {'{{variable}}'} para campos dinámicos.
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleSeedTemplates}
                disabled={isPending || seedStatus === 'loading'}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border disabled:opacity-60 transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)', backgroundColor: 'var(--color-muted)' }}
              >
                {seedStatus === 'loading'
                  ? <><Loader2 size={13} className="animate-spin" />Importando…</>
                  : <><Download size={13} />Importar predeterminadas</>
                }
              </button>
              <button onClick={() => setShowTemplateModal(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: 'var(--color-admin)', color: 'white' }}>
                <Plus size={15} />Nueva
              </button>
            </div>
          </div>

          {seedStatus && seedStatus !== 'loading' && (
            <div className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: seedStatus.startsWith('Error')
                  ? 'color-mix(in srgb, var(--color-destructive) 8%, transparent)'
                  : 'color-mix(in srgb, var(--color-coach) 8%, transparent)',
                color: seedStatus.startsWith('Error') ? 'var(--color-destructive)' : 'var(--color-coach)',
                border: `1px solid ${seedStatus.startsWith('Error') ? 'color-mix(in srgb, var(--color-destructive) 25%, transparent)' : 'color-mix(in srgb, var(--color-coach) 25%, transparent)'}`,
              }}>
              {seedStatus}
            </div>
          )}

          {templates.length === 0 ? (
            <EmptyState
              Icon={FileText}
              title="Sin plantillas"
              desc="Importa las plantillas predeterminadas o crea una nueva desde cero."
              action="Nueva plantilla"
              onAction={() => setShowTemplateModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map(t => (
                <div key={t.id} className="rounded-xl border p-4 hover:shadow-sm transition-shadow"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{t.name}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-muted-foreground)' }}>{t.subject}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setEditingTemplate(t)}
                        className="p-1.5 rounded hover:bg-[var(--color-muted)] transition-colors"
                        style={{ color: 'var(--color-muted-foreground)' }}>
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="p-1.5 rounded hover:bg-[var(--color-destructive)]/10 transition-colors"
                        style={{ color: 'var(--color-destructive)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {t.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {t.variables.map(v => (
                        <code key={v} className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                          {`{{${v}}}`}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SMTP TAB ──────────────────────────────────────────── */}
      {tab === 'smtp' && (
        <div className="max-w-xl">
          <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-5">
              <Server size={16} style={{ color: 'var(--color-admin)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Configuración SMTP</h2>
            </div>

            <form onSubmit={saveSmtp} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Servidor (host)</label>
                  <input name="host" type="text" required defaultValue={smtp.host}
                    placeholder="smtp.gmail.com" className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Puerto</label>
                  <input name="port" type="number" required defaultValue={smtp.port}
                    placeholder="587" className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Usuario</label>
                <input name="username" type="text" required defaultValue={smtp.username}
                  placeholder="correo@empresa.com" className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
                  Contraseña {smtp.password && <span className="font-normal">(dejar vacío para no cambiar)</span>}
                </label>
                <div className="relative">
                  <input name="password" type={showPassword ? 'text' : 'password'} defaultValue=""
                    placeholder={smtp.password ? '••••••••' : 'App password o contraseña SMTP'}
                    className="w-full rounded-lg px-3 py-2 pr-10 text-sm outline-none" style={inputStyle} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Nombre del remitente</label>
                  <input name="from_name" type="text" required defaultValue={smtp.from_name}
                    placeholder="ARGYM" className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Email del remitente</label>
                  <input name="from_email" type="email" required defaultValue={smtp.from_email}
                    placeholder="noreply@argym.app" className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                </div>
              </div>

              <div className="flex items-center gap-3 py-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Usar TLS/STARTTLS</label>
                <select name="use_tls" defaultValue={smtp.use_tls ? 'true' : 'false'}
                  className="rounded-lg px-3 py-1.5 text-sm outline-none" style={inputStyle}>
                  <option value="true">Sí (recomendado)</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={isPending}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-admin)', color: 'white' }}>
                  {isPending ? 'Guardando…' : <><Send size={13} />Guardar configuración</>}
                </button>
                {smtpSaved && (
                  <span className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--color-coach)' }}>
                    <CheckCircle2 size={14} />Guardado
                  </span>
                )}
              </div>
            </form>
          </div>

          <div className="mt-4 rounded-xl border px-4 py-3 text-sm"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-admin) 6%, transparent)', borderColor: 'color-mix(in srgb, var(--color-admin) 20%, transparent)', color: 'var(--color-muted-foreground)' }}>
            <strong style={{ color: 'var(--color-foreground)' }}>Nota:</strong> El envío de emails se activará automáticamente cuando configures el SMTP y crees reglas activas. Recomendamos Gmail App Passwords o SendGrid para mayor confiabilidad.
          </div>

          <SmtpTester />
        </div>
      )}

      {/* ── Rule modal ────────────────────────────────────────── */}
      {showRuleModal && (
        <RuleModal
          templates={templates}
          tenantId={tenantId}
          onClose={() => setShowRuleModal(false)}
          onSaved={(r) => { setRules(prev => [r as Rule, ...prev]); setShowRuleModal(false) }}
        />
      )}

      {/* ── Template modal ────────────────────────────────────── */}
      {showTemplateModal && (
        <TemplateModal
          tenantId={tenantId}
          onClose={() => setShowTemplateModal(false)}
          onSaved={(t) => { setTemplates(prev => [t, ...prev]); setShowTemplateModal(false) }}
        />
      )}

      {/* ── Template edit modal ───────────────────────────────── */}
      {editingTemplate && (
        <TemplateEditModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={(updated) => {
            setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
            setEditingTemplate(null)
          }}
        />
      )}
    </div>
  )
}

// ── Empty State ─────────────────────────────────────────────────
function EmptyState({ Icon, title, desc, action, onAction }: {
  Icon: React.ElementType; title: string; desc: string; action: string; onAction: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-xl border"
      style={{ borderColor: 'var(--color-border)', borderStyle: 'dashed' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-muted)' }}>
        <Icon size={20} style={{ color: 'var(--color-muted-foreground)' }} />
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{title}</p>
        <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--color-muted-foreground)' }}>{desc}</p>
      </div>
      <button onClick={onAction} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
        style={{ backgroundColor: 'var(--color-admin)', color: 'white' }}>
        <Plus size={14} />{action}
      </button>
    </div>
  )
}

// ── Rule Modal ──────────────────────────────────────────────────
function RuleModal({ templates, tenantId, onClose, onSaved }: {
  templates: Template[]; tenantId: string; onClose: () => void; onSaved: (rule: Partial<Rule>) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      tenant_id:     tenantId,
      name:          fd.get('name') as string,
      event_type:    fd.get('event_type') as string,
      template_id:   (fd.get('template_id') as string) || null,
      recipients:    fd.get('recipients') as string,
      delay_minutes: parseInt(fd.get('delay_minutes') as string) || 0,
      is_active:     true,
    }

    startTransition(async () => {
      const { data, error } = await supabase.from('communication_rules').insert(payload).select(`*, email_templates(name)`).single()
      if (error) { setError(error.message) }
      else        { onSaved(data) }
    })
  }

  const inputStyle: React.CSSProperties = { backgroundColor: 'var(--color-input)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>Nueva regla</h2>
          <button onClick={onClose} style={{ color: 'var(--color-muted-foreground)' }}><Mail size={16} className="rotate-45 opacity-50" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <Field label="Nombre de la regla" required>
            <input name="name" required placeholder="Ej. Confirmar cita al cliente" className="rounded-lg px-3 py-2 text-sm outline-none w-full" style={inputStyle} />
          </Field>
          <Field label="Evento que dispara el envío" required>
            <select name="event_type" required className="rounded-lg px-3 py-2 text-sm outline-none w-full" style={inputStyle} defaultValue="">
              <option value="" disabled>Seleccionar evento…</option>
              {Object.entries(EVENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Plantilla de email">
            <select name="template_id" className="rounded-lg px-3 py-2 text-sm outline-none w-full" style={inputStyle} defaultValue="">
              <option value="">Sin plantilla (solo registro)</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Destinatarios" required>
            <select name="recipients" required className="rounded-lg px-3 py-2 text-sm outline-none w-full" style={inputStyle} defaultValue="client">
              {Object.entries(RECIPIENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Retraso (minutos, 0 = inmediato)">
            <input name="delay_minutes" type="number" min="0" max="10080" defaultValue={0}
              className="rounded-lg px-3 py-2 text-sm outline-none w-full" style={inputStyle} />
          </Field>
          {error && <p className="text-sm rounded-lg px-3 py-2" style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)', color: 'var(--color-destructive)' }}>{error}</p>}
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>Cancelar</button>
            <button type="submit" disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60" style={{ backgroundColor: 'var(--color-admin)', color: 'white' }}>
              {isPending ? 'Guardando…' : 'Crear regla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Template Modal ──────────────────────────────────────────────
function TemplateModal({ tenantId, onClose, onSaved }: { tenantId: string; onClose: () => void; onSaved: (t: Template) => void }) {
  const [isPending, startTransition] = useTransition()
  const [variables, setVariables] = useState<string[]>([])
  const [error, setError] = useState('')
  const supabase = createClient()

  const VARS = ['client_name', 'coach_name', 'appointment_date', 'appointment_time', 'plan_name', 'gym_name', 'login_url']

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = { tenant_id: tenantId, name: fd.get('name') as string, subject: fd.get('subject') as string, body_html: fd.get('body_html') as string, variables }

    startTransition(async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert(payload)
        .select('id, name, subject, body_html, variables, created_at')
        .single()
      if (error) { setError(error.message) } else { onSaved(data as Template) }
    })
  }

  const inputStyle: React.CSSProperties = { backgroundColor: 'var(--color-input)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[92vh]"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>Nueva plantilla</h2>
          <button onClick={onClose} style={{ color: 'var(--color-muted-foreground)' }}><Mail size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre interno" required>
                <input name="name" required placeholder="Ej. Confirmación de cita" className="rounded-lg px-3 py-2 text-sm outline-none w-full" style={inputStyle} />
              </Field>
              <Field label="Asunto del email" required>
                <input name="subject" required placeholder="Tu cita ha sido confirmada" className="rounded-lg px-3 py-2 text-sm outline-none w-full" style={inputStyle} />
              </Field>
            </div>

            <Field label="Variables disponibles">
              <div className="flex flex-wrap gap-1.5">
                {VARS.map(v => (
                  <button key={v} type="button"
                    onClick={() => setVariables(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
                    className="text-[10px] px-2 py-1 rounded-full font-medium transition-colors"
                    style={variables.includes(v)
                      ? { backgroundColor: 'var(--color-admin)', color: 'white' }
                      : { backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                Selecciona las variables que usarás en el cuerpo del email.
              </p>
            </Field>

            <Field label="Cuerpo del email (HTML permitido)" required>
              <textarea name="body_html" required rows={16}
                placeholder={`Hola {{client_name}},\n\nTu cita ha sido confirmada para el {{appointment_date}} a las {{appointment_time}}.\n\nSaludos,\n{{gym_name}}`}
                className="rounded-lg px-3 py-2 text-sm outline-none resize-y font-mono w-full" style={inputStyle} />
            </Field>

            {error && <p className="text-sm rounded-lg px-3 py-2" style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)', color: 'var(--color-destructive)' }}>{error}</p>}
          </div>
          <div className="px-6 py-4 border-t flex justify-end gap-3 flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>Cancelar</button>
            <button type="submit" disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60" style={{ backgroundColor: 'var(--color-admin)', color: 'white' }}>
              {isPending ? 'Guardando…' : 'Crear plantilla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── SMTP Tester ─────────────────────────────────────────────────
function SmtpTester() {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [isPending, start]  = useTransition()

  function handleTest() {
    if (!email) return
    setStatus(null)
    start(async () => {
      const result = await testSmtpAction(email)
      setStatus(result)
    })
  }

  return (
    <div className="mt-6 rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ backgroundColor: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>
        <FlaskConical size={14} style={{ color: 'var(--color-admin)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Probar conexión SMTP</span>
      </div>

      <div className="px-5 py-4" style={{ backgroundColor: 'var(--color-card)' }}>
        <p className="text-xs mb-3" style={{ color: 'var(--color-muted-foreground)' }}>
          Ingresa un correo destino y envía un email de prueba para verificar que la configuración SMTP funciona correctamente.
        </p>

        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="destinatario@ejemplo.com"
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: 'var(--color-input)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
            onKeyDown={e => e.key === 'Enter' && handleTest()}
          />
          <button
            onClick={handleTest}
            disabled={isPending || !email}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 shrink-0"
            style={{ backgroundColor: 'var(--color-admin)', color: 'white' }}
          >
            {isPending
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enviando…</>
              : <><Send size={13} />Enviar prueba</>
            }
          </button>
        </div>

        {status && (
          <div className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
            style={{
              backgroundColor: status.ok
                ? 'color-mix(in srgb, var(--color-coach) 10%, transparent)'
                : 'color-mix(in srgb, var(--color-destructive) 10%, transparent)',
              color: status.ok ? 'var(--color-coach)' : 'var(--color-destructive)',
              border: `1px solid ${status.ok ? 'color-mix(in srgb, var(--color-coach) 25%, transparent)' : 'color-mix(in srgb, var(--color-destructive) 25%, transparent)'}`,
            }}>
            {status.ok
              ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              : <AlertCircle  size={15} className="shrink-0 mt-0.5" />
            }
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Template Edit Modal ─────────────────────────────────────────
function TemplateEditModal({ template, onClose, onSaved }: {
  template: Template; onClose: () => void; onSaved: (t: Template) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [variables, setVariables]    = useState<string[]>(template.variables)
  const [error, setError]            = useState('')

  const VARS = ['client_name', 'coach_name', 'appointment_date', 'appointment_time', 'plan_name', 'gym_name', 'login_url']

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      name:      fd.get('name') as string,
      subject:   fd.get('subject') as string,
      body_html: fd.get('body_html') as string,
      variables,
    }
    startTransition(async () => {
      const res = await updateTemplateAction(template.id, payload)
      if (res.error) { setError(res.error) }
      else           { onSaved({ ...template, ...payload }) }
    })
  }

  const inputStyle: React.CSSProperties = { backgroundColor: 'var(--color-input)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[92vh]"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>Editar plantilla</h2>
          <button onClick={onClose} style={{ color: 'var(--color-muted-foreground)' }}><Mail size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre interno" required>
                <input name="name" required defaultValue={template.name}
                  className="rounded-lg px-3 py-2 text-sm outline-none w-full" style={inputStyle} />
              </Field>
              <Field label="Asunto del email" required>
                <input name="subject" required defaultValue={template.subject}
                  className="rounded-lg px-3 py-2 text-sm outline-none w-full" style={inputStyle} />
              </Field>
            </div>
            <Field label="Variables disponibles">
              <div className="flex flex-wrap gap-1.5">
                {VARS.map(v => (
                  <button key={v} type="button"
                    onClick={() => setVariables(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
                    className="text-[10px] px-2 py-1 rounded-full font-medium transition-colors"
                    style={variables.includes(v)
                      ? { backgroundColor: 'var(--color-admin)', color: 'white' }
                      : { backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Cuerpo del email (HTML permitido)" required>
              <textarea name="body_html" required rows={16} defaultValue={template.body_html}
                key={template.id}
                className="rounded-lg px-3 py-2 text-sm outline-none resize-y font-mono w-full" style={inputStyle} />
            </Field>
            {error && <p className="text-sm rounded-lg px-3 py-2" style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)', color: 'var(--color-destructive)' }}>{error}</p>}
          </div>
          <div className="px-6 py-4 border-t flex justify-end gap-3 flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>Cancelar</button>
            <button type="submit" disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60" style={{ backgroundColor: 'var(--color-admin)', color: 'white' }}>
              {isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
        {label}{required && <span style={{ color: 'var(--color-admin)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}
