-- Sprint 1A Seed Data
-- Demo tenant, subscription plan, roles, and permissions

-- ============================================================
-- Subscription Plan: Starter
-- ============================================================

INSERT INTO subscription_plans (id, name, price_monthly, price_yearly, currency, modules, max_clients, max_staff, is_active)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Starter',
  49.00,
  490.00,
  'USD',
  ARRAY['clients', 'appointments', 'routines', 'nutrition'],
  100,
  5,
  TRUE
);

-- ============================================================
-- Demo Tenant: Centro Demo
-- ============================================================

INSERT INTO tenants (id, name, slug, timezone, locale, currency, is_active)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000002',
  'Centro Demo',
  'centro-demo',
  'America/Costa_Rica',
  'es-CR',
  'CRC',
  TRUE
);

-- Tenant subscription (trialing)
INSERT INTO tenant_subscriptions (
  tenant_id, plan_id, status, billing_cycle,
  current_period_start, current_period_end
)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'trialing',
  'monthly',
  NOW(),
  NOW() + INTERVAL '30 days'
);

-- Tenant modules
INSERT INTO tenant_modules (tenant_id, module, enabled) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000002', 'clients', TRUE),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'appointments', TRUE),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'routines', TRUE),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'nutrition', TRUE);

-- ============================================================
-- System Roles
-- ============================================================

INSERT INTO roles (id, name, description, is_system) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000010', 'admin',  'Administrador con control total del tenant', TRUE),
  ('a1b2c3d4-0000-0000-0000-000000000011', 'coach',  'Coach que gestiona clientes y citas', TRUE),
  ('a1b2c3d4-0000-0000-0000-000000000012', 'client', 'Cliente que recibe servicios', TRUE);

-- ============================================================
-- Permissions Catalog
-- ============================================================

-- Module: clients
INSERT INTO permissions (id, code, description, module) VALUES
  ('b1000001-0000-0000-0000-000000000001', 'clients.read',       'Ver clientes asignados', 'clients'),
  ('b1000001-0000-0000-0000-000000000002', 'clients.read_all',   'Ver todos los clientes del tenant', 'clients'),
  ('b1000001-0000-0000-0000-000000000003', 'clients.create',     'Crear nuevo cliente', 'clients'),
  ('b1000001-0000-0000-0000-000000000004', 'clients.update',     'Editar datos de cliente', 'clients'),
  ('b1000001-0000-0000-0000-000000000005', 'clients.delete',     'Eliminar/archivar cliente', 'clients'),
  ('b1000001-0000-0000-0000-000000000006', 'clients.notes.create', 'Agregar notas a clientes', 'clients'),
  ('b1000001-0000-0000-0000-000000000007', 'clients.files.upload', 'Subir archivos de clientes', 'clients');

-- Module: appointments
INSERT INTO permissions (id, code, description, module) VALUES
  ('b2000001-0000-0000-0000-000000000001', 'appointments.read',          'Ver citas propias', 'appointments'),
  ('b2000001-0000-0000-0000-000000000002', 'appointments.read_all',      'Ver todas las citas del tenant', 'appointments'),
  ('b2000001-0000-0000-0000-000000000003', 'appointments.create',        'Crear cita', 'appointments'),
  ('b2000001-0000-0000-0000-000000000004', 'appointments.edit',          'Editar cita', 'appointments'),
  ('b2000001-0000-0000-0000-000000000005', 'appointments.cancel',        'Cancelar cita', 'appointments'),
  ('b2000001-0000-0000-0000-000000000006', 'appointments.mark_complete', 'Marcar cita como completada', 'appointments');

-- Module: routines
INSERT INTO permissions (id, code, description, module) VALUES
  ('b3000001-0000-0000-0000-000000000001', 'routines.read',   'Ver rutinas', 'routines'),
  ('b3000001-0000-0000-0000-000000000002', 'routines.create', 'Crear rutina/plantilla', 'routines'),
  ('b3000001-0000-0000-0000-000000000003', 'routines.assign', 'Asignar rutina a cliente', 'routines'),
  ('b3000001-0000-0000-0000-000000000004', 'routines.edit',   'Editar rutina asignada', 'routines');

-- Module: nutrition
INSERT INTO permissions (id, code, description, module) VALUES
  ('b4000001-0000-0000-0000-000000000001', 'nutrition.read',   'Ver planes nutricionales', 'nutrition'),
  ('b4000001-0000-0000-0000-000000000002', 'nutrition.create', 'Crear plan/plantilla', 'nutrition'),
  ('b4000001-0000-0000-0000-000000000003', 'nutrition.assign', 'Asignar plan a cliente', 'nutrition'),
  ('b4000001-0000-0000-0000-000000000004', 'nutrition.edit',   'Editar plan asignado', 'nutrition');

-- Module: billing
INSERT INTO permissions (id, code, description, module) VALUES
  ('b5000001-0000-0000-0000-000000000001', 'billing.read',    'Ver historial de pagos', 'billing'),
  ('b5000001-0000-0000-0000-000000000002', 'billing.manage',  'Gestionar suscripciones y pagos', 'billing'),
  ('b5000001-0000-0000-0000-000000000003', 'billing.invoices','Ver y descargar facturas', 'billing');

-- Module: tenant
INSERT INTO permissions (id, code, description, module) VALUES
  ('b6000001-0000-0000-0000-000000000001', 'tenant.manage_users',    'Crear/editar/desactivar usuarios', 'tenant'),
  ('b6000001-0000-0000-0000-000000000002', 'tenant.manage_roles',    'Asignar roles', 'tenant'),
  ('b6000001-0000-0000-0000-000000000003', 'tenant.manage_settings', 'Configurar el tenant', 'tenant'),
  ('b6000001-0000-0000-0000-000000000004', 'tenant.manage_modules',  'Activar/desactivar módulos', 'tenant');

-- Module: messaging
INSERT INTO permissions (id, code, description, module) VALUES
  ('b7000001-0000-0000-0000-000000000001', 'messages.send', 'Enviar mensajes', 'messaging'),
  ('b7000001-0000-0000-0000-000000000002', 'messages.read', 'Leer mensajes propios', 'messaging');

-- Module: analytics
INSERT INTO permissions (id, code, description, module) VALUES
  ('b8000001-0000-0000-0000-000000000001', 'analytics.read', 'Ver analítica del tenant', 'analytics');

-- Module: ai
INSERT INTO permissions (id, code, description, module) VALUES
  ('b9000001-0000-0000-0000-000000000001', 'ai.use', 'Usar el asistente IA', 'ai');

-- ============================================================
-- Role → Permission Assignments
-- ============================================================

-- ADMIN: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a1b2c3d4-0000-0000-0000-000000000010', id FROM permissions;

-- COACH permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a1b2c3d4-0000-0000-0000-000000000011', id FROM permissions
WHERE code IN (
  'clients.read',
  'clients.create',
  'clients.update',
  'clients.notes.create',
  'clients.files.upload',
  'appointments.read',
  'appointments.create',
  'appointments.edit',
  'appointments.cancel',
  'appointments.mark_complete',
  'routines.read',
  'routines.create',
  'routines.assign',
  'routines.edit',
  'nutrition.read',
  'nutrition.create',
  'nutrition.assign',
  'nutrition.edit',
  'messages.send',
  'messages.read',
  'ai.use'
);

-- CLIENT permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a1b2c3d4-0000-0000-0000-000000000012', id FROM permissions
WHERE code IN (
  'appointments.read',
  'appointments.cancel',
  'billing.read',
  'messages.send',
  'messages.read',
  'ai.use'
);
