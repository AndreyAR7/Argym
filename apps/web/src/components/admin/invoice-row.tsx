'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, X } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { markInvoicePaidAction } from '@/lib/admin/actions'
import { formatDate, formatCurrency } from '@/lib/utils'

interface InvoiceRowProps {
  id: string
  invoiceNumber: string
  status: string
  amount: number
  currency: string
  description: string | null
  issueDate: string
  dueDate: string | null
  paidAt: string | null
  userName: string
  userAvatarUrl: string | null
  planName: string | null
}

export function InvoiceRow({
  id,
  invoiceNumber,
  status,
  amount,
  currency,
  description,
  issueDate,
  dueDate,
  paidAt,
  userName,
  userAvatarUrl,
  planName,
}: InvoiceRowProps) {
  const [showPayForm, setShowPayForm] = useState(false)
  const [notes, setNotes] = useState('')
  const [currentStatus, setCurrentStatus] = useState(status)
  const [isPending, startTransition] = useTransition()

  function handleMarkPaid() {
    startTransition(async () => {
      const result = await markInvoicePaidAction(id, notes)
      if (!result?.error) {
        setCurrentStatus('paid')
        setShowPayForm(false)
      }
    })
  }

  const canMarkPaid = currentStatus === 'pending' || currentStatus === 'overdue'

  return (
    <tr className="hover:bg-[var(--color-muted)] transition-colors">
      {/* Invoice # */}
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-[var(--color-foreground)] font-mono">
          {invoiceNumber}
        </p>
        <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
          {formatDate(issueDate)}
        </p>
      </td>

      {/* Client */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={userName} src={userAvatarUrl} size="sm" />
          <div>
            <p className="text-sm text-[var(--color-foreground)]">{userName}</p>
            {planName && (
              <p className="text-xs text-[var(--color-muted-foreground)]">{planName}</p>
            )}
          </div>
        </div>
      </td>

      {/* Amount */}
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-[var(--color-foreground)] tabular-nums">
          {formatCurrency(amount, currency)}
        </p>
        {description && (
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 max-w-[200px] truncate">
            {description}
          </p>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <Badge value={currentStatus} />
      </td>

      {/* Due / Paid date */}
      <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)] hidden lg:table-cell">
        {currentStatus === 'paid' && paidAt
          ? <span className="text-emerald-600">Pagado {formatDate(paidAt)}</span>
          : dueDate
          ? <span className={currentStatus === 'overdue' ? 'text-red-600 font-medium' : ''}>
              Vence {formatDate(dueDate)}
            </span>
          : '—'}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        {canMarkPaid && (
          <div className="flex items-center justify-end gap-2">
            {showPayForm ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Nota de pago (opcional)"
                  className="w-44 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-ring)]"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleMarkPaid() }}
                />
                <button
                  onClick={handleMarkPaid}
                  disabled={isPending}
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  title="Confirmar pago"
                >
                  <CheckCircle size={13} />
                </button>
                <button
                  onClick={() => setShowPayForm(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPayForm(true)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <CheckCircle size={12} />
                Marcar pagado
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}
