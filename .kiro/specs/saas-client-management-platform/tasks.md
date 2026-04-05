# Plan de Implementación: SaaS Client Management Platform

## Resumen

Plataforma SaaS móvil multi-tenant para centros multidisciplinarios (entrenamiento, nutrición, coaching). Stack: React Native + Expo + TypeScript, Supabase, Stripe, OpenAI. Modelo B2B + B2C con facturación electrónica CR.

---

## Sección 1: Definición del Alcance MVP

### MVP — Fase 1 (Obligatorio para primer lanzamiento, Sprints 1–12)

| Módulo | Estado |
|--------|--------|
| Monorepo + configuración base | ✅ MVP |
| Autenticación email/password + JWT | ✅ MVP |
| Multi-tenant + RBAC (Admin, Coach, Client) | ✅ MVP |
| Gestión de clientes (CRM básico) | ✅ MVP |
| Sistema de citas y calendario | ✅ MVP |
| Rutinas y planes nutricionales | ✅ MVP |
| Dashboards por rol | ✅ MVP |
| Panel de administración | ✅ MVP |
| Notificaciones push + email | ✅ MVP |
| Localización es-CR / en-US | ✅ MVP |
| Light/dark mode | ✅ MVP |
| Caché offline básico | ✅ MVP |

### V2 — Fase 2 (Sprints 13–24)

| Módulo | Estado |
|--------|--------|
| Mensajería en tiempo real (Supabase Realtime) | 🔵 V2 |
| Clases virtuales (WebRTC / Zoom) | 🔵 V2 |
| Pagos con Stripe (B2B + B2C) | 🔵 V2 |
| Suscripciones SaaS con feature toggles | 🔵 V2 |
| Analítica avanzada (churn, revenue) | 🔵 V2 |
| Offline robusto con resolución de conflictos | 🔵 V2 |

### V3 — Fase 3 (Sprints 25–36)

| Módulo | Estado |
|--------|--------|
| Facturación electrónica CR (Hacienda v4.3) | 🟣 V3 |
| AI Chatbot (OpenAI) | 🟣 V3 |
| Automatizaciones configurables | 🟣 V3 |
| Versión web (Next.js) | 🟣 V3 |

---

## Sección 2: Backlog Técnico por Épicas


### E1: Fundación del Monorepo y Configuración Base

- Objetivo: Establecer la estructura del monorepo con Turborepo + pnpm, configurar TypeScript base, y preparar el proyecto Supabase.
- Features: Turborepo, pnpm workspaces, tsconfig base, ESLint/Prettier, Supabase CLI, variables de entorno.
- Dependencias: Ninguna.
- Prioridad: P0
- Complejidad: M
- Criterios de aceptación técnicos:
  - `pnpm install` desde la raíz instala todas las dependencias sin errores.
  - `turbo build` compila todos los packages sin errores de TypeScript.
  - `supabase start` levanta el entorno local correctamente.
  - Las variables de entorno están definidas en `.env.example` y nunca en código fuente.

### E2: Autenticación y Multi-Tenant

- Objetivo: Implementar auth completo con Supabase Auth, resolución de tenant en login, y RBAC granular.
- Features: Registro, login, logout, refresh token, reset password, resolución de tenant, roles, permisos.
- Dependencias: E1
- Prioridad: P0
- Complejidad: L
- Criterios de aceptación técnicos:
  - JWT expira en 1h; refresh token en 30 días.
  - `auth.tenant_id()` retorna el tenant correcto para cualquier usuario autenticado.
  - `auth.has_permission('code')` retorna true/false correctamente según RBAC.
  - Rate limiting: máximo 10 intentos de login por email cada 15 minutos (HTTP 429).
  - Tokens almacenados en expo-secure-store, nunca en AsyncStorage.
  - RLS activo en todas las tablas con tenant_id.

### E3: Gestión de Clientes (CRM)

- Objetivo: CRUD completo de clientes con búsqueda, notas, archivos adjuntos e historial.
- Features: Crear/editar/archivar clientes, búsqueda full-text, notas privadas/públicas, upload de archivos (JPEG/PNG/PDF ≤20MB), historial de interacciones.
- Dependencias: E2
- Prioridad: P0
- Complejidad: M
- Criterios de aceptación técnicos:
  - Búsqueda retorna resultados en <1s para datasets de hasta 10,000 clientes.
  - Archivos >20MB son rechazados con error FILE_TOO_LARGE.
  - Notas privadas solo visibles para el autor y admins.
  - Todos los resultados de búsqueda pertenecen al tenant del usuario autenticado.

### E4: Sistema de Citas y Calendario

- Objetivo: Crear, editar, cancelar citas con validación de conflictos y vistas de calendario.
- Features: Edge Function create-appointment, vistas diaria/semanal/mensual, disponibilidad de coaches, cancelación, recordatorios 24h.
- Dependencias: E2, E3
- Prioridad: P0
- Complejidad: L
- Criterios de aceptación técnicos:
  - Conflicto de horario retorna HTTP 409 con detalles de la cita conflictiva.
  - Notificaciones enviadas en <60s tras crear/cancelar cita.
  - Recordatorio automático 24h antes via pg_cron.
  - Edición bloqueada 1h antes del inicio.

### E5: Rutinas y Planes Nutricionales

- Objetivo: CRUD de plantillas y asignación de rutinas/planes nutricionales a clientes con registro de progreso.
- Features: Plantillas reutilizables, asignación con copia de datos, registro de progreso (peso, medidas, fotos), gráficas.
- Dependencias: E3
- Prioridad: P0
- Complejidad: M
- Criterios de aceptación técnicos:
  - La asignación copia los ejercicios/comidas al momento de asignar (inmutable ante cambios en plantilla).
  - Progreso almacenado con timestamp y visible en gráfica cronológica.
  - Edge Function assign-routine verifica pertenencia del cliente al tenant.

### E6: Dashboards por Rol

- Objetivo: Pantallas de dashboard personalizadas para Admin, Coach y Client con métricas relevantes.
- Features: Dashboard Admin (métricas tenant-wide), Dashboard Coach (citas próximas, clientes asignados), Dashboard Client (próxima cita, rutina activa, plan nutricional).
- Dependencias: E2, E3, E4, E5
- Prioridad: P0
- Complejidad: M
- Criterios de aceptación técnicos:
  - Datos cargan en <3s en conexión 4G estándar.
  - Skeleton loading visible durante carga.
  - Datos cacheados con TanStack Query (staleTime 5min).

### E7: Panel de Administración

- Objetivo: Sección exclusiva para Admin con gestión de usuarios, roles, módulos y analítica básica.
- Features: CRUD de usuarios, asignación de roles, activación/desactivación de módulos, analítica básica (revenue mensual, citas semanales, clientes activos).
- Dependencias: E2, E3
- Prioridad: P0
- Complejidad: M
- Criterios de aceptación técnicos:
  - Desactivar usuario revoca todas sus sesiones activas inmediatamente.
  - Cambio de rol aplica en el siguiente refresh de sesión.
  - Solo usuarios con rol admin pueden acceder a esta sección (RLS + RBAC).

### E8: Notificaciones (Push + Email)

- Objetivo: Sistema de notificaciones push (FCM/APNs) y email (Resend) con preferencias por usuario.
- Features: Edge Function send-notification, registro de device tokens, preferencias de notificación, log de entregas.
- Dependencias: E2
- Prioridad: P0
- Complejidad: M
- Criterios de aceptación técnicos:
  - Push entregado en <60s bajo condiciones normales de red.
  - Preferencias de usuario respetadas: si desactiva un tipo, no recibe ese tipo.
  - Log de notificaciones con estado (delivered/failed) almacenado en DB.

### E9: Mensajería en Tiempo Real (V2)

- Objetivo: Chat 1:1 entre Coach y Client usando Supabase Realtime.
- Features: Conversaciones directas, historial paginado (50 mensajes iniciales), push para mensajes en background, cola offline.
- Dependencias: E2, E8
- Prioridad: P1
- Complejidad: L
- Criterios de aceptación técnicos:
  - Mensaje entregado en <2s en sesión activa.
  - Solo participantes de la conversación pueden leer mensajes (RLS).
  - Mensajes encolados offline se sincronizan al reconectar.

### E10: Clases Virtuales (V2)

- Objetivo: Programar y gestionar clases virtuales con inscripción y asistencia.
- Features: CRUD de clases, integración WebRTC/Zoom, inscripción de clientes, registro de asistencia.
- Dependencias: E4, E8
- Prioridad: P1
- Complejidad: XL
- Criterios de aceptación técnicos:
  - URL de sala generada automáticamente al crear clase.
  - Asistencia registrada con join_timestamp.
  - Notificación enviada a inscritos en <60s tras crear clase.

### E11: Pagos con Stripe (V2)

- Objetivo: Procesar pagos B2B (suscripción SaaS) y B2C (cobros a clientes) via Stripe.
- Features: Edge Functions create-checkout-session + stripe-webhook, historial de pagos, suscripciones mensuales/anuales.
- Dependencias: E2, E7
- Prioridad: P1
- Complejidad: L
- Criterios de aceptación técnicos:
  - Webhook payment_intent.succeeded actualiza estado en <10s.
  - Nunca se almacenan números de tarjeta ni CVV en DB.
  - Firma HMAC del webhook verificada antes de procesar.

### E12: Suscripciones SaaS (V2)

- Objetivo: Feature toggles por plan, límites de clientes/staff, portal de gestión de suscripción.
- Features: tenant_modules dinámico, enforcement de límites, UI adaptativa según módulos habilitados.
- Dependencias: E11
- Prioridad: P1
- Complejidad: M
- Criterios de aceptación técnicos:
  - Módulo deshabilitado retorna TEN_001 para cualquier usuario del tenant.
  - Límites de clientes/staff enforced en Edge Functions.

### E13: Facturación Electrónica CR (V3)

- Objetivo: Generar facturas electrónicas conformes a Hacienda v4.3 y enviarlas automáticamente.
- Features: Edge Function generate-invoice, XML Hacienda, firma digital, PDF, envío por email, número consecutivo único.
- Dependencias: E11
- Prioridad: P2
- Complejidad: XL
- Criterios de aceptación técnicos:
  - XML válido según esquema Hacienda v4.3.
  - Número consecutivo único por tenant (Property 10).
  - PDF generado y enviado al cliente en <5min tras aceptación.
  - Rechazo de Hacienda notifica al Admin en <60s.

### E14: AI Chatbot (V3)

- Objetivo: Asistente IA con contexto del usuario usando OpenAI gpt-4o-mini.
- Features: Edge Function ai-assistant, interfaz de chat persistente, contexto de rol + citas + planes, fallback si OpenAI no disponible.
- Dependencias: E2, E4, E5
- Prioridad: P2
- Complejidad: M
- Criterios de aceptación técnicos:
  - Respuesta en <10s.
  - No expone datos de otros usuarios.
  - Mantiene contexto de últimos 10 intercambios.
  - Fallback message si OpenAI no disponible.

### E15: Versión Web (V3)

- Objetivo: App web Next.js que reutiliza packages/services, packages/types y el mismo backend Supabase.
- Features: Scaffolding apps/web, adaptación de packages/ui de NativeWind a Tailwind CSS, paridad funcional con mobile.
- Dependencias: E1–E8 completados
- Prioridad: P2
- Complejidad: XL
- Criterios de aceptación técnicos:
  - packages/services y packages/types importados sin modificaciones.
  - Mismo backend Supabase sin cambios de schema.
  - Auth flow idéntico al mobile.

---

## Sección 3: Plan de Sprints


### Sprint 1–2: Fundación (Semanas 1–4)

- Duración: 4 semanas (2 sprints de 2 semanas)
- Entregables:
  - Monorepo funcional con Turborepo + pnpm workspaces
  - packages/types, packages/services, packages/ui scaffolding
  - Supabase local + migraciones: tenants, profiles, roles, user_roles, permissions, role_permissions, device_tokens
  - Auth completo: registro, login, logout, refresh, reset password
  - Resolución de tenant en login
  - Expo Router: layout raíz, grupos (auth), (admin), (coach), (client)
  - Zustand stores: auth.store, tenant.store
  - Pantallas: Login, Register, ForgotPassword
- Dependencias: Ninguna
- Riesgos: Configuración de Supabase Auth con custom claims para tenant_id puede requerir Edge Function adicional.
- Definition of Done: `pnpm turbo build` sin errores; login funcional en simulador iOS y Android; RLS activo en tablas base.

### Sprint 3–4: Clientes y Staff (Semanas 5–8)

- Duración: 4 semanas
- Entregables:
  - Migraciones: clients, staff_profiles, client_notes, client_files
  - CRUD completo de clientes (crear, editar, archivar, buscar)
  - Búsqueda full-text con índice GIN
  - Upload de archivos a Supabase Storage (bucket: client-files)
  - Notas con visibilidad privada/pública
  - Pantallas: ClientList, ClientDetail, ClientForm, ClientNotes, ClientFiles
  - RLS completo para módulo de clientes
- Dependencias: Sprint 1–2
- Riesgos: Búsqueda full-text en español requiere configuración de diccionario `spanish` en PostgreSQL.
- Definition of Done: Búsqueda retorna resultados en <1s; archivos >20MB rechazados; notas privadas no visibles para coaches no autorizados.

### Sprint 5–6: Citas y Calendario (Semanas 9–12)

- Duración: 4 semanas
- Entregables:
  - Migraciones: availability_slots, appointments, appointment_participants
  - Edge Function: create-appointment (validación de conflictos + notificaciones)
  - Vistas de calendario: diaria, semanal, mensual
  - Gestión de disponibilidad de coaches
  - Cancelación y edición de citas
  - Pantallas: CalendarView, AppointmentDetail, AppointmentForm, AvailabilitySettings
- Dependencias: Sprint 3–4
- Riesgos: Lógica de detección de conflictos con tsrange puede ser compleja con zonas horarias; usar TIMESTAMPTZ consistentemente.
- Definition of Done: Conflicto retorna HTTP 409; notificaciones enviadas en <60s; edición bloqueada 1h antes.

### Sprint 7–8: Rutinas y Nutrición (Semanas 13–16)

- Duración: 4 semanas
- Entregables:
  - Migraciones: routine_templates, routine_assignments, nutrition_templates, nutrition_assignments, progress_entries
  - Edge Function: assign-routine, assign-nutrition-plan
  - CRUD de plantillas de rutinas y planes nutricionales
  - Asignación a clientes con copia inmutable de datos
  - Registro de progreso (peso, medidas, fotos)
  - Gráficas de progreso con react-native-gifted-charts o Victory Native
  - Pantallas: RoutineList, RoutineDetail, RoutineForm, NutritionPlanList, NutritionPlanDetail, ProgressLog, ProgressChart
- Dependencias: Sprint 3–4
- Riesgos: JSONB para exercises/meals requiere validación estricta en Edge Functions para evitar datos corruptos.
- Definition of Done: Asignación preserva copia de ejercicios (Property 15); progreso visible en gráfica cronológica.

### Sprint 9–10: Notificaciones y Dashboards (Semanas 17–20)

- Duración: 4 semanas
- Entregables:
  - Migraciones: notifications, notification_preferences
  - Edge Function: send-notification (FCM + APNs + Resend email)
  - Registro de device tokens en login
  - Preferencias de notificación por usuario
  - pg_cron para recordatorios 24h
  - Dashboard Admin: métricas tenant-wide
  - Dashboard Coach: citas próximas, clientes asignados
  - Dashboard Client: próxima cita, rutina activa, plan nutricional
  - Pantallas: AdminDashboard, CoachDashboard, ClientDashboard, NotificationPreferences
- Dependencias: Sprint 5–6, Sprint 7–8
- Riesgos: Configuración de APNs requiere certificados p8 y Apple Developer account activa.
- Definition of Done: Push entregado en <60s; preferencias respetadas (Property 6); dashboards cargan en <3s.

### Sprint 11–12: Admin Panel + Pulido MVP (Semanas 21–24)

- Duración: 4 semanas
- Entregables:
  - Panel Admin: gestión de usuarios (crear, editar, desactivar), asignación de roles, activación de módulos
  - Analítica básica: revenue mensual, citas semanales, clientes activos
  - Localización completa es-CR / en-US (i18next)
  - Light/dark mode con NativeWind
  - Caché offline básico (TanStack Query + MMKV)
  - Manejo de errores con mensajes en idioma del usuario
  - Confirmación en acciones destructivas
  - Pantallas: UserManagement, RoleAssignment, ModuleSettings, Analytics, LanguageSettings, ThemeSettings
- Dependencias: Sprint 9–10
- Riesgos: Revocación inmediata de sesiones al desactivar usuario requiere invalidación de JWT en Supabase (custom hook o Edge Function).
- Definition of Done: MVP completo y funcional; todos los tests pasan; app instalable en TestFlight y Google Play Internal Testing.

### Sprint 13–14: Mensajería Realtime (Semanas 25–28) — V2

- Duración: 4 semanas
- Entregables:
  - Migraciones: conversations, conversation_participants, messages
  - Supabase Realtime subscriptions para mensajes
  - Historial paginado (50 mensajes iniciales)
  - Push notifications para mensajes en background
  - Cola offline para mensajes sin conexión
  - Pantallas: ConversationList, ChatScreen
- Dependencias: Sprint 11–12
- Riesgos: Supabase Realtime tiene límites de conexiones concurrentes por plan.
- Definition of Done: Mensaje entregado en <2s; solo participantes pueden leer mensajes (Property 8).

### Sprint 15–16: Clases Virtuales (Semanas 29–32) — V2

- Duración: 4 semanas
- Entregables:
  - Migraciones: virtual_classes, virtual_class_enrollments
  - CRUD de clases virtuales
  - Integración WebRTC (Daily.co o similar) o Zoom API
  - Inscripción y registro de asistencia
  - Pantallas: VirtualClassList, VirtualClassDetail, VirtualClassForm
- Dependencias: Sprint 13–14
- Riesgos: Integración WebRTC en React Native requiere librería nativa (react-native-webrtc); puede tener issues en Expo Go.
- Definition of Done: URL de sala generada automáticamente; asistencia registrada con timestamp.

### Sprint 17–18: Pagos Stripe (Semanas 33–36) — V2

- Duración: 4 semanas
- Entregables:
  - Migraciones: billing_customers, payments
  - Edge Functions: create-checkout-session, stripe-webhook
  - Flujo de pago B2B (suscripción SaaS) y B2C (cobro a cliente)
  - Historial de pagos
  - Pantallas: PaymentHistory, CheckoutScreen, SubscriptionManagement
- Dependencias: Sprint 11–12
- Riesgos: Stripe Checkout en mobile requiere WebView o Stripe React Native SDK; evaluar ambas opciones.
- Definition of Done: Webhook actualiza estado en <10s; nunca se almacenan datos de tarjeta (Property 9).

---

## Sección 4: Fundación Backend Supabase


### 4.1 Enums PostgreSQL

```sql
-- supabase/migrations/001_enums.sql

CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE appointment_type AS ENUM ('in_person', 'virtual');
CREATE TYPE participant_role AS ENUM ('client', 'coach', 'observer');
CREATE TYPE client_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE routine_status AS ENUM ('active', 'completed', 'paused');
CREATE TYPE notification_channel AS ENUM ('push', 'email', 'in_app');
CREATE TYPE notification_status AS ENUM ('pending', 'delivered', 'failed');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
CREATE TYPE invoice_status AS ENUM ('draft', 'submitted', 'accepted', 'rejected', 'cancelled');
CREATE TYPE invoice_type AS ENUM ('FE', 'TE', 'NC', 'ND');
CREATE TYPE id_type AS ENUM ('cedula', 'dimex', 'nite', 'passport');
CREATE TYPE platform_type AS ENUM ('ios', 'android');
CREATE TYPE progress_entry_type AS ENUM ('weight', 'body_measurement', 'workout_completion', 'photo');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'login', 'logout');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed');
CREATE TYPE conversation_type AS ENUM ('direct', 'group');
CREATE TYPE virtual_class_status AS ENUM ('scheduled', 'live', 'completed', 'cancelled');
CREATE TYPE video_provider AS ENUM ('webrtc', 'zoom');
```

### 4.2 Tablas Core (Schema Completo)

Las tablas están definidas en el documento de diseño (Sección 3). A continuación se listan los índices críticos y constraints adicionales.

### 4.3 Índices Críticos para Performance

```sql
-- supabase/migrations/002_indexes.sql

-- Tenant isolation (todas las tablas con tenant_id)
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_coach ON appointments(coach_id, start_time);
CREATE INDEX idx_appointments_status ON appointments(tenant_id, status, start_time);
CREATE INDEX idx_appointment_participants_user ON appointment_participants(user_id);
CREATE INDEX idx_routine_assignments_client ON routine_assignments(client_id, status);
CREATE INDEX idx_nutrition_assignments_client ON nutrition_assignments(client_id, status);
CREATE INDEX idx_progress_entries_client ON progress_entries(client_id, recorded_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_status ON notifications(status) WHERE status = 'pending';
CREATE INDEX idx_messages_conversation ON messages(conversation_id, sent_at DESC);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_payments_tenant ON payments(tenant_id, created_at DESC);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id, created_at DESC);
CREATE INDEX idx_device_tokens_user ON device_tokens(user_id) WHERE is_active = TRUE;

-- Búsqueda full-text de clientes (español)
CREATE INDEX idx_profiles_fulltext ON profiles
  USING GIN(to_tsvector('spanish', full_name));

-- Disponibilidad de coaches
CREATE INDEX idx_availability_slots_coach ON availability_slots(coach_id, day_of_week)
  WHERE is_active = TRUE;

-- Conflictos de citas (range overlap)
CREATE INDEX idx_appointments_time_range ON appointments
  USING GIST(tstzrange(start_time, end_time))
  WHERE status IN ('scheduled', 'confirmed');
```

### 4.4 Estrategia RLS

```sql
-- supabase/migrations/003_rls.sql

-- Helper functions
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.has_permission(permission_code TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = auth.tenant_id()
      AND p.code = permission_code
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Patrón base para todas las tablas con tenant_id:
-- 1. Habilitar RLS
-- 2. Política de aislamiento de tenant (SELECT/UPDATE/DELETE)
-- 3. Políticas específicas por operación y rol

-- Ejemplo: profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_tenant_isolation" ON profiles
  USING (tenant_id = auth.tenant_id());
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Ejemplo: clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_tenant_isolation" ON clients
  USING (tenant_id = auth.tenant_id());
CREATE POLICY "clients_read" ON clients
  FOR SELECT USING (
    tenant_id = auth.tenant_id()
    AND (
      auth.has_permission('clients.read_all')
      OR assigned_coach = auth.uid()
      OR id = auth.uid()
    )
  );
CREATE POLICY "clients_write" ON clients
  FOR INSERT WITH CHECK (
    tenant_id = auth.tenant_id()
    AND auth.has_permission('clients.create')
  );

-- Ejemplo: appointments (ver diseño para política completa)
-- Ejemplo: messages (solo participantes de conversación)
-- Ejemplo: client_notes (notas privadas solo para autor y admin)
-- [Ver Sección 4 del documento de diseño para políticas completas]
```

### 4.5 Storage Buckets

```sql
-- Configurar via Supabase Dashboard o CLI

-- bucket: avatars
-- Acceso: público (URLs firmadas para lectura)
-- Políticas: usuario puede subir/actualizar su propio avatar
-- Path: {tenant_id}/{user_id}/avatar.{ext}

-- bucket: client-files
-- Acceso: privado (URLs firmadas)
-- Políticas: coach asignado y admin pueden leer/escribir
-- Path: {tenant_id}/{client_id}/{file_id}.{ext}
-- Límite: 20MB por archivo

-- bucket: invoices
-- Acceso: privado
-- Políticas: admin del tenant puede leer; cliente puede leer sus propias facturas
-- Path: {tenant_id}/invoices/{invoice_id}.pdf

-- bucket: progress-photos
-- Acceso: privado
-- Políticas: cliente puede subir sus propias fotos; coach asignado puede leer
-- Path: {tenant_id}/{client_id}/progress/{timestamp}.{ext}
```

### 4.6 Edge Functions MVP

| Nombre | Trigger | Input | Output | Lógica |
|--------|---------|-------|--------|--------|
| `create-appointment` | POST /functions/v1/create-appointment | CreateAppointmentInput | Appointment \| ConflictError | Verificar JWT, permiso, conflictos con tsrange, INSERT en transacción, encolar notificaciones, audit log |
| `assign-routine` | POST /functions/v1/assign-routine | AssignRoutineInput | RoutineAssignment | Verificar permiso routines.assign, verificar cliente del tenant, copiar ejercicios de plantilla si aplica, INSERT, notificar cliente |
| `assign-nutrition-plan` | POST /functions/v1/assign-nutrition-plan | AssignNutritionInput | NutritionAssignment | Igual que assign-routine para planes nutricionales |
| `send-notification` | POST /functions/v1/send-notification | SendNotificationInput | void | Verificar preferencias por usuario, enviar FCM/APNs para push, Resend para email, registrar en notifications |
| `send-appointment-reminders` | POST /functions/v1/send-appointment-reminders (pg_cron cada hora) | void | void | Buscar citas en próximas 24h sin recordatorio enviado, llamar send-notification para cada participante |
| `revoke-user-sessions` | POST /functions/v1/revoke-user-sessions | { user_id: string } | void | Usar service_role para invalidar todas las sesiones del usuario via Supabase Admin API |

---

## Sección 5: Arquitectura Frontend Mobile

### 5.1 Estructura de Carpetas

```
apps/mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx               # Root layout: providers, auth guard
│   ├── index.tsx                 # Redirect según sesión
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (admin)/
│   │   ├── _layout.tsx           # Tab layout para admin
│   │   ├── index.tsx             # Dashboard admin
│   │   ├── clients/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   └── new.tsx
│   │   ├── appointments/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── staff/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── settings/
│   │   │   ├── index.tsx
│   │   │   ├── users.tsx
│   │   │   ├── roles.tsx
│   │   │   └── modules.tsx
│   │   └── analytics.tsx
│   ├── (coach)/
│   │   ├── _layout.tsx           # Tab layout para coach
│   │   ├── index.tsx             # Dashboard coach
│   │   ├── clients/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   ├── [id]/notes.tsx
│   │   │   ├── [id]/files.tsx
│   │   │   ├── [id]/routines.tsx
│   │   │   └── [id]/nutrition.tsx
│   │   ├── appointments/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   └── new.tsx
│   │   ├── routines/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   └── new.tsx
│   │   ├── nutrition/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   └── new.tsx
│   │   └── availability.tsx
│   └── (client)/
│       ├── _layout.tsx           # Tab layout para client
│       ├── index.tsx             # Dashboard client
│       ├── appointments/
│       │   ├── index.tsx
│       │   └── [id].tsx
│       ├── routine.tsx
│       ├── nutrition.tsx
│       ├── progress/
│       │   ├── index.tsx
│       │   └── log.tsx
│       ├── messages/
│       │   ├── index.tsx
│       │   └── [conversationId].tsx
│       └── profile.tsx
├── components/
│   ├── appointments/
│   │   ├── AppointmentCard.tsx
│   │   ├── CalendarView.tsx
│   │   └── ConflictAlert.tsx
│   ├── clients/
│   │   ├── ClientCard.tsx
│   │   ├── ClientSearchBar.tsx
│   │   └── ClientStatusBadge.tsx
│   ├── routines/
│   │   ├── ExerciseItem.tsx
│   │   └── RoutineCard.tsx
│   ├── nutrition/
│   │   ├── MealItem.tsx
│   │   └── NutritionCard.tsx
│   ├── progress/
│   │   └── ProgressChart.tsx
│   ├── notifications/
│   │   └── NotificationBell.tsx
│   └── shared/
│       ├── ConfirmDialog.tsx
│       ├── ErrorMessage.tsx
│       ├── SkeletonLoader.tsx
│       └── OfflineBanner.tsx
├── hooks/
│   ├── useAppointments.ts
│   ├── useClients.ts
│   ├── useRoutines.ts
│   ├── useNutrition.ts
│   ├── useNotifications.ts
│   ├── useOffline.ts
│   └── usePermission.ts
├── store/
│   ├── auth.store.ts
│   ├── tenant.store.ts
│   └── offline.store.ts
├── constants/
│   ├── colors.ts
│   ├── typography.ts
│   └── spacing.ts
├── i18n/
│   ├── index.ts
│   └── locales/
│       ├── es-CR.json
│       └── en-US.json
└── app.json
```

### 5.2 Arquitectura de Navegación (Expo Router)

```typescript
// app/_layout.tsx — Root layout con auth guard
import { useAuthStore } from '@/store/auth.store'
import { Redirect, Slot } from 'expo-router'

export default function RootLayout() {
  const { session, user, isLoading } = useAuthStore()

  if (isLoading) return <SplashScreen />
  if (!session) return <Redirect href="/(auth)/login" />

  // Redirigir según rol
  const role = user?.primaryRole
  if (role === 'admin') return <Redirect href="/(admin)" />
  if (role === 'coach') return <Redirect href="/(coach)" />
  return <Redirect href="/(client)" />
}

// app/(admin)/_layout.tsx — Tabs para admin
import { Tabs } from 'expo-router'
export default function AdminLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="clients" options={{ title: 'Clientes' }} />
      <Tabs.Screen name="appointments" options={{ title: 'Citas' }} />
      <Tabs.Screen name="settings" options={{ title: 'Configuración' }} />
    </Tabs>
  )
}
```

### 5.3 Zustand Stores

```typescript
// store/auth.store.ts
interface AuthStore {
  user: Profile | null
  session: Session | null
  permissions: string[]
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  hasPermission: (code: string) => boolean
}

// store/tenant.store.ts
interface TenantStore {
  tenant: Tenant | null
  enabledModules: string[]
  isModuleEnabled: (module: string) => boolean
  loadTenant: (tenantId: string) => Promise<void>
}

// store/offline.store.ts
interface OfflineStore {
  isOnline: boolean
  pendingActions: PendingAction[]
  cachedDashboard: DashboardData | null
  cachedAppointments: Appointment[]
  queueAction: (action: PendingAction) => void
  syncPending: () => Promise<void>
}

interface PendingAction {
  id: string
  type: 'send_message' | 'log_progress' | 'add_note'
  payload: unknown
  created_at: number
  retry_count: number
}
```

### 5.4 TanStack Query — Query Keys y Configuración

```typescript
// hooks/queryKeys.ts
export const queryKeys = {
  dashboard: (userId: string) => ['dashboard', userId] as const,
  appointments: {
    upcoming: (userId: string, days: number) => ['appointments', 'upcoming', userId, days] as const,
    byCoach: (coachId: string, from: string, to: string) => ['appointments', 'coach', coachId, from, to] as const,
    detail: (id: string) => ['appointments', id] as const,
  },
  clients: {
    list: (tenantId: string, query?: string) => ['clients', tenantId, query] as const,
    detail: (id: string) => ['clients', id] as const,
    notes: (clientId: string) => ['clients', clientId, 'notes'] as const,
    files: (clientId: string) => ['clients', clientId, 'files'] as const,
  },
  routines: {
    templates: (tenantId: string) => ['routines', 'templates', tenantId] as const,
    assignment: (clientId: string) => ['routines', 'assignment', clientId] as const,
  },
  nutrition: {
    templates: (tenantId: string) => ['nutrition', 'templates', tenantId] as const,
    assignment: (clientId: string) => ['nutrition', 'assignment', clientId] as const,
  },
  progress: (clientId: string) => ['progress', clientId] as const,
}

// Configuración global
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 3,
      networkMode: 'offlineFirst',
    },
  },
})
```

### 5.5 Auth y Manejo de Sesión

```typescript
// packages/services/src/auth.service.ts
import { supabase } from './supabase'
import * as SecureStore from 'expo-secure-store'

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    // Almacenar tokens en SecureStore (nunca AsyncStorage)
    await SecureStore.setItemAsync('refresh_token', data.session.refresh_token)

    // Cargar perfil + tenant + roles
    const profile = await this.loadProfile(data.user.id)
    return { session: data.session, profile }
  },

  async loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select(`*, user_roles(role_id, roles(name))`)
      .eq('id', userId)
      .single()
    return data
  },

  async refreshSession() {
    const refreshToken = await SecureStore.getItemAsync('refresh_token')
    if (!refreshToken) throw new Error('No refresh token')
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
    if (error) throw error
    return data.session
  },

  async signOut() {
    await supabase.auth.signOut()
    await SecureStore.deleteItemAsync('refresh_token')
  },
}
```

### 5.6 Theming con NativeWind

```typescript
// constants/colors.ts
export const colors = {
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    900: '#1e3a8a',
  },
  success: { 500: '#22c55e' },
  warning: { 500: '#f59e0b' },
  error: { 500: '#ef4444' },
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    800: '#1f2937',
    900: '#111827',
  },
}

// tailwind.config.js
module.exports = {
  content: ['./app/**/*.tsx', './components/**/*.tsx'],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        // ...
      },
    },
  },
  plugins: [],
}
```

### 5.7 i18n (i18next)

```typescript
// i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import esCR from './locales/es-CR.json'
import enUS from './locales/en-US.json'

i18n.use(initReactI18next).init({
  resources: {
    'es-CR': { translation: esCR },
    'en-US': { translation: enUS },
  },
  lng: 'es-CR',
  fallbackLng: 'es-CR',
  interpolation: { escapeValue: false },
})

// i18n/locales/es-CR.json (estructura)
{
  "auth": {
    "login": "Iniciar sesión",
    "register": "Registrarse",
    "email": "Correo electrónico",
    "password": "Contraseña",
    "forgotPassword": "¿Olvidaste tu contraseña?",
    "errors": {
      "invalidCredentials": "Correo o contraseña incorrectos",
      "rateLimitExceeded": "Demasiados intentos. Intenta en 15 minutos."
    }
  },
  "appointments": {
    "title": "Citas",
    "new": "Nueva cita",
    "conflict": "Conflicto de horario: el coach ya tiene una cita de {{start}} a {{end}}"
  }
}
```

### 5.8 Estrategia de Caché Offline

| Dato | Librería | TTL |
|------|----------|-----|
| Dashboard data | TanStack Query + MMKV | 5 min |
| Citas próximas (7 días) | TanStack Query + MMKV | 15 min |
| Rutina activa | TanStack Query + MMKV | 1 hora |
| Plan nutricional activo | TanStack Query + MMKV | 1 hora |
| Perfil del usuario | Zustand persist + MMKV | sesión |
| Mensajes recientes (50) | TanStack Query + MMKV | 5 min |

```typescript
// Configurar MMKV como storage para TanStack Query
import { MMKV } from 'react-native-mmkv'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

const storage = new MMKV()
const persister = createSyncStoragePersister({
  storage: {
    getItem: (key) => storage.getString(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
})

persistQueryClient({ queryClient, persister, maxAge: 24 * 60 * 60 * 1000 })
```

---

## Sección 6: Arquitectura Compartida para Web Futura


### 6.1 packages/types

Tipos TypeScript agnósticos de plataforma. Importados por mobile y web sin modificaciones.

```typescript
// packages/types/src/tenant.ts
export interface Tenant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  timezone: string
  locale: string
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TenantModule {
  id: string
  tenant_id: string
  module: string
  enabled: boolean
}

// packages/types/src/user.ts
export interface Profile {
  id: string
  tenant_id: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  date_of_birth: string | null
  locale: string
  theme: 'system' | 'light' | 'dark'
  is_active: boolean
  primaryRole?: 'admin' | 'coach' | 'client'
}

// packages/types/src/appointment.ts
export interface Appointment {
  id: string
  tenant_id: string
  coach_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  location: string | null
  virtual_link: string | null
  appointment_type: 'in_person' | 'virtual'
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  created_at: string
}

export interface CreateAppointmentRequest {
  coach_id: string
  client_ids: string[]
  title: string
  start_time: string
  end_time: string
  location?: string
  virtual_link?: string
  appointment_type: 'in_person' | 'virtual'
}

export interface ConflictError {
  code: 'APPOINTMENT_CONFLICT'
  conflicting_appointment: Pick<Appointment, 'id' | 'start_time' | 'end_time' | 'title'>
}

// packages/types/src/errors.ts
export enum AppErrorCode {
  INVALID_CREDENTIALS = 'AUTH_001',
  SESSION_EXPIRED = 'AUTH_002',
  INSUFFICIENT_PERMISSIONS = 'AUTH_003',
  RATE_LIMIT_EXCEEDED = 'AUTH_004',
  APPOINTMENT_CONFLICT = 'APT_001',
  APPOINTMENT_EDIT_WINDOW_CLOSED = 'APT_002',
  FILE_TOO_LARGE = 'FILE_001',
  FILE_TYPE_NOT_ALLOWED = 'FILE_002',
  PAYMENT_FAILED = 'PAY_001',
  HACIENDA_REJECTED = 'INV_001',
  TENANT_MODULE_DISABLED = 'TEN_001',
  VALIDATION_ERROR = 'GEN_001',
  NOT_FOUND = 'GEN_002',
  INTERNAL_ERROR = 'GEN_003',
}

export interface AppError {
  code: AppErrorCode
  message: string
  details?: unknown
}
```

### 6.2 packages/validations (Zod)

```typescript
// packages/validations/src/appointment.schema.ts
import { z } from 'zod'

export const createAppointmentSchema = z.object({
  coach_id: z.string().uuid(),
  client_ids: z.array(z.string().uuid()).min(1),
  title: z.string().min(1).max(200),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  location: z.string().max(500).optional(),
  virtual_link: z.string().url().optional(),
  appointment_type: z.enum(['in_person', 'virtual']),
}).refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  { message: 'end_time debe ser posterior a start_time', path: ['end_time'] }
)

// packages/validations/src/client.schema.ts
export const createClientSchema = z.object({
  full_name: z.string().min(2).max(200),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[\d\s\-()]{7,20}$/).optional(),
  date_of_birth: z.string().date().optional(),
  emergency_contact_name: z.string().max(200).optional(),
  emergency_contact_phone: z.string().optional(),
  medical_notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).default([]),
})

// packages/validations/src/file.schema.ts
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

export const fileUploadSchema = z.object({
  file_name: z.string(),
  file_type: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
  file_size: z.number().max(MAX_FILE_SIZE, 'Archivo excede el límite de 20MB'),
})
```

### 6.3 packages/services

```typescript
// packages/services/src/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@packages/types/database'

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// packages/services/src/appointment.service.ts
import { supabase } from './supabase'
import type { Appointment, CreateAppointmentRequest } from '@packages/types'

export const appointmentService = {
  // Lectura directa (Supabase client con RLS)
  async getUpcoming(userId: string, days: number): Promise<Appointment[]> {
    const from = new Date().toISOString()
    const to = new Date(Date.now() + days * 86400000).toISOString()
    const { data, error } = await supabase
      .from('appointments')
      .select('*, appointment_participants(*)')
      .gte('start_time', from)
      .lte('start_time', to)
      .in('status', ['scheduled', 'confirmed'])
      .order('start_time')
    if (error) throw error
    return data
  },

  // Escritura via Edge Function (validación de conflictos server-side)
  async create(input: CreateAppointmentRequest): Promise<Appointment> {
    const { data, error } = await supabase.functions.invoke('create-appointment', {
      body: input,
    })
    if (error) throw error
    return data.appointment
  },

  async cancel(id: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', cancellation_reason: reason, cancelled_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },
}

// packages/services/src/client.service.ts
export const clientService = {
  async search(query: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, clients(*)')
      .textSearch('full_name', query, { config: 'spanish' })
      .limit(20)
    if (error) throw error
    return data
  },

  async uploadFile(clientId: string, file: { name: string; type: string; size: number; uri: string }) {
    // Validar tamaño antes de subir
    if (file.size > 20 * 1024 * 1024) {
      throw { code: 'FILE_TOO_LARGE', message: 'El archivo excede el límite de 20MB' }
    }
    const path = `${clientId}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('client-files').upload(path, file)
    if (error) throw error
    return path
  },
}
```

### 6.4 Reglas de Negocio Compartidas

Las reglas de negocio críticas viven en `packages/services` y son reutilizadas por mobile, web y Edge Functions:

- `checkAppointmentConflict(existingAppointments, newStart, newEnd)` — Property 5
- `validateFileUpload(file)` — Property 7
- `generateInvoiceNumber(tenantId, sequence)` — Property 10
- `hasPermission(userPermissions, requiredPermission)` — Property 4

---

## Sección 7: Primer Milestone de Código (Semana 1)

### 7.1 Scaffolding del Proyecto

```bash
# 1. Crear directorio raíz
mkdir saas-client-management-platform && cd saas-client-management-platform

# 2. Inicializar pnpm workspace
pnpm init
echo "packages:\n  - 'apps/*'\n  - 'packages/*'" > pnpm-workspace.yaml

# 3. Instalar Turborepo
pnpm add -D turbo -w

# 4. Crear apps/mobile con Expo
mkdir -p apps/mobile
cd apps/mobile
npx create-expo-app@latest . --template blank-typescript
cd ../..

# 5. Crear packages
mkdir -p packages/types/src packages/services/src packages/validations/src packages/ui/src

# 6. Inicializar Supabase
npx supabase init
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

```json
// package.json (raíz)
{
  "name": "saas-client-management-platform",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.3.0"
  }
}
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### 7.2 Packages Iniciales

```json
// packages/types/package.json
{
  "name": "@platform/types",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": { "build": "tsc" }
}

// packages/services/package.json
{
  "name": "@platform/services",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "dependencies": {
    "@platform/types": "workspace:*",
    "@supabase/supabase-js": "^2.39.0"
  }
}

// packages/validations/package.json
{
  "name": "@platform/validations",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "dependencies": {
    "@platform/types": "workspace:*",
    "zod": "^3.22.0"
  }
}
```

### 7.3 Auth Base

```typescript
// packages/services/src/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: undefined, // Se configura en mobile con SecureStore
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// apps/mobile/store/auth.store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'
import { supabase } from '@platform/services'
import type { Profile } from '@platform/types'
import type { Session } from '@supabase/supabase-js'

interface AuthState {
  user: Profile | null
  session: Session | null
  permissions: string[]
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  hasPermission: (code: string) => boolean
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  permissions: [],
  isLoading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const profile = await loadProfile(session.user.id)
      set({ session, user: profile, isLoading: false })
    } else {
      set({ isLoading: false })
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { set({ isLoading: false }); throw error }
    await SecureStore.setItemAsync('sb_refresh_token', data.session.refresh_token)
    const profile = await loadProfile(data.user.id)
    const permissions = await loadPermissions(data.user.id)
    set({ session: data.session, user: profile, permissions, isLoading: false })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    await SecureStore.deleteItemAsync('sb_refresh_token')
    set({ user: null, session: null, permissions: [] })
  },

  hasPermission: (code) => get().permissions.includes(code),
}))

async function loadProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

async function loadPermissions(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_roles')
    .select('roles(role_permissions(permissions(code)))')
    .eq('user_id', userId)
  // Flatten permissions
  return data?.flatMap((ur: any) =>
    ur.roles?.role_permissions?.map((rp: any) => rp.permissions?.code).filter(Boolean) ?? []
  ) ?? []
}
```

### 7.4 Resolución de Tenant

```typescript
// apps/mobile/store/tenant.store.ts
import { create } from 'zustand'
import { supabase } from '@platform/services'
import type { Tenant } from '@platform/types'

interface TenantState {
  tenant: Tenant | null
  enabledModules: string[]
  isModuleEnabled: (module: string) => boolean
  loadTenant: (tenantId: string) => Promise<void>
}

export const useTenantStore = create<TenantState>()((set, get) => ({
  tenant: null,
  enabledModules: [],

  loadTenant: async (tenantId) => {
    const [{ data: tenant }, { data: modules }] = await Promise.all([
      supabase.from('tenants').select('*').eq('id', tenantId).single(),
      supabase.from('tenant_modules').select('module').eq('tenant_id', tenantId).eq('enabled', true),
    ])
    set({
      tenant,
      enabledModules: modules?.map((m: any) => m.module) ?? [],
    })
  },

  isModuleEnabled: (module) => get().enabledModules.includes(module),
}))

// El tenant se resuelve en auth.store.signIn después de cargar el perfil:
// const profile = await loadProfile(userId)  // profile.tenant_id disponible
// await useTenantStore.getState().loadTenant(profile.tenant_id)
```

### 7.5 Schema Inicial de Base de Datos (Sprint 1)

```sql
-- supabase/migrations/20240101000001_enums.sql
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');
CREATE TYPE platform_type AS ENUM ('ios', 'android');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'login', 'logout');

-- supabase/migrations/20240101000002_core_tenancy.sql
CREATE TABLE subscription_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL,
  price_yearly  NUMERIC(10,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  modules       TEXT[] NOT NULL DEFAULT '{}',
  max_clients   INT,
  max_staff     INT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  logo_url   TEXT,
  timezone   TEXT NOT NULL DEFAULT 'America/Costa_Rica',
  locale     TEXT NOT NULL DEFAULT 'es-CR',
  currency   TEXT NOT NULL DEFAULT 'CRC',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tenant_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id              UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_customer_id   TEXT,
  stripe_sub_id        TEXT,
  status               subscription_status NOT NULL DEFAULT 'trialing',
  billing_cycle        billing_cycle NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end   TIMESTAMPTZ NOT NULL,
  cancelled_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tenant_modules (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module    TEXT NOT NULL,
  enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, module)
);

-- supabase/migrations/20240101000003_rbac.sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  phone         TEXT,
  date_of_birth DATE,
  locale        TEXT NOT NULL DEFAULT 'es-CR',
  theme         TEXT NOT NULL DEFAULT 'system',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id),
  assigned_by UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tenant_id, role_id)
);

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  description TEXT,
  module      TEXT NOT NULL
);

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE device_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   platform_type NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- supabase/migrations/20240101000004_rls_helpers.sql
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.has_permission(permission_code TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = auth.tenant_id()
      AND p.code = permission_code
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS para tablas base
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_tenant_isolation" ON profiles USING (tenant_id = auth.tenant_id());
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING (id = auth.uid());

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_own_tenant" ON tenants USING (id = auth.tenant_id());

ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_modules_isolation" ON tenant_modules USING (tenant_id = auth.tenant_id());

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_tenant_isolation" ON user_roles USING (tenant_id = auth.tenant_id());

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_tokens_own" ON device_tokens USING (user_id = auth.uid());

-- supabase/seed.sql
INSERT INTO subscription_plans (name, price_monthly, price_yearly, modules, max_clients, max_staff)
VALUES
  ('Starter', 49.00, 490.00, ARRAY['appointments', 'clients', 'routines'], 50, 3),
  ('Pro', 99.00, 990.00, ARRAY['appointments', 'clients', 'routines', 'nutrition', 'notifications'], 200, 10),
  ('Enterprise', 199.00, 1990.00, ARRAY['appointments', 'clients', 'routines', 'nutrition', 'notifications', 'messaging', 'virtual_classes', 'ai'], NULL, NULL);

INSERT INTO roles (name, description, is_system) VALUES
  ('admin', 'Control total del tenant', TRUE),
  ('coach', 'Gestión de clientes asignados', TRUE),
  ('client', 'Acceso a servicios propios', TRUE);

-- Seed de permisos (subset para Sprint 1)
INSERT INTO permissions (code, description, module) VALUES
  ('clients.read', 'Ver clientes asignados', 'clients'),
  ('clients.read_all', 'Ver todos los clientes', 'clients'),
  ('clients.create', 'Crear cliente', 'clients'),
  ('clients.update', 'Editar cliente', 'clients'),
  ('clients.delete', 'Eliminar cliente', 'clients'),
  ('appointments.read', 'Ver citas propias', 'appointments'),
  ('appointments.read_all', 'Ver todas las citas', 'appointments'),
  ('appointments.create', 'Crear cita', 'appointments'),
  ('appointments.cancel', 'Cancelar cita', 'appointments'),
  ('routines.assign', 'Asignar rutina', 'routines'),
  ('nutrition.assign', 'Asignar plan nutricional', 'nutrition'),
  ('billing.read', 'Ver pagos', 'billing'),
  ('billing.manage', 'Gestionar pagos', 'billing'),
  ('tenant.manage_users', 'Gestionar usuarios', 'tenant'),
  ('tenant.manage_settings', 'Configurar tenant', 'tenant'),
  ('messages.send', 'Enviar mensajes', 'messaging'),
  ('analytics.read', 'Ver analítica', 'analytics'),
  ('ai.use', 'Usar asistente IA', 'ai');

-- Tenant de desarrollo
INSERT INTO tenants (name, slug, timezone, locale, currency)
VALUES ('Centro Demo', 'centro-demo', 'America/Costa_Rica', 'es-CR', 'CRC');
```

### 7.6 Primeras Pantallas (Semana 1)

Pantallas a implementar en la semana 1:

1. `app/(auth)/login.tsx` — Formulario email/password, manejo de errores, link a forgot-password
2. `app/(auth)/register.tsx` — Registro con email/password, validación con Zod
3. `app/(auth)/forgot-password.tsx` — Solicitud de reset por email
4. `app/_layout.tsx` — Root layout con auth guard y redirección por rol
5. `app/(admin)/index.tsx` — Dashboard admin (skeleton, datos mock)
6. `app/(coach)/index.tsx` — Dashboard coach (skeleton, datos mock)
7. `app/(client)/index.tsx` — Dashboard client (skeleton, datos mock)

```typescript
// app/(auth)/login.tsx — Estructura base
import { useState } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@/store/auth.store'
import { useTenantStore } from '@/store/tenant.store'
import { useTranslation } from 'react-i18next'

export default function LoginScreen() {
  const { t } = useTranslation()
  const { signIn } = useAuthStore()
  const { loadTenant } = useTenantStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const { profile } = await signIn(email, password)
      await loadTenant(profile.tenant_id)
      // Redirección manejada por _layout.tsx según rol
    } catch (err: any) {
      setError(t(`auth.errors.${err.code}`) ?? t('auth.errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white dark:bg-neutral-900">
      <Text className="text-2xl font-bold text-neutral-900 dark:text-white mb-8">
        {t('auth.login')}
      </Text>
      <TextInput
        className="border border-neutral-300 rounded-lg px-4 py-3 mb-4"
        placeholder={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        accessibilityLabel={t('auth.email')}
      />
      <TextInput
        className="border border-neutral-300 rounded-lg px-4 py-3 mb-4"
        placeholder={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel={t('auth.password')}
      />
      {error && (
        <Text className="text-error-500 text-sm mb-4" accessibilityRole="alert">
          {error}
        </Text>
      )}
      <Pressable
        className="bg-primary-500 rounded-lg py-4 items-center"
        onPress={handleLogin}
        disabled={loading}
        accessibilityRole="button"
      >
        <Text className="text-white font-semibold">
          {loading ? t('common.loading') : t('auth.login')}
        </Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(auth)/forgot-password')} className="mt-4 items-center">
        <Text className="text-primary-500">{t('auth.forgotPassword')}</Text>
      </Pressable>
    </View>
  )
}
```

---

## Tasks


- [x] 1. Scaffolding del monorepo y configuración base
  - Inicializar monorepo con Turborepo + pnpm workspaces
  - Crear estructura de carpetas: apps/mobile, packages/types, packages/services, packages/validations, packages/ui
  - Configurar turbo.json, package.json raíz, tsconfig.base.json
  - Configurar ESLint + Prettier compartidos
  - Inicializar proyecto Supabase con `supabase init`
  - Crear archivo .env.example con todas las variables requeridas
  - _Requirements: 16.5_

  - [ ]* 1.1 Verificar que `pnpm turbo build` compila sin errores de TypeScript
    - Validar que todos los packages se compilan correctamente
    - _Requirements: 16.5_

- [ ] 2. Schema inicial de base de datos (Sprint 1)
  - [x] 2.1 Crear migración de enums PostgreSQL
    - Implementar todos los tipos ENUM definidos en Sección 4.1
    - _Requirements: 1.1, 2.7_

  - [x] 2.2 Crear migración de tablas core de tenancy
    - Implementar: subscription_plans, tenants, tenant_subscriptions, tenant_modules
    - Incluir constraints, defaults y tipos correctos
    - _Requirements: 1.1, 1.5, 1.6_

  - [x] 2.3 Crear migración de RBAC
    - Implementar: profiles, roles, user_roles, permissions, role_permissions, device_tokens
    - _Requirements: 2.7, 2.8, 1.2_

  - [x] 2.4 Crear funciones helper RLS y políticas base
    - Implementar auth.tenant_id() y auth.has_permission()
    - Activar RLS en todas las tablas del Sprint 1
    - Crear políticas de aislamiento de tenant
    - _Requirements: 1.3, 16.2_

  - [ ]* 2.5 Escribir property test para aislamiento de tenant
    - **Property 1: Aislamiento de Tenant**
    - **Validates: Requirements 1.1, 1.3**
    - Usar fast-check para generar usuarios de distintos tenants y verificar que las consultas no retornan datos cruzados

  - [x] 2.6 Crear seed.sql con datos de desarrollo
    - Insertar planes de suscripción, roles del sistema, permisos, tenant demo
    - _Requirements: 1.1, 2.7_

- [ ] 3. Checkpoint — Verificar migraciones y seed
  - Ejecutar `supabase db reset` y verificar que todas las migraciones aplican sin errores
  - Verificar que el seed carga correctamente
  - Asegurarse de que todos los tests pasan, consultar al usuario si hay dudas.

- [ ] 4. packages/types — Tipos TypeScript compartidos
  - [x] 4.1 Implementar tipos de dominio core
    - Crear: tenant.ts, user.ts, appointment.ts, client.ts, routine.ts, nutrition.ts
    - Crear: errors.ts con AppErrorCode enum y AppError interface
    - Crear: api.ts con contratos de request/response para Edge Functions
    - Exportar todo desde index.ts
    - _Requirements: 1.1, 2.7, 4.1_

  - [ ]* 4.2 Escribir property test para tipos de API
    - **Property 3: JWT contiene tenant_id**
    - **Validates: Requirements 1.2, 2.3**
    - Verificar que CreateAppointmentRequest siempre incluye campos requeridos

- [ ] 5. packages/validations — Schemas Zod
  - [x] 5.1 Implementar schemas de validación
    - Crear: appointment.schema.ts, client.schema.ts, file.schema.ts, auth.schema.ts
    - Validar que end_time > start_time en citas
    - Validar límite de 20MB en archivos
    - _Requirements: 4.1, 5.4, 5.5, 16.1_

  - [ ]* 5.2 Escribir property test para validación de archivos
    - **Property 7: Archivos dentro del límite de tamaño**
    - **Validates: Requirements 5.4, 5.5**
    - Usar fast-check con fc.integer({ min: 20MB+1, max: 100MB }) para verificar rechazo

- [ ] 6. packages/services — Cliente Supabase y servicios base
  - [x] 6.1 Configurar cliente Supabase
    - Implementar supabase.ts con createClient y configuración de auth
    - _Requirements: 16.4, 16.5_

  - [x] 6.2 Implementar auth.service.ts
    - signIn, signOut, refreshSession, loadProfile, loadPermissions
    - Almacenamiento de refresh token en SecureStore
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 16.6_

  - [ ]* 6.3 Escribir tests unitarios para auth.service
    - Test: login exitoso retorna session y profile
    - Test: login fallido lanza error con código correcto
    - Test: refresh token expirado redirige a login
    - _Requirements: 2.3, 2.4, 2.5_

- [ ] 7. Zustand stores base
  - [x] 7.1 Implementar auth.store.ts
    - Estado: user, session, permissions, isLoading
    - Acciones: signIn, signOut, refreshSession, hasPermission, initialize
    - _Requirements: 2.3, 2.4, 2.7_

  - [x] 7.2 Implementar tenant.store.ts
    - Estado: tenant, enabledModules
    - Acciones: loadTenant, isModuleEnabled
    - Resolución de tenant al hacer login
    - _Requirements: 1.2, 1.5, 1.6_

  - [ ] 7.3 Implementar offline.store.ts (estructura base)
    - Estado: isOnline, pendingActions, cachedDashboard, cachedAppointments
    - Acciones: queueAction, syncPending (stub para Sprint 1)
    - Listener de NetInfo para detectar cambios de conectividad
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ]* 7.4 Escribir property test para RBAC
    - **Property 4: Permisos RBAC son exhaustivos**
    - **Validates: Requirements 2.7, 2.8**
    - Usar fast-check para verificar que hasPermission retorna false para cualquier permiso no asignado al rol

- [ ] 8. Expo Router — Navegación base y pantallas de auth
  - [x] 8.1 Configurar app/_layout.tsx con auth guard
    - Leer sesión de auth.store
    - Redirigir a (auth)/login si no hay sesión
    - Redirigir a (admin), (coach) o (client) según rol
    - Mostrar SplashScreen durante isLoading
    - _Requirements: 2.3, 17.3_

  - [x] 8.2 Implementar pantalla de login
    - Formulario email/password con validación Zod
    - Manejo de errores con mensajes en es-CR
    - Link a forgot-password
    - _Requirements: 2.1, 14.1, 17.5_

  - [x] 8.3 Implementar pantalla de registro
    - Formulario con validación
    - Asociación al tenant correcto
    - _Requirements: 2.1, 14.1_

  - [x] 8.4 Implementar pantalla de forgot-password
    - Envío de email de reset
    - Confirmación al usuario
    - _Requirements: 2.6, 14.1_

  - [ ]* 8.5 Escribir tests de componentes para pantallas de auth
    - Test: login muestra error con credenciales inválidas
    - Test: login redirige correctamente según rol
    - _Requirements: 2.1, 17.5_

- [ ] 9. Checkpoint — Auth funcional end-to-end
  - Login, registro y forgot-password funcionan en simulador iOS y Android
  - Tokens almacenados en SecureStore, nunca en AsyncStorage
  - RLS activo: usuario solo ve datos de su tenant
  - Asegurarse de que todos los tests pasan, consultar al usuario si hay dudas.

- [ ] 10. Configuración de i18n y theming
  - [x] 10.1 Configurar i18next con es-CR (default) y en-US
    - Crear estructura de archivos de traducción
    - Configurar fallback a es-CR
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 10.2 Implementar sistema de tokens de diseño
    - Crear constants/colors.ts, constants/typography.ts, constants/spacing.ts
    - Configurar NativeWind con tailwind.config.js
    - Soporte light/dark mode respetando preferencia del sistema
    - _Requirements: 17.1, 17.2_

  - [ ]* 10.3 Verificar que cambio de idioma aplica sin reiniciar la app
    - Test: cambiar locale de es-CR a en-US actualiza todos los textos visibles
    - _Requirements: 14.3_

- [ ] 11. Configurar TanStack Query con persistencia MMKV
  - Configurar QueryClient con staleTime 5min, gcTime 24h, networkMode offlineFirst
  - Configurar MMKV como storage persister
  - Definir queryKeys por dominio
  - _Requirements: 15.1, 15.4_

- [ ] 12. Dashboards skeleton (Sprint 1 — datos mock)
  - [x] 12.1 Implementar AdminDashboard con skeleton loading
    - Métricas: total clientes activos, citas semana, revenue mes (mock)
    - Skeleton visible durante carga
    - _Requirements: 3.1, 3.5_

  - [x] 12.2 Implementar CoachDashboard con skeleton loading
    - Métricas: citas próximas 7 días, clientes asignados, tasa de completación (mock)
    - _Requirements: 3.2, 3.5_

  - [x] 12.3 Implementar ClientDashboard con skeleton loading
    - Próxima cita, rutina activa, plan nutricional activo (mock)
    - _Requirements: 3.3, 3.5_

- [ ] 13. Checkpoint — MVP Sprint 1 completo
  - Monorepo compila sin errores
  - Auth funcional con multi-tenant
  - Dashboards skeleton visibles por rol
  - i18n y theming configurados
  - Asegurarse de que todos los tests pasan, consultar al usuario si hay dudas.

- [ ] 14. Módulo de Clientes (CRM) — Sprint 3–4
  - [ ] 14.1 Crear migraciones de clientes y staff
    - Implementar: clients, staff_profiles, client_notes, client_files
    - Índice GIN para búsqueda full-text en español
    - RLS completo para módulo de clientes
    - _Requirements: 5.1, 5.3, 5.4_

  - [ ] 14.2 Implementar client.service.ts en packages/services
    - search, getById, create, update, addNote, uploadFile, getHistory
    - Validación de tamaño de archivo antes de subir
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 14.3 Escribir property test para búsqueda de clientes
    - **Property 14: Búsqueda de clientes retorna solo del tenant**
    - **Validates: Requirements 5.6, 1.3**
    - Verificar que todos los resultados pertenecen al tenant del usuario autenticado

  - [ ] 14.4 Implementar pantallas de gestión de clientes
    - ClientList con búsqueda y paginación (20 items/página)
    - ClientDetail con historial, notas y archivos
    - ClientForm para crear/editar
    - _Requirements: 5.1, 5.2, 5.6, 15.4_

  - [ ]* 14.5 Escribir tests unitarios para validación de archivos
    - Test: archivo >20MB retorna FILE_TOO_LARGE
    - Test: tipo de archivo no permitido retorna FILE_TYPE_NOT_ALLOWED
    - _Requirements: 5.4, 5.5_

- [ ] 15. Módulo de Citas — Sprint 5–6
  - [ ] 15.1 Crear migraciones de citas y disponibilidad
    - Implementar: availability_slots, appointments, appointment_participants
    - Índice GIST para detección de conflictos con tsrange
    - RLS para citas
    - _Requirements: 4.1, 4.3_

  - [ ] 15.2 Implementar Edge Function create-appointment
    - Verificar JWT y permiso appointments.create
    - Detectar conflictos con tsrange overlap
    - INSERT en transacción (appointment + participants)
    - Encolar notificaciones
    - Registrar en audit_logs
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [ ]* 15.3 Escribir property test para conflictos de citas
    - **Property 5: Sin doble reserva de coach**
    - **Validates: Requirements 4.3, 4.4**
    - Usar fast-check con rangos de tiempo aleatorios para verificar detección de solapamiento

  - [ ] 15.4 Implementar appointment.service.ts
    - getUpcoming, getByCoach, create (via Edge Function), cancel, edit, markComplete
    - _Requirements: 4.1, 4.7, 4.8_

  - [ ] 15.5 Implementar vistas de calendario
    - CalendarView con vistas diaria, semanal, mensual
    - AppointmentDetail con acciones de cancelar/editar
    - AppointmentForm con selección de coach, cliente, horario
    - _Requirements: 4.2, 17.3_

  - [ ]* 15.6 Escribir tests unitarios para lógica de citas
    - Test: creación sin conflicto retorna appointment
    - Test: creación con conflicto retorna ConflictError
    - Test: cancelación actualiza status y timestamp
    - _Requirements: 4.1, 4.3, 4.7_

- [ ] 16. Módulo de Rutinas y Nutrición — Sprint 7–8
  - [ ] 16.1 Crear migraciones de rutinas, nutrición y progreso
    - Implementar: routine_templates, routine_assignments, nutrition_templates, nutrition_assignments, progress_entries
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 16.2 Implementar Edge Functions assign-routine y assign-nutrition-plan
    - Verificar permisos routines.assign / nutrition.assign
    - Copiar ejercicios/comidas de plantilla al momento de asignación (inmutable)
    - Notificar al cliente
    - _Requirements: 6.2, 6.4, 6.7_

  - [ ]* 16.3 Escribir property test para inmutabilidad de asignaciones
    - **Property 15: Asignación de rutina preserva copia de ejercicios**
    - **Validates: Requirements 6.2, 6.7**
    - Verificar que modificar la plantilla no afecta asignaciones existentes

  - [ ] 16.4 Implementar routine.service.ts y nutrition.service.ts
    - CRUD de plantillas, asignación, actualización de plan activo
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7_

  - [ ] 16.5 Implementar pantallas de rutinas y nutrición
    - RoutineList, RoutineDetail, RoutineForm (con lista de ejercicios)
    - NutritionPlanList, NutritionPlanDetail, NutritionPlanForm (con comidas)
    - ProgressLog para registrar entradas de progreso
    - ProgressChart con gráfica cronológica
    - _Requirements: 6.1, 6.3, 6.5_

  - [ ]* 16.6 Escribir tests unitarios para registro de progreso
    - Test: entrada de progreso almacenada con timestamp correcto
    - Test: gráfica muestra datos en orden cronológico
    - _Requirements: 6.5_

- [ ] 17. Checkpoint — Módulos core completos
  - CRM, citas, rutinas y nutrición funcionan end-to-end
  - RLS verificado: datos aislados por tenant
  - Asegurarse de que todos los tests pasan, consultar al usuario si hay dudas.

- [ ] 18. Sistema de Notificaciones — Sprint 9–10
  - [ ] 18.1 Crear migraciones de notificaciones
    - Implementar: notifications, notification_preferences
    - _Requirements: 13.1, 13.2, 13.5_

  - [ ] 18.2 Implementar Edge Function send-notification
    - Verificar notification_preferences por usuario
    - Push: FCM para Android, APNs para iOS
    - Email: Resend con templates
    - Registrar resultado en notifications
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 18.3 Escribir property test para preferencias de notificación
    - **Property 6: Notificaciones respetan preferencias**
    - **Validates: Requirements 13.3**
    - Verificar que usuario con preferencia desactivada no recibe ese tipo de notificación

  - [ ] 18.4 Implementar registro de device tokens en login
    - Solicitar permisos de notificación push al primer login
    - Registrar token en device_tokens con plataforma correcta
    - _Requirements: 13.1_

  - [ ] 18.5 Configurar pg_cron para recordatorios de citas 24h
    - Crear Edge Function send-appointment-reminders
    - Configurar cron job que ejecuta cada hora
    - _Requirements: 4.6_

  - [ ] 18.6 Implementar pantalla de preferencias de notificación
    - Toggle por tipo de notificación (push/email)
    - _Requirements: 13.3_

  - [ ]* 18.7 Escribir tests unitarios para send-notification
    - Test: usuario sin device token no recibe push
    - Test: notificación registrada en log con estado correcto
    - _Requirements: 13.4, 13.5_

- [ ] 19. Dashboards con datos reales — Sprint 9–10
  - [ ] 19.1 Conectar AdminDashboard a datos reales
    - Queries: total clientes activos, citas semana actual, revenue mes actual
    - Usar TanStack Query con staleTime 5min
    - _Requirements: 3.1, 3.4_

  - [ ] 19.2 Conectar CoachDashboard a datos reales
    - Queries: citas próximas 7 días, clientes asignados, tasa de completación semanal
    - _Requirements: 3.2, 3.4_

  - [ ] 19.3 Conectar ClientDashboard a datos reales
    - Queries: próxima cita, rutina activa, plan nutricional activo, mensajes recientes
    - _Requirements: 3.3, 3.4_

- [ ] 20. Panel de Administración — Sprint 11–12
  - [ ] 20.1 Implementar gestión de usuarios
    - CRUD de usuarios del tenant (crear, editar, desactivar)
    - Asignación de roles
    - Desactivación revoca sesiones via Edge Function revoke-user-sessions
    - _Requirements: 11.1, 11.2, 11.6_

  - [ ] 20.2 Implementar gestión de módulos
    - Toggle de módulos habilitados por tenant
    - UI adaptativa según módulos activos
    - _Requirements: 11.4, 1.5, 1.6_

  - [ ] 20.3 Implementar analítica básica
    - Revenue mensual, citas semanales, clientes activos, churn rate básico
    - _Requirements: 11.3_

  - [ ]* 20.4 Escribir tests unitarios para RBAC del panel admin
    - Test: usuario sin rol admin no puede acceder a rutas (admin)
    - Test: cambio de rol aplica en siguiente refresh de sesión
    - _Requirements: 11.1, 11.2, 2.8_

- [ ] 21. Caché offline y sincronización base — Sprint 11–12
  - [ ] 21.1 Configurar persistencia MMKV para TanStack Query
    - Implementar createSyncStoragePersister con MMKV
    - Configurar persistQueryClient con maxAge 24h
    - _Requirements: 15.1_

  - [ ] 21.2 Implementar OfflineBanner
    - Detectar cambios de conectividad con NetInfo
    - Mostrar banner cuando no hay conexión
    - _Requirements: 15.2_

  - [ ] 21.3 Implementar cola de sincronización en offline.store
    - queueAction para send_message, log_progress, add_note
    - syncPending ejecuta cola FIFO al reconectar
    - _Requirements: 15.3_

  - [ ]* 21.4 Escribir property test para sincronización offline
    - **Property 12: Tareas pendientes offline se sincronizan al reconectar**
    - **Validates: Requirements 15.3**
    - Verificar que todas las acciones encoladas se ejecutan al restaurar conectividad

  - [ ]* 21.5 Escribir property test para datos offline del usuario correcto
    - **Property 11: Datos cacheados offline son del usuario autenticado**
    - **Validates: Requirements 15.1, 15.2**
    - Verificar que caché solo contiene datos del usuario y tenant autenticados

- [ ] 22. Localización completa y pulido UI — Sprint 11–12
  - [ ] 22.1 Completar archivos de traducción es-CR y en-US
    - Todos los textos de UI, errores y notificaciones traducidos
    - Formato de fechas, moneda (CRC/USD) según locale
    - _Requirements: 14.1, 14.2, 14.4_

  - [ ] 22.2 Implementar selector de idioma en perfil
    - Cambio de locale sin reiniciar la app
    - Persistir preferencia en profiles.locale
    - _Requirements: 14.2, 14.3_

  - [ ] 22.3 Implementar selector de tema en perfil
    - Light/dark/system
    - Persistir en profiles.theme
    - _Requirements: 17.1, 17.2_

  - [ ] 22.4 Implementar ConfirmDialog para acciones destructivas
    - Cancelar cita, eliminar cliente, desactivar usuario
    - _Requirements: 17.6_

  - [ ] 22.5 Implementar ErrorMessage component
    - Mostrar errores en idioma del usuario
    - Nunca exponer códigos internos o stack traces
    - _Requirements: 17.5_

- [ ] 23. Checkpoint final MVP — Sprint 12
  - Todos los módulos MVP funcionan end-to-end
  - Tests de propiedades 1, 4, 5, 6, 7, 11, 12, 14, 15 pasan
  - App instalable en TestFlight y Google Play Internal Testing
  - Asegurarse de que todos los tests pasan, consultar al usuario si hay dudas.

- [ ] 24. Mensajería en Tiempo Real — Sprint 13–14 (V2)
  - [ ] 24.1 Crear migraciones de mensajería
    - Implementar: conversations, conversation_participants, messages
    - RLS: solo participantes pueden leer mensajes
    - _Requirements: 8.1, 8.5_

  - [ ]* 24.2 Escribir property test para visibilidad de mensajes
    - **Property 8: Mensajes solo visibles para participantes**
    - **Validates: Requirements 8.1, 8.5**
    - Verificar que usuario no participante no puede leer mensajes de la conversación

  - [ ] 24.3 Implementar messaging.service.ts con Supabase Realtime
    - Subscripción a canal de conversación
    - Envío de mensajes con INSERT directo
    - Historial paginado (50 mensajes iniciales)
    - Cola offline para mensajes sin conexión
    - _Requirements: 8.1, 8.2, 8.4, 8.6_

  - [ ]* 24.4 Escribir property test para formato de mensajes
    - **Property 13: Formato de mensajes incluye timestamp y remitente**
    - **Validates: Requirements 8.4, 8.5**
    - Verificar que todo mensaje almacenado tiene sender_id y sent_at

  - [ ] 24.5 Implementar pantallas de mensajería
    - ConversationList con lista de conversaciones y último mensaje
    - ChatScreen con historial paginado y input de mensaje
    - _Requirements: 8.1, 8.4_

- [ ] 25. Pagos con Stripe — Sprint 17–18 (V2)
  - [ ] 25.1 Crear migraciones de pagos
    - Implementar: billing_customers, payments
    - _Requirements: 9.1, 9.6_

  - [ ] 25.2 Implementar Edge Function create-checkout-session
    - Crear o recuperar billing_customer en Stripe
    - Crear Stripe Checkout session (subscription o payment)
    - _Requirements: 9.2_

  - [ ] 25.3 Implementar Edge Function stripe-webhook
    - Verificar firma HMAC con STRIPE_WEBHOOK_SECRET
    - Manejar: payment_intent.succeeded, payment_intent.payment_failed
    - Manejar: customer.subscription.updated, customer.subscription.deleted
    - Actualizar estado en <10s
    - _Requirements: 9.3, 9.4, 9.8_

  - [ ]* 25.4 Escribir property test para seguridad de datos de pago
    - **Property 9: Pagos no almacenan datos de tarjeta**
    - **Validates: Requirements 9.7**
    - Verificar que ningún registro en payments contiene PAN o CVV

  - [ ] 25.5 Implementar pantallas de pagos
    - PaymentHistory con lista de transacciones
    - CheckoutScreen con WebView para Stripe Checkout
    - _Requirements: 9.6_

- [ ] 26. Facturación Electrónica CR — Sprint 25–26 (V3)
  - [ ] 26.1 Crear migraciones de facturación
    - Implementar: invoices, invoice_events
    - _Requirements: 10.1, 10.6_

  - [ ] 26.2 Implementar Edge Function generate-invoice
    - Generar clave numérica de 50 dígitos (formato Hacienda)
    - Construir XML según esquema Hacienda v4.3
    - Firmar XML con certificado digital del tenant
    - POST al API de Hacienda (ATV)
    - Generar PDF y subir a Storage bucket invoices
    - Enviar PDF por email al cliente
    - Registrar eventos en invoice_events
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 26.3 Escribir property test para número consecutivo de facturas
    - **Property 10: Factura tiene número consecutivo único por tenant**
    - **Validates: Requirements 10.6**
    - Usar fast-check para verificar unicidad de números generados para el mismo tenant

  - [ ] 26.4 Implementar pantallas de facturación
    - InvoiceList con filtros por fecha, cliente, estado
    - InvoiceDetail con descarga de PDF
    - _Requirements: 10.7_

- [ ] 27. AI Chatbot — Sprint 27–28 (V3)
  - [ ] 27.1 Implementar Edge Function ai-assistant
    - Verificar módulo ai habilitado para el tenant
    - Verificar permiso ai.use
    - Construir system prompt con contexto del usuario (rol, citas, planes)
    - Llamar OpenAI gpt-4o-mini con historial de conversación
    - Instrucción explícita de no revelar datos de otros usuarios
    - Fallback si OpenAI no disponible
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ] 27.2 Implementar interfaz de chat IA en mobile
    - Chat persistente accesible desde todas las secciones
    - Historial de últimos 10 intercambios en sesión
    - Mensaje de fallback si OpenAI no disponible
    - _Requirements: 12.1, 12.3, 12.4_

- [ ] 28. Checkpoint final — Todos los módulos completos
  - Todos los tests de propiedades (1–15) pasan
  - Cobertura: Edge Functions ≥80%, packages/services ≥75%, packages/types ≥90%
  - App lista para producción
  - Asegurarse de que todos los tests pasan, consultar al usuario si hay dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requerimientos específicos para trazabilidad
- Los checkpoints garantizan validación incremental
- Los tests de propiedades validan invariantes universales del sistema
- El orden de las tareas respeta las dependencias entre módulos
- Las secciones V2 y V3 (tareas 24–27) se implementan después del MVP completo
