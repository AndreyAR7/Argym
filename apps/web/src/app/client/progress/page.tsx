import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { TrendingUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Mi Progreso' }

export default async function ClientProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Try to fetch progress logs — table may not exist, handle gracefully
  const { data: logs } = await supabase
    .from('progress_logs')
    .select('id, logged_at, weight_kg, body_fat_pct, notes, measurements')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Mi Progreso"
        subtitle="Registro de tu evolución física"
      />

      <div className="mt-6">
        {!logs || logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
              <TrendingUp size={20} className="text-[var(--color-border)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">Sin registros de progreso</p>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
              Tu coach registrará tu progreso en cada sesión.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log: any) => (
              <div key={log.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)]">{formatDate(log.logged_at)}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-4">
                  {log.weight_kg != null && (
                    <div>
                      <p className="text-xs text-[var(--color-muted-foreground)]">Peso</p>
                      <p className="text-lg font-bold text-[var(--color-foreground)]">{log.weight_kg} <span className="text-sm font-normal">kg</span></p>
                    </div>
                  )}
                  {log.body_fat_pct != null && (
                    <div>
                      <p className="text-xs text-[var(--color-muted-foreground)]">% Grasa</p>
                      <p className="text-lg font-bold text-[var(--color-foreground)]">{log.body_fat_pct}%</p>
                    </div>
                  )}
                </div>
                {log.notes && <p className="text-xs text-[var(--color-muted-foreground)] mt-2 italic">{log.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
