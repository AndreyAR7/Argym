'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateVideoMetadataAction(
  videoId: string,
  data: {
    title: string
    description: string
    level: string
    is_featured: boolean
    is_free: boolean
    status: 'draft' | 'published' | 'archived'
  },
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('videos')
    .update({
      title: data.title,
      description: data.description,
      level: data.level,
      is_featured: data.is_featured,
      is_free: data.is_free,
      status: data.status,
    })
    .eq('id', videoId)

  if (error) return { error: error.message }
  revalidatePath('/admin/videos')
  return { success: true }
}

export async function deleteVideoAction(
  videoId: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Perfil no encontrado' }

  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }
  revalidatePath('/admin/videos')
  return { success: true }
}

export async function createVideoAction(data: {
  title: string
  description: string | null
  level: string
  is_featured: boolean
  is_free: boolean
  category_id: string | null
}): Promise<{ success?: boolean; error?: string; videoId?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Perfil no encontrado' }

  const { data: video, error } = await supabase
    .from('videos')
    .insert({
      tenant_id: profile.tenant_id,
      title: data.title,
      description: data.description,
      level: data.level,
      is_featured: data.is_featured,
      is_free: data.is_free,
      category_id: data.category_id,
      status: 'draft',
      created_by: user.id,
      views_count: 0,
      allowed_plans: [],
      allowed_levels: [],
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/videos')
  return { success: true, videoId: video.id }
}

export async function createVideoRecordAction(data: {
  title: string
  description: string | null
  level: string
  is_featured: boolean
  is_free: boolean
  storage_path: string
  storage_bucket: string
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Perfil no encontrado' }

  const { error } = await supabase.from('videos').insert({
    tenant_id: profile.tenant_id,
    created_by: user.id,
    title: data.title,
    description: data.description,
    level: data.level,
    is_featured: false,
    is_free: false,
    status: 'draft',
    storage_path: data.storage_path,
    bucket_name: data.storage_bucket,
    views_count: 0,
    allowed_plans: [],
    allowed_levels: [],
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/videos')
  return { success: true }
}

export async function assignVideoToClientAction(
  videoId: string,
  clientId: string,
  note: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Perfil no encontrado' }

  const { error } = await supabase
    .from('video_assignments')
    .upsert(
      {
        video_id: videoId,
        client_id: clientId,
        tenant_id: profile.tenant_id,
        assigned_by: user.id,
        note,
      },
      { onConflict: 'video_id,client_id', ignoreDuplicates: true },
    )

  if (error) return { error: error.message }
  revalidatePath('/admin/videos')
  return { success: true }
}
