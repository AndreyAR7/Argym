-- Several RLS policies check has_permission() codes that were referenced
-- by later migrations but never actually inserted into permissions/
-- role_permissions — the same bug class already fixed once for
-- 'content.manage' (000115) and 'tenant.manage_correspondence' (000170),
-- recurring for these 6 codes. Each one silently blocks a real admin/
-- coach feature with no error surfaced (RLS just rejects the write or
-- returns 0 rows):
--   clients.manage      -> client_medical_records, routine_assignments,
--                          coach_client_assignments, video_assignments,
--                          nutrition_assignments staff writes
--   appointments.manage -> class_templates, group booking RPCs,
--                          schedule_blocks, get_client_appointment_stats,
--                          class_waitlist
--   progress.view       -> body_measurements staff read
--   settings.manage     -> email_logs (missed by 000170's sibling fix)
--   clients.view        -> video_progress staff read
--   notifications.send  -> direct notification inserts by staff

INSERT INTO public.permissions (code, description, module) VALUES
  ('clients.manage',     'Gestionar datos completos de clientes (ficha médica, asignaciones)', 'clients'),
  ('appointments.manage', 'Gestionar clases, bloqueos de horario y estadísticas de citas', 'appointments'),
  ('progress.view',       'Ver medidas corporales y progreso de clientes', 'clients'),
  ('settings.manage',     'Gestionar configuración sensible del tenant', 'settings'),
  ('clients.view',        'Ver progreso de video de clientes', 'clients'),
  ('notifications.send',  'Enviar notificaciones directas a usuarios', 'notifications')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('admin', 'full_access')
  AND p.code IN ('clients.manage', 'appointments.manage', 'progress.view', 'settings.manage', 'clients.view', 'notifications.send')
ON CONFLICT DO NOTHING;

-- Coaches need to act on their assigned clients' data directly (medical
-- records, measurements, routine/video assignments, video progress).
-- Deliberately NOT granting appointments.manage to coach here:
-- appointments_admin_all is `FOR ALL USING (has_permission
-- ('appointments.manage'))` with no per-coach scoping at all — granting
-- it would give every coach full read/write on every appointment in the
-- tenant (not just their own), a much bigger hole than the one being
-- fixed. get_client_appointment_stats() is patched separately below to
-- let a client's assigned coach call it without that permission.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'coach'
  AND p.code IN ('clients.manage', 'progress.view', 'clients.view')
ON CONFLICT DO NOTHING;
