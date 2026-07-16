import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const getSessionData = cache(async () => {
  const t0 = Date.now()
  const supabase = await createClient()

  const t1 = Date.now()
  const { data: { user } } = await supabase.auth.getUser()
  console.log(`[SESSION] getUser(): ${Date.now() - t1}ms`)
  if (!user) return null

  const hdrs    = await headers()
  const ckStore = await cookies()

  const tenantId =
    hdrs.get('x-tenant-id') ??
    ckStore.get('x-tid')?.value ??
    null

  const role =
    hdrs.get('x-user-role') ??
    ckStore.get('x-role')?.value ??
    undefined

  // Never cookie-cached: this gates /super-admin, must always be fresh.
  const { data: isPA } = await supabase.rpc('is_platform_admin')
  const isPlatformAdmin = !!isPA

  if (tenantId) {
    // Fetch approval_status fresh from DB — never trust the cached cookie for
    // this field because an admin can approve/reject a user mid-session and
    // because stale 'pending' cookies from previous sessions would block access.
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('approval_status')
      .eq('id', user.id)
      .single()

    const approvalStatus = freshProfile?.approval_status ?? ckStore.get('x-approval')?.value ?? 'pending'
    console.log(`[SESSION] fast path (cookies+approval): ${Date.now() - t0}ms total`)

    const fullName  = ckStore.get('x-name')?.value ?? (user.user_metadata?.full_name as string) ?? null
    const avatarUrl = ckStore.get('x-avatar')?.value ?? (user.user_metadata?.avatar_url as string) ?? null

    return {
      supabase,
      user,
      profile: {
        id: user.id,
        tenant_id: tenantId,
        full_name: fullName,
        avatar_url: avatarUrl,
        approval_status: approvalStatus,
      },
      tenantId,
      role,
      isPlatformAdmin,
    }
  }

  // Slow path (first request after login, before middleware cache warms up)
  const t2 = Date.now()
  const [profileResult, roleResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, tenant_id, full_name, avatar_url, approval_status')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)
      .limit(1)
      .single(),
  ])
  console.log(`[SESSION] slow path DB queries: ${Date.now() - t2}ms | total: ${Date.now() - t0}ms`)

  const profile  = profileResult.data
  const dbRole   = (roleResult.data?.roles as any)?.name as string | undefined

  return {
    supabase,
    user,
    profile,
    tenantId: profile?.tenant_id as string,
    role: dbRole,
    isPlatformAdmin,
  }
})
