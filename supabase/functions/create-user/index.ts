import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: 'client' | 'coach';
  phone?: string;
  date_of_birth?: string; // YYYY-MM-DD, clients only
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Verify caller is authenticated admin ───────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the caller's JWT using anon client
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser }, error: authError } = await callerClient.auth.getUser();
    if (authError || !callerUser) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // Admin client with service role — full access
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller has admin role in their tenant
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', callerUser.id)
      .single();

    if (!callerProfile?.tenant_id) {
      return json({ error: 'Caller has no tenant' }, 403);
    }

    const tenantId: string = callerProfile.tenant_id;

    const { data: callerRole } = await adminClient
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', callerUser.id)
      .eq('tenant_id', tenantId)
      .single();

    const roleName = (callerRole?.roles as any)?.name;
    if (roleName !== 'admin') {
      return json({ error: 'Forbidden: caller is not admin' }, 403);
    }

    // ── 2. Parse and validate payload ────────────────────────
    const body: CreateUserPayload = await req.json();
    const { email, password, full_name, role, phone, date_of_birth } = body;

    if (!email?.trim()) return json({ error: 'email is required' }, 400);
    if (!password?.trim()) return json({ error: 'password is required' }, 400);
    if (!full_name?.trim()) return json({ error: 'full_name is required' }, 400);
    if (!['client', 'coach'].includes(role)) return json({ error: 'role must be client or coach' }, 400);

    // ── 3. Check email not already in use ────────────────────
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (emailExists) {
      return json({ error: 'Este email ya está registrado' }, 409);
    }

    // ── 4. Create auth.user ───────────────────────────────────
    const { data: newAuthUser, error: createAuthError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password.trim(),
      email_confirm: true, // skip email confirmation
    });

    if (createAuthError || !newAuthUser?.user) {
      console.error('create auth user error:', createAuthError);
      return json({ error: createAuthError?.message ?? 'Failed to create auth user' }, 500);
    }

    const newUserId = newAuthUser.user.id;

    // ── 5. Create profile ─────────────────────────────────────
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: newUserId,
      tenant_id: tenantId,
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
      date_of_birth: date_of_birth?.trim() || null,
      is_active: true,
      approval_status: 'approved',
    });

    if (profileError) {
      // Rollback: delete the auth user we just created
      await adminClient.auth.admin.deleteUser(newUserId);
      console.error('profile insert error:', profileError);
      return json({ error: profileError.message }, 500);
    }

    // ── 6. Assign role in user_roles ──────────────────────────
    const { data: roleRow } = await adminClient
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    if (!roleRow?.id) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return json({ error: `Role '${role}' not found in roles table` }, 500);
    }

    const { error: roleError } = await adminClient.from('user_roles').insert({
      user_id: newUserId,
      role_id: roleRow.id,
      tenant_id: tenantId,
    });

    if (roleError) {
      await adminClient.auth.admin.deleteUser(newUserId);
      console.error('user_roles insert error:', roleError);
      return json({ error: roleError.message }, 500);
    }

    // ── 7. Return created profile ─────────────────────────────
    return json({
      id: newUserId,
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      role,
      tenant_id: tenantId,
    }, 201);

  } catch (err: any) {
    console.error('create-user unexpected error:', err);
    return json({ error: err.message ?? 'Internal server error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
