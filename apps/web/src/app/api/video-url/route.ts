import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

export async function GET(req: NextRequest) {
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

  // Use admin client so signed URL generation never hits storage RLS
  const admin = await createAdminClient()
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, 3600)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
