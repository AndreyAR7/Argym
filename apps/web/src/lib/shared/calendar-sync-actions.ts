'use server'

import { createClient } from '@/lib/supabase/server'

function buildFeedUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${base}/functions/v1/ical-feed/${token}`
}

export async function getCalendarSyncUrlAction(): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: token, error } = await supabase.rpc('get_or_create_ical_token')
  if (error) return { error: error.message }

  return { url: buildFeedUrl(token as string) }
}

export async function rotateCalendarSyncUrlAction(): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: token, error } = await supabase.rpc('rotate_ical_token')
  if (error) return { error: error.message }

  return { url: buildFeedUrl(token as string) }
}
