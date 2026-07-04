import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

export async function GET(req: NextRequest) {
  try {
    const path   = req.nextUrl.searchParams.get('path')
    const bucket = req.nextUrl.searchParams.get('bucket') ?? 'videos'

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    // Verify the request comes from an authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prefer admin client (bypasses storage RLS entirely).
    // Fall back to the authenticated server client if service role key is absent.
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY

    const storageClient = hasServiceRole ? await createAdminClient() : supabase

    const { data, error } = await storageClient.storage
      .from(bucket)
      .createSignedUrl(path, 3600)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (e: any) {
    console.error('[api/video-url]', e)
    return NextResponse.json({ error: e?.message ?? 'Error interno del servidor' }, { status: 500 })
  }
}
