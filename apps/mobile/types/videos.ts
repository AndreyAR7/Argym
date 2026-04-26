// ─── Enums ────────────────────────────────────────────────────

export type VideoLevel = 'beginner' | 'intermediate' | 'advanced';
export type VideoPlan  = 'basic' | 'medium' | 'premium';

export type VideoStatus =
  | 'draft'
  | 'uploading'
  | 'processing'
  | 'published'
  | 'archived'
  | 'failed';

// ─── Category catalog ─────────────────────────────────────────

export interface VideoCategory {
  id: string;
  tenant_id: string | null; // null = global default
  slug: string;
  label: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

// ─── Core video ───────────────────────────────────────────────

export interface Video {
  id: string;
  tenant_id: string;

  // Content
  title: string;
  description: string | null;
  category_id: string | null;
  level: VideoLevel;

  // Storage — bucket + path, never a final URL
  video_bucket: string;
  video_storage_path: string | null;
  video_mime_type: string | null;
  video_file_size_bytes: number | null;

  thumbnail_bucket: string;
  thumbnail_storage_path: string | null;
  thumbnail_color: string; // fallback when no thumbnail

  // Metadata
  duration_seconds: number | null;

  // Access control
  allowed_plans: VideoPlan[];
  allowed_levels: VideoLevel[];

  // Lifecycle
  status: VideoStatus;
  is_featured: boolean;
  sort_order: number;

  // Analytics
  views_count: number;

  // Audit
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;

  // Joined — populated when fetched with category
  category?: VideoCategory;
}

// ─── Assignment ───────────────────────────────────────────────

export interface VideoAssignment {
  id: string;
  video_id: string;
  client_id: string;
  tenant_id: string;
  assigned_by: string;
  assigned_at: string;
  note: string | null;
  video?: Video;
}

// ─── Progress ─────────────────────────────────────────────────

export interface VideoProgress {
  id: string;
  video_id: string;
  client_id: string;
  tenant_id: string;
  watched_seconds: number;
  completed: boolean;
  last_watched_at: string;
}

// ─── View event ───────────────────────────────────────────────

export interface VideoViewEvent {
  id: string;
  video_id: string;
  client_id: string;
  tenant_id: string;
  viewed_at: string;
  session_seconds: number | null;
}

// ─── Client-enriched video ────────────────────────────────────

export interface ClientVideo extends Video {
  is_assigned: boolean;
  is_accessible: boolean;
  progress?: VideoProgress;
  // Resolved signed URL — populated lazily when needed for playback
  signed_video_url?: string;
  // Resolved public thumbnail URL
  thumbnail_public_url?: string;
}

// ─── Helpers ──────────────────────────────────────────────────

export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function isPublished(video: Video): boolean {
  return video.status === 'published';
}

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  draft:      'Borrador',
  uploading:  'Subiendo',
  processing: 'Procesando',
  published:  'Publicado',
  archived:   'Archivado',
  failed:     'Error',
};
