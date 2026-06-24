'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { Check, X, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { approveUserAction, rejectUserAction } from '@/lib/admin/actions'

type Role = 'client' | 'coach' | 'admin'

interface ApprovalRowProps {
  userId: string
  fullName: string
  avatarUrl: string | null
  approvalStatus: string
  rejectionReason: string | null
  createdAt: string
  currentAdminId: string
}

const ROLE_LABELS: Record<Role, string> = {
  client: 'Cliente',
  coach:  'Coach',
  admin:  'Admin',
}

export function ApprovalRow({
  userId,
  fullName,
  avatarUrl,
  approvalStatus,
  rejectionReason,
  createdAt,
}: ApprovalRowProps) {
  const [role, setRole] = useState<Role>('client')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [doneAction, setDoneAction] = useState<'approved' | 'rejected' | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const result = await approveUserAction(userId, role)
      if (result?.error) {
        setError(result.error)
      } else {
        setDone(true)
        setDoneAction('approved')
      }
    })
  }

  function handleReject() {
    setError(null)
    startTransition(async () => {
      const result = await rejectUserAction(userId, rejectReason)
      if (result?.error) {
        setError(result.error)
      } else {
        setDone(true)
        setDoneAction('rejected')
        setShowRejectForm(false)
      }
    })
  }

  // After action — show result inline
  if (done && doneAction) {
    return (
      <div className="flex items-center gap-4 px-5 py-4 bg-[var(--color-card)] opacity-60">
        <Avatar name={fullName} src={avatarUrl} size="sm" />
        <p className="text-sm text-[var(--color-muted-foreground)] flex-1">{fullName}</p>
        <Badge value={doneAction} />
      </div>
    )
  }

  if (approvalStatus === 'approved' || approvalStatus === 'rejected') {
    return (
      <div className="flex items-center gap-4 px-5 py-4 bg-[var(--color-card)]">
        <Avatar name={fullName} src={avatarUrl} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-foreground)] truncate">{fullName}</p>
          {rejectionReason && (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 truncate">
              Motivo: {rejectionReason}
            </p>
          )}
        </div>
        <div className="text-xs text-[var(--color-muted-foreground)] hidden sm:block flex-shrink-0">
          {daysSince(createdAt)}
        </div>
        <Badge value={approvalStatus} />
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-card)] hover:bg-[var(--color-muted)]/40 transition-colors">
      <div className="flex items-center gap-4 px-5 py-4">
        <Avatar name={fullName} src={avatarUrl} size="md" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-foreground)] truncate">{fullName}</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            Solicitó hace {daysSince(createdAt)}
          </p>
        </div>

        {/* Role selector */}
        <div className="relative hidden sm:block">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={isPending}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] cursor-pointer transition-colors disabled:opacity-50"
          >
            {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] pointer-events-none" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleApprove}
            disabled={isPending}
            title="Aprobar"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            <Check size={13} />
            <span className="hidden sm:inline">Aprobar</span>
          </button>
          <button
            onClick={() => setShowRejectForm(!showRejectForm)}
            disabled={isPending}
            title="Rechazar"
            className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <X size={13} />
            <span className="hidden sm:inline">Rechazar</span>
          </button>
        </div>
      </div>

      {/* Reject reason form */}
      {showRejectForm && (
        <div className="px-5 pb-4 pt-0">
          <div className="flex gap-2 items-start">
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo (opcional)"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-ring)] transition-all"
              onKeyDown={(e) => { if (e.key === 'Enter') handleReject() }}
            />
            <button
              onClick={handleReject}
              disabled={isPending}
              className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? '…' : 'Confirmar'}
            </button>
            <button
              onClick={() => setShowRejectForm(false)}
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="px-5 pb-3 text-xs text-[var(--color-destructive)]">{error}</p>
      )}
    </div>
  )
}

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 864e5)
  if (days === 0) return 'hoy'
  if (days === 1) return '1 día'
  return `${days} días`
}
