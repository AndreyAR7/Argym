import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ClientVideoList } from '@/components/client/video-list'

export const metadata = { title: 'Mis Videos' }

export default async function ClientVideosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assignments } = await supabase
    .from('video_assignments')
    .select(`
      id, note,
      videos (id, title, description, level, duration_seconds, video_storage_path, thumbnail_storage_path, thumbnail_color)
    `)
    .eq('client_id', user.id)
    .order('assigned_at', { ascending: false })

  const videos = (assignments ?? [])
    .map((a: any) => ({ ...a.videos, note: a.note }))
    .filter(Boolean)

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
