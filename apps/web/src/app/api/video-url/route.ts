import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getSessionData } from '@/lib/auth/session'

// videos/video-thumbnails/exercise-demos objects are stored under a
// `${tenant_id}/...` path prefix (see storage policies added in migration
// 20240101000110). Any other bucket (avatars, tenant-logos) has no business
// being signed through this tenant-scoped endpoint.
const TENANT_SCOPED_BUCKETS = ['videos', 'video-thumbnails', 'exercise-demos']

export async function GET(req: NextRequest) {
  try {
    const path   = req.nextUrl.searchParams.get('path')
    const bucket = req.nextUrl.searchParams.get('bucket') ?? 'videos'

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }
    if (!TENANT_SCOPED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
    }

    const session = await getSessionData()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // This endpoint signs URLs with the service role, which bypasses storage
    // RLS entirely — the tenant-folder check the storage policies already
    // enforce for direct access has to be re-checked here by hand, or any
    // authenticated user from any tenant could fetch any other tenant's
    // paid video content just by knowing/guessing its path.
    const pathTenantId = path.split('/')[0]
    if (!pathTenantId || pathTenantId !== session.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prefer admin client (bypasses storage RLS entirely).
    // Fall back to the authenticated server client if service role key is absent.
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY

    const storageClient = hasServiceRole ? await createAdminClient() : session.supabase

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
