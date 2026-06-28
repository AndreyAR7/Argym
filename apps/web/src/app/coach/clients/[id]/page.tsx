import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { MeasurementsSummary } from '@/components/shared/measurements-summary'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Progreso del cliente' }

const LEVEL_LABELS: Record<string, string> = {
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
}

export default async function CoachClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: clientId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Verify this coach has at least one appointment with this client
  const { data: apt } = await supabase
    .from('appointments')
    .select('id')
    .eq('coach_id', user.id)
    .eq('client_id', clientId)
    .limit(1)
    .maybeSingle()

  if (!apt) notFound()

  const [profileResult, measurementsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, phone, client_level, is_active, approval_status, created_at')
      .eq('id', clientId)
      .single(),

    supabase
      .from('body_measurements')
      .select('measured_at, weight_kg, height_cm, body_fat_pct, waist_cm, abdomen_cm, hip_cm, arm_cm, thigh_cm, calf_cm, chest_cm, shoulder_cm, neck_cm')
      .eq('client_id', clientId)
      .order('measured_at', { ascending: false })
      .limit(12),
  ])

  const profile = profileResult.data
  if (!profile) notFound()

  const measurements = measurementsResult.data ?? []

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link
        href="/coach/clients"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Mis clientes
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Avatar
          name={profile.full_name ?? '?'}
          src={profile.avatar_url}
          size="lg"
          className="w-14 h-14 text-base flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <PageHeader
            title={profile.full_name ?? '—'}
            subtitle={`Miembro desde ${formatDate(profile.created_at)}`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Badge value={profile.is_active !== false ? 'active' : 'inactive'} showDot />
              {profile.client_level && (
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {LEVEL_LABELS[profile.client_level] ?? profile.client_level}
                </span>
              )}
              {profile.phone && (
                <span className="text-xs text-[var(--color-muted-foreground)]">{profile.phone}</span>
              )}
            </div>
          </PageHeader>
        </div>
      </div>

      <MeasurementsSummary measurements={measurements} />
    </div>
  )
}
