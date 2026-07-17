-- Public bucket for per-tenant branding logos, uploaded from the
-- /super-admin/tenants/[id] panel. Public read (served on the pre-auth
-- login page), write restricted to the platform admin.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tenant-logos', 'tenant-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "tenant_logos_public_read"     ON storage.objects;
DROP POLICY IF EXISTS "tenant_logos_platform_insert" ON storage.objects;
DROP POLICY IF EXISTS "tenant_logos_platform_update" ON storage.objects;
DROP POLICY IF EXISTS "tenant_logos_platform_delete" ON storage.objects;

CREATE POLICY "tenant_logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'tenant-logos');

CREATE POLICY "tenant_logos_platform_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tenant-logos'
    AND public.is_platform_admin()
  );

CREATE POLICY "tenant_logos_platform_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'tenant-logos'
    AND public.is_platform_admin()
  );

CREATE POLICY "tenant_logos_platform_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tenant-logos'
    AND public.is_platform_admin()
  );
