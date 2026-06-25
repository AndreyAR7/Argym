import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ClientVideoList } from '@/components/client/video-list'

export const metadata = { title: 'Mis Videos' }

const VIDEO_FIELDS = 'id, title, description, level, duration_seconds, video_storage_path, thumbnail_storage_path, thumbnail_color'

export default async function ClientVideosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get client level for level-based video access
  const { data: profile } = await supabase
    .from('profiles')
    .select('client_level')
    .eq('id', user.id)
    .single()

  const clientLevel = profile?.client_level ?? null

  const [assignedResult, accessibleResult] = await Promise.all([
    // Explicitly assigned videos (include coach note)
    supabase
      .from('video_assignments')
      .select(`id, note, videos (${VIDEO_FIELDS})`)
      .eq('client_id', user.id)
      .order('assigned_at', { ascending: false }),

    // Videos accessible without explicit assignment:
    // is_free = true  OR  allowed_levels contains client's level
    supabase
      .from('videos')
      .select(VIDEO_FIELDS)
      .eq('status', 'published')
      .or(
        clientLevel
          ? `is_free.eq.true,allowed_levels.cs.{${clientLevel}}`
          : 'is_free.eq.true'
      ),
  ])

  const assignedVideos: any[] = (assignedResult.data ?? [])
    .map((a: any) => ({ ...a.videos, note: a.note }))
    .filter(Boolean)

  const assignedIds = new Set(assignedVideos.map((v: any) => v.id))

  const autoVideos: any[] = (accessibleResult.data ?? [])
    .filter((v: any) => v && !assignedIds.has(v.id))
    .map((v: any) => ({ ...v, note: null }))

  const videos = [...assignedVideos, ...autoVideos]
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
