import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { File as ExpoFile } from 'expo-file-system';
import {
  getInfoAsync,
  FileSystemUploadType,
  uploadAsync,
} from 'expo-file-system/legacy';
import type {
  Video, VideoCategory, VideoAssignment, VideoProgress,
  ClientVideo, VideoPlan, VideoLevel, VideoStatus,
} from '@/types/videos';

// ─── Categories ───────────────────────────────────────────────

export async function fetchCategories(tenantId: string): Promise<VideoCategory[]> {
  const { data, error } = await supabase
    .from('video_categories')
    .select('*')
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ─── Admin ────────────────────────────────────────────────────

export async function fetchVideosAdmin(tenantId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*, category:video_categories(*)')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createVideo(
  video: Omit<Video, 'id' | 'created_at' | 'updated_at' | 'views_count' | 'category'>
): Promise<Video> {
  const { data, error } = await supabase
    .from('videos')
    .insert(video)
    .select('*, category:video_categories(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateVideo(id: string, updates: Partial<Omit<Video, 'category'>>): Promise<void> {
  const { error } = await supabase
    .from('videos')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function setVideoStatus(id: string, status: VideoStatus, userId: string): Promise<void> {
  await updateVideo(id, { status, updated_by: userId });
}

export async function deleteVideo(id: string): Promise<void> {
  const { error } = await supabase.from('videos').delete().eq('id', id);
  if (error) throw error;
}

// ─── Storage ──────────────────────────────────────────────────

/**
 * Upload VIDEO to Supabase Storage.
 *
 * Strategy: TUS session creation (POST) + single native PATCH via
 * expo-file-system uploadAsync (BINARY_CONTENT).
 *
 * uploadAsync streams the file natively without loading it into JS heap.
 * The loop-of-chunks approach was removed because uploadAsync does NOT
 * support partial reads (position/length) — each call always sends the
 * full file. One POST + one PATCH is the correct pattern here.
 */
export async function uploadVideoFile(
  tenantId: string,
  videoId: string,
  file: { uri: string; mimeType: string; extension?: string; size?: number },
  onProgress?: (pct: number) => void,
): Promise<{ path: string; mimeType: string }> {
  const ext = file.extension ?? 'mp4';
  const uniqueSuffix = Date.now().toString(36);
  const storagePath = `${tenantId}/${videoId}/${uniqueSuffix}.${ext}`;
  const bucket = 'videos';

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? supabaseAnonKey;

  const info = await getInfoAsync(file.uri);
  const fileSize = (info as any).size as number;

  const tusEndpoint = `${supabaseUrl}/storage/v1/upload/resumable`;

  // ── Step 1: Create TUS upload session ──────────────────────
  const createRes = await fetch(tusEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/offset+octet-stream',
      'Content-Length': '0',
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(fileSize),
      'Upload-Metadata': [
        `bucketName ${btoa(bucket)}`,
        `objectName ${btoa(storagePath)}`,
        `contentType ${btoa(file.mimeType)}`,
        `cacheControl ${btoa('3600')}`,
        `x-upsert ${btoa('true')}`,
      ].join(','),
    },
  });

  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`TUS create failed: ${createRes.status} ${body}`);
  }

  const uploadUrl = createRes.headers.get('Location');
  if (!uploadUrl) throw new Error('TUS: no Location header in create response');

  // ── Step 2: Single PATCH — uploadAsync streams natively ────
  // uploadAsync with BINARY_CONTENT does NOT load the file into JS heap.
  // It streams directly from the filesystem. One call = full file upload.
  onProgress?.(5);

  const result = await uploadAsync(uploadUrl, file.uri, {
    httpMethod: 'PATCH',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/offset+octet-stream',
      'Content-Length': String(fileSize),
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': '0',
    },
  });

  // TUS returns 204 on success; also accept 200 for safety
  if (result.status !== 204 && result.status !== 200) {
    throw new Error(`TUS upload failed: ${result.status} ${result.body}`);
  }

  onProgress?.(100);

  return { path: storagePath, mimeType: file.mimeType };
}

/**
 * Upload THUMBNAIL using simple ArrayBuffer upload.
 * Images are small (< 5 MB) — loading into memory is fine.
 */
export async function uploadThumbnail(
  tenantId: string,
  videoId: string,
  file: { uri: string; mimeType: string; extension?: string }
): Promise<string> {
  const ext = file.extension ?? 'jpg';
  const path = `${tenantId}/${videoId}/thumb.${ext}`;

  const expoFile = new ExpoFile(file.uri);
  const arrayBuffer = await expoFile.arrayBuffer();

  const { error } = await supabase.storage
    .from('video-thumbnails')
    .upload(path, arrayBuffer, { contentType: file.mimeType, upsert: true });
  if (error) throw error;
  return path;
}

/**
 * Generate a signed URL for private video playback.
 * Default expiry: 2 hours (enough for a long video session).
 */
export async function getVideoSignedUrl(
  storagePath: string,
  expiresIn = 7200
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('videos')
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Get public CDN URL for thumbnail (public bucket).
 */
export function getThumbnailPublicUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from('video-thumbnails')
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

// ─── Client access ────────────────────────────────────────────

/**
 * Fetch videos accessible to a client based on:
 * 1. Direct assignment (always accessible)
 * 2. Plan tier match via allowed_plans/allowed_levels arrays
 * 3. Plan-level video assignment via plan_videos table
 * 4. Promotion-level video assignment via promotion_videos table
 * Only returns published videos.
 */
export async function fetchVideosForClient(
  tenantId: string,
  clientId: string,
  clientPlan: VideoPlan | null,
  clientLevel: VideoLevel | null,
  planIds?: string[],
  promotionIds?: string[],
): Promise<ClientVideo[]> {
  const activePlanIds  = planIds?.filter(Boolean) ?? [];
  const activePromoIds = promotionIds?.filter(Boolean) ?? [];

  const [videosRes, assignmentsRes, progressRes, planVideosRes, promoVideosRes] = await Promise.all([
    supabase
      .from('videos')
      .select('*, category:video_categories(*)')
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .order('sort_order', { ascending: true }),
    supabase
      .from('video_assignments')
      .select('video_id')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId),
    supabase
      .from('video_progress')
      .select('*')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId),
    activePlanIds.length > 0
      ? supabase.from('plan_videos').select('video_id').in('plan_id', activePlanIds)
      : Promise.resolve({ data: [] as { video_id: string }[], error: null }),
    activePromoIds.length > 0
      ? supabase.from('promotion_videos').select('video_id').in('promotion_id', activePromoIds)
      : Promise.resolve({ data: [] as { video_id: string }[], error: null }),
  ]);

  if (videosRes.error) throw videosRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;
  if (progressRes.error) throw progressRes.error;

  const assignedIds   = new Set((assignmentsRes.data ?? []).map((a) => a.video_id));
  const planVideoIds  = new Set((planVideosRes.data ?? []).map((r) => r.video_id));
  const promoVideoIds = new Set((promoVideosRes.data ?? []).map((r) => r.video_id));
  const progressMap   = new Map((progressRes.data ?? []).map((p) => [p.video_id, p as VideoProgress]));

  return (videosRes.data ?? []).map((v): ClientVideo => {
    const isAssigned = assignedIds.has(v.id);

    const planOk =
      v.allowed_plans.length === 0 ||
      (clientPlan != null && (v.allowed_plans as VideoPlan[]).includes(clientPlan));

    const levelOk =
      v.allowed_levels.length === 0 ||
      (clientLevel != null && (v.allowed_levels as VideoLevel[]).includes(clientLevel));

    const isAccessible =
      v.is_free ||                     // free videos: always accessible
      isAssigned ||
      (planOk && levelOk) ||
      planVideoIds.has(v.id) ||
      promoVideoIds.has(v.id);

    const thumbnail_public_url = v.thumbnail_storage_path
      ? getThumbnailPublicUrl(v.thumbnail_storage_path)
      : undefined;

    return {
      ...v,
      is_assigned: isAssigned,
      is_accessible: isAccessible,
      progress: progressMap.get(v.id),
      thumbnail_public_url,
    };
  });
}

// ─── Plan / Promotion video associations ─────────────────────

export async function getPlanVideoIds(planId: string): Promise<string[]> {
  const { data } = await supabase
    .from('plan_videos')
    .select('video_id')
    .eq('plan_id', planId);
  return (data ?? []).map((r) => r.video_id);
}

export async function setPlanVideos(planId: string, videoIds: string[]): Promise<void> {
  await supabase.from('plan_videos').delete().eq('plan_id', planId);
  if (videoIds.length > 0) {
    const { error } = await supabase
      .from('plan_videos')
      .insert(videoIds.map((video_id) => ({ plan_id: planId, video_id })));
    if (error) throw error;
  }
}

export async function getPromotionVideoIds(promotionId: string): Promise<string[]> {
  const { data } = await supabase
    .from('promotion_videos')
    .select('video_id')
    .eq('promotion_id', promotionId);
  return (data ?? []).map((r) => r.video_id);
}

export async function setPromotionVideos(promotionId: string, videoIds: string[]): Promise<void> {
  await supabase.from('promotion_videos').delete().eq('promotion_id', promotionId);
  if (videoIds.length > 0) {
    const { error } = await supabase
      .from('promotion_videos')
      .insert(videoIds.map((video_id) => ({ promotion_id: promotionId, video_id })));
    if (error) throw error;
  }
}

// ─── Assignments ──────────────────────────────────────────────

export async function assignVideoToClient(
  videoId: string,
  clientId: string,
  tenantId: string,
  assignedBy: string,
  note?: string,
): Promise<VideoAssignment> {
  const { data, error } = await supabase
    .from('video_assignments')
    .upsert({ video_id: videoId, client_id: clientId, tenant_id: tenantId, assigned_by: assignedBy, note })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeVideoAssignment(videoId: string, clientId: string): Promise<void> {
  const { error } = await supabase
    .from('video_assignments')
    .delete()
    .eq('video_id', videoId)
    .eq('client_id', clientId);
  if (error) throw error;
}

// ─── Progress ─────────────────────────────────────────────────

export async function upsertVideoProgress(
  videoId: string,
  clientId: string,
  tenantId: string,
  watchedSeconds: number,
  completed: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('video_progress')
    .upsert({
      video_id: videoId,
      client_id: clientId,
      tenant_id: tenantId,
      watched_seconds: watchedSeconds,
      completed,
      last_watched_at: new Date().toISOString(),
    });
  if (error) throw error;
}

// ─── Analytics ────────────────────────────────────────────────

/**
 * Record a view event and increment views_count atomically via DB function.
 * sessionSeconds: how long the user watched in this session (optional).
 */
export async function recordVideoView(
  videoId: string,
  clientId: string,
  tenantId: string,
  sessionSeconds?: number,
): Promise<void> {
  await supabase.rpc('record_video_view', {
    p_video_id:     videoId,
    p_client_id:    clientId,
    p_tenant_id:    tenantId,
    p_session_secs: sessionSeconds ?? null,
  });
}
