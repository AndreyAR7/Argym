-- The 'content.manage' permission code is referenced by RLS policies on
-- videos, video_categories, routines, and nutrition_plans (see migration
-- 20240101000108_fix_missing_rls_policies_full.sql), but it was never
-- added to the permissions catalog or granted to any role in seed.sql.
-- Since the permission row never existed, has_permission('content.manage')
-- evaluated to FALSE for every user (including admins), so every write to
-- those four tables via the authenticated client was silently blocked by
-- RLS (0 rows affected, no error surfaced to the caller).

INSERT INTO permissions (id, code, description, module)
VALUES (
  gen_random_uuid(),
  'content.manage',
  'Gestionar videos, categorías de video, rutinas y planes nutricionales',
  'content'
)
ON CONFLICT (code) DO NOTHING;

-- Grant to admin and coach, matching the existing pattern for the
-- equivalent per-module permissions (routines.create/edit, nutrition.create/edit).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('admin', 'coach')
  AND p.code = 'content.manage'
ON CONFLICT DO NOTHING;
