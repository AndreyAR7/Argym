import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { VideoRowActions } from '@/components/admin/video-row-actions'
import { VideoLevelSelect } from '@/components/admin/video-level-select'
import { NewVideoButton } from '@/components/admin/new-video-button'
import { Video, Eye } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Videos' }

const STATUS_TABS = [
  { value: 'all',        label: 'Todos' },
  { value: 'published',  label: 'Publicados' },
  { value: 'draft',      label: 'Borrador' },
  { value: 'archived',   label: 'Archivados' },
]

const LEVEL_LABELS: Record<string, string> = {
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
}

function formatDuration(secs: number | null) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; level?: string }>
}) {
  const params = await searchParams
  const statusFilter = params.status ?? 'all'
  const levelFilter = params.level ?? 'all'

  const session = await getSessionData()
  const { supabase, tenantId } = session!
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  let query = supabase
    .from('videos')
    .select('id, title, description, level, status, is_featured, is_free, duration_seconds, views_count, thumbnail_storage_path, thumbnail_color, storage_path, created_at', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (statusFilter !== 'all') query = query.eq('status', statusFilter)
  if (levelFilter !== 'all') query = query.eq('level', levelFilter)

  const { data: videos, count } = await query

  function buildUrl(s?: string, l?: string) {
    const sp = new URLSearchParams()
    const st = s ?? statusFilter
    const lv = l ?? levelFilter
    if (st !== 'all') sp.set('status', st)
    if (lv !== 'all') sp.set('level', lv)
    const qs = sp.toString()
    return `/admin/videos${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Videos"
        subtitle={`${count ?? 0} video${count !== 1 ? 's' : ''} en la biblioteca`}
      >
        <NewVideoButton tenantId={tenantId} />
      </PageHeader>

      {/* ── Filters ── */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-[var(--color-muted)] rounded-lg p-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={buildUrl(tab.value, levelFilter)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                statusFilter === tab.value
                  ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Level filter */}
        <VideoLevelSelect currentLevel={levelFilter} currentStatus={statusFilter} />
      </div>

      {/* ── Table ── */}
      {!videos || videos.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-muted)] flex items-center justify-center">
            <Video size={24} className="text-[var(--color-border)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">No hay videos</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {statusFilter !== 'all' ? 'No hay videos con este filtro.' : 'Sube tu primer video desde la app móvil.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Video</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Nivel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Duración</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Vistas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
              {videos.map((video) => {
                const thumbUrl = video.thumbnail_storage_path
                  ? `${supabaseUrl}/storage/v1/object/public/video-thumbnails/${video.thumbnail_storage_path}`
                  : null

                return (
                  <tr key={video.id} className="hover:bg-[var(--color-muted)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Thumbnail */}
                        <div
                          className="w-16 h-10 rounded-md flex-shrink-0 overflow-hidden flex items-center justify-center"
                          style={{ background: thumbUrl ? undefined : (video.thumbnail_color ?? '#6C63FF') }}
                        >
                          {thumbUrl ? (
                            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Video size={16} className="text-white/70" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--color-foreground)] line-clamp-1">{video.title}</p>
                          {video.is_free && (
                            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Gratis</span>
                          )}
                          {video.is_featured && (
                            <span className="ml-1.5 text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Destacado</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge value={video.level} />
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-muted-foreground)] hidden lg:table-cell tabular-nums">
                      {formatDuration(video.duration_seconds)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
                        <Eye size={13} />
                        {(video.views_count ?? 0).toLocaleString('es-CR')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={video.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <VideoRowActions video={{ ...video, storage_path: video.storage_path ?? null }} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
