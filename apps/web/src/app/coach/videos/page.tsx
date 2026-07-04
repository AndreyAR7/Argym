import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { CoachVideoGrid } from './coach-video-grid'
import { Video } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Videos' }

const LEVEL_TABS = [
  { value: 'all',          label: 'Todos'         },
  { value: 'beginner',     label: 'Principiante'  },
  { value: 'intermediate', label: 'Intermedio'    },
  { value: 'advanced',     label: 'Avanzado'      },
]


export default async function CoachVideosPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>
}) {
  const params      = await searchParams
  const levelFilter = params.level ?? 'all'

  const supabase    = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const tenantId   = profile?.tenant_id as string
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  let query = supabase
    .from('videos')
    .select('id, title, description, level, status, duration_seconds, thumbnail_color, thumbnail_storage_path, video_storage_path')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .order('title', { ascending: true })

  if (levelFilter !== 'all') query = query.eq('level', levelFilter)

  const { data: videos } = await query

  function buildUrl(l: string) {
    const sp = new URLSearchParams()
    if (l !== 'all') sp.set('level', l)
    const qs = sp.toString()
    return `/coach/videos${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Videos"
        subtitle={`${videos?.length ?? 0} video${(videos?.length ?? 0) !== 1 ? 's' : ''} disponible${(videos?.length ?? 0) !== 1 ? 's' : ''}`}
      />

      {/* Level filter tabs */}
      <div className="mt-6 flex items-center gap-1 bg-[var(--color-muted)] rounded-lg p-1 w-fit overflow-x-auto">
        {LEVEL_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={buildUrl(tab.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              levelFilter === tab.value
                ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Grid */}
      {!videos || videos.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-muted)] flex items-center justify-center">
            <Video size={24} className="text-[var(--color-border)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">Sin videos</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {levelFilter !== 'all'
              ? 'No hay videos publicados con este nivel.'
              : 'No hay videos publicados en la biblioteca.'}
          </p>
        </div>
      ) : (
        <CoachVideoGrid videos={videos} supabaseUrl={supabaseUrl} />
      )}
    </div>
  )
}
