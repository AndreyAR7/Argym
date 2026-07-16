import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ClientVideoList } from '@/components/client/video-list'

export const metadata = { title: 'Mis Videos' }

const VIDEO_FIELDS = 'id, title, description, level, duration_seconds, video_storage_path, thumbnail_storage_path, thumbnail_color, updated_at'

export default async function ClientVideosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_level')
    .eq('id', user.id)
    .single()

  const clientLevel = profile?.client_level ?? null

  // Get active subscription plan IDs + promotion IDs
  const { data: activeSubs } = await supabase
    .from('user_subscriptions')
    .select('plan_id, promotion_id')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const planIds = [...new Set((activeSubs ?? []).map((s: any) => s.plan_id).filter(Boolean))]
  const promotionIds = [...new Set((activeSubs ?? []).map((s: any) => s.promotion_id).filter(Boolean))]

  const [assignedResult, accessibleResult, planVideoResults, promoVideoResults] = await Promise.all([
    // Explicitly assigned videos by coach
    supabase
      .from('video_assignments')
      .select(`id, note, videos (${VIDEO_FIELDS})`)
      .eq('client_id', user.id)
      .order('assigned_at', { ascending: false }),

    // Free / level-gated videos
    supabase
      .from('videos')
      .select(VIDEO_FIELDS)
      .eq('status', 'published')
      .or(clientLevel ? `is_free.eq.true,allowed_levels.cs.{${clientLevel}}` : 'is_free.eq.true'),

    // Videos from active subscription plans
    planIds.length > 0
      ? supabase
          .from('plan_videos')
          .select(`video_id, videos (${VIDEO_FIELDS})`)
          .in('plan_id', planIds)
      : Promise.resolve({ data: [] }),

    // Videos from active promotion
    promotionIds.length > 0
      ? supabase
          .from('promotion_videos')
          .select(`video_id, videos (${VIDEO_FIELDS})`)
          .in('promotion_id', promotionIds)
      : Promise.resolve({ data: [] }),
  ])

  // Build deduplicated video list with source tags
  const seen = new Set<string>()

  function tag(v: any, source: string) {
    if (!v?.id || seen.has(v.id)) return null
    seen.add(v.id)
    return { ...v, _source: source }
  }

  const assignedVideos: any[] = (assignedResult.data ?? [])
    .map((a: any) => a.videos ? tag(a.videos, 'coach') : null)
    .filter(Boolean)

  const planVideos: any[] = (planVideoResults.data ?? [])
    .map((r: any) => r.videos ? tag(r.videos, 'plan') : null)
    .filter(Boolean)

  const promoVideos: any[] = (promoVideoResults.data ?? [])
    .map((r: any) => r.videos ? tag(r.videos, 'promo') : null)
    .filter(Boolean)

  const accessibleVideos: any[] = (accessibleResult.data ?? [])
    .map((v: any) => tag(v, v?.is_free ? 'free' : 'level'))
    .filter(Boolean)

  const videos = [...assignedVideos, ...planVideos, ...promoVideos, ...accessibleVideos]
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Mis Videos"
        subtitle={`${videos.length} video${videos.length !== 1 ? 's' : ''} disponible${videos.length !== 1 ? 's' : ''}`}
      />
      <div className="mt-6">
        <ClientVideoList videos={videos} supabaseUrl={supabaseUrl} />
      </div>
    </div>
  )
}
