# Documento de Diseño Técnico
# SaaS Client Management Platform

## Resumen Ejecutivo

Plataforma SaaS móvil multiplataforma (Android + iOS) para centros multidisciplinarios que combinan entrenamiento, nutrición y coaching. Arquitectura multi-tenant con RBAC granular, backend en Supabase, pagos con Stripe y facturación electrónica conforme a la normativa de Costa Rica. Diseñada para escalar hacia una versión web compartiendo el mismo backend.

---

## 1. Visión General de la Arquitectura

### 1.1 Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTES                                  │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │   Mobile App         │    │   Web App (Fase 3)           │   │
│  │   React Native/Expo  │    │   Next.js / React+Vite       │   │
│  │   Expo Router        │    │   (comparte packages/)       │   │
│  └──────────┬───────────┘    └──────────────┬───────────────┘   │
└─────────────┼────────────────────────────────┼───────────────────┘
              │                                │
┌─────────────▼────────────────────────────────▼───────────────────┐
│                    PACKAGES COMPARTIDOS                           │
│  packages/types  │  packages/services  │  packages/ui            │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────────┐
│                        BACKEND (Supabase)                          │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Supabase    │  │  Supabase    │  │   Edge Functions          │ │
│  │  Auth        │  │  Realtime    │  │   (TypeScript/Deno)       │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                               │
│  │  PostgreSQL  │  │  Storage     │                               │
│  │  + RLS       │  │  (S3-compat) │                               │
│  └──────────────┘  └──────────────┘                               │
└────────────────────────────────────────────────────────────────────┘
              │
┌─────────────▼──────────────────────────────────────────────────────┐
│                    SERVICIOS EXTERNOS                               │
│  Stripe │ OpenAI │ Resend/SendGrid │ APNs │ FCM │ Hacienda CR API  │
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 Principios de Arquitectura

- **Multi-tenancy por Row-Level Security**: cada fila en PostgreSQL lleva `tenant_id`; las políticas RLS garantizan aislamiento automático.
- **Edge Functions para lógica crítica**: validación de conflictos, pagos, facturación, IA y notificaciones automáticas se ejecutan server-side.
- **Acceso directo a Supabase para lecturas simples**: el cliente consulta directamente para datos de perfil, historial, storage y realtime chat.
- **Web-readiness desde el día 1**: los contratos de API y los tipos compartidos permiten agregar la app web sin cambiar el backend.


---

## 2. Estructura del Monorepo

```
/
├── apps/
│   ├── mobile/                    # React Native + Expo
│   │   ├── app/                   # Expo Router (file-based routing)
│   │   │   ├── (auth)/            # Pantallas de autenticación
│   │   │   ├── (admin)/           # Sección Admin
│   │   │   ├── (coach)/           # Sección Coach
│   │   │   ├── (client)/          # Sección Cliente
│   │   │   └── _layout.tsx
│   │   ├── components/            # Componentes específicos de mobile
│   │   ├── hooks/                 # Hooks específicos de mobile
│   │   ├── store/                 # Zustand stores
│   │   └── app.json
│   └── web/                       # Next.js (Fase 3)
│       ├── app/
│       └── components/
│
├── packages/
│   ├── types/                     # Tipos TypeScript compartidos
│   │   ├── src/
│   │   │   ├── tenant.ts
│   │   │   ├── user.ts
│   │   │   ├── appointment.ts
│   │   │   ├── client.ts
│   │   │   ├── routine.ts
│   │   │   ├── nutrition.ts
│   │   │   ├── payment.ts
│   │   │   ├── invoice.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── services/                  # Lógica de negocio compartida
│   │   ├── src/
│   │   │   ├── supabase.ts        # Cliente Supabase configurado
│   │   │   ├── auth.service.ts
│   │   │   ├── appointment.service.ts
│   │   │   ├── client.service.ts
│   │   │   ├── routine.service.ts
│   │   │   ├── nutrition.service.ts
│   │   │   ├── payment.service.ts
│   │   │   └── notification.service.ts
│   │   └── package.json
│   │
│   └── ui/                        # Componentes UI compartidos (NativeWind)
│       ├── src/
│       │   ├── Button.tsx
│       │   ├── Card.tsx
│       │   ├── Input.tsx
│       │   ├── Avatar.tsx
│       │   └── index.ts
│       └── package.json
│
├── supabase/
│   ├── migrations/                # Migraciones SQL versionadas
│   ├── functions/                 # Edge Functions (Deno/TypeScript)
│   │   ├── create-appointment/
│   │   ├── assign-routine/
│   │   ├── stripe-webhook/
│   │   ├── create-checkout-session/
│   │   ├── generate-invoice/
│   │   ├── send-notification/
│   │   └── ai-assistant/
│   └── seed.sql
│
├── turbo.json                     # Turborepo config
├── package.json                   # Workspace root
└── tsconfig.base.json
```


---

## 3. Modelo de Datos Completo

### 3.1 Núcleo de Tenancy

```sql
-- Planes de suscripción disponibles en la plataforma
CREATE TABLE subscription_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                    -- "Starter", "Pro", "Enterprise"
  price_monthly NUMERIC(10,2) NOT NULL,
  price_yearly  NUMERIC(10,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  modules       TEXT[] NOT NULL DEFAULT '{}',     -- módulos incluidos
  max_clients   INT,                              -- NULL = ilimitado
  max_staff     INT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenants (negocios que usan la plataforma)
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,           -- para subdominios futuros
  logo_url        TEXT,
  timezone        TEXT NOT NULL DEFAULT 'America/Costa_Rica',
  locale          TEXT NOT NULL DEFAULT 'es-CR',
  currency        TEXT NOT NULL DEFAULT 'CRC',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suscripciones activas de cada tenant
CREATE TABLE tenant_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id             UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_customer_id  TEXT,
  stripe_sub_id       TEXT,
  status              TEXT NOT NULL DEFAULT 'trialing',
                      -- trialing | active | past_due | cancelled | expired
  billing_cycle       TEXT NOT NULL DEFAULT 'monthly', -- monthly | yearly
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end   TIMESTAMPTZ NOT NULL,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Módulos habilitados por tenant (override del plan)
CREATE TABLE tenant_modules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module     TEXT NOT NULL,   -- "messaging" | "virtual_classes" | "ai" | "invoicing" | ...
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, module)
);
```

### 3.2 Usuarios y RBAC

```sql
-- Perfiles de usuario (extiende auth.users de Supabase)
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  avatar_url   TEXT,
  phone        TEXT,
  date_of_birth DATE,
  locale       TEXT NOT NULL DEFAULT 'es-CR',
  theme        TEXT NOT NULL DEFAULT 'system',   -- system | light | dark
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Roles disponibles en el sistema
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,  -- admin | coach | client | receptionist | nutritionist
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE  -- roles del sistema no se pueden eliminar
);

-- Asignación de roles a usuarios por tenant
CREATE TABLE user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id),
  assigned_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tenant_id, role_id)
);

-- Catálogo de permisos granulares
CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  -- Ejemplos: clients.read, clients.create, clients.update, clients.delete
  --           appointments.create, appointments.cancel, appointments.edit
  --           routines.assign, nutrition.assign, billing.read
  --           tenant.manage_users, tenant.manage_settings
  --           messages.send, virtual_classes.create, ai.use
  description TEXT,
  module      TEXT NOT NULL  -- agrupación por módulo
);

-- Permisos asignados a roles
CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Tokens de dispositivo para notificaciones push
CREATE TABLE device_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   TEXT NOT NULL,  -- ios | android
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token)
);
```

### 3.3 Operación: Clientes y Staff

```sql
-- Perfiles de clientes (datos adicionales al perfil base)
CREATE TABLE clients (
  id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_coach  UUID REFERENCES profiles(id),
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  medical_notes   TEXT,
  tags            TEXT[] DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'active',  -- active | inactive | archived
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Perfiles de staff (coaches, nutricionistas, etc.)
CREATE TABLE staff_profiles (
  id           UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  specialties  TEXT[] DEFAULT '{}',
  bio          TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notas sobre clientes
CREATE TABLE client_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES profiles(id),
  content    TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Archivos adjuntos a clientes
CREATE TABLE client_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by  UUID NOT NULL REFERENCES profiles(id),
  file_name    TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  file_type    TEXT NOT NULL,   -- image/jpeg | image/png | application/pdf
  file_size    INT NOT NULL,    -- bytes
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.4 Citas y Disponibilidad

```sql
-- Slots de disponibilidad de coaches
CREATE TABLE availability_slots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coach_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,   -- 0=Domingo ... 6=Sábado
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Citas
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL REFERENCES profiles(id),
  title           TEXT NOT NULL,
  description     TEXT,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  location        TEXT,
  virtual_link    TEXT,
  appointment_type TEXT NOT NULL DEFAULT 'in_person',  -- in_person | virtual
  status          TEXT NOT NULL DEFAULT 'scheduled',
                  -- scheduled | confirmed | completed | cancelled | no_show
  cancelled_by    UUID REFERENCES profiles(id),
  cancelled_at    TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Participantes de citas (relación N:M)
CREATE TABLE appointment_participants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role           TEXT NOT NULL DEFAULT 'client',  -- client | coach | observer
  attended       BOOLEAN,
  joined_at      TIMESTAMPTZ,
  UNIQUE(appointment_id, user_id)
);

-- Clases virtuales
CREATE TABLE virtual_classes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coach_id          UUID NOT NULL REFERENCES profiles(id),
  title             TEXT NOT NULL,
  description       TEXT,
  scheduled_start   TIMESTAMPTZ NOT NULL,
  scheduled_end     TIMESTAMPTZ NOT NULL,
  max_participants  INT,
  video_link        TEXT,
  provider          TEXT NOT NULL DEFAULT 'webrtc',  -- webrtc | zoom
  status            TEXT NOT NULL DEFAULT 'scheduled',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE virtual_class_enrollments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id         UUID NOT NULL REFERENCES virtual_classes(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at        TIMESTAMPTZ,
  UNIQUE(class_id, client_id)
);
```

### 3.5 Programas: Rutinas y Nutrición

```sql
-- Plantillas de rutinas (reutilizables)
CREATE TABLE routine_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  name        TEXT NOT NULL,
  description TEXT,
  exercises   JSONB NOT NULL DEFAULT '[]',
  -- [{ name, sets, reps, duration_seconds, rest_seconds, notes, order }]
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rutinas asignadas a clientes
CREATE TABLE routine_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id  UUID REFERENCES routine_templates(id),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_by  UUID NOT NULL REFERENCES profiles(id),
  name         TEXT NOT NULL,
  description  TEXT,
  exercises    JSONB NOT NULL DEFAULT '[]',  -- copia al momento de asignación
  start_date   DATE NOT NULL,
  end_date     DATE,
  status       TEXT NOT NULL DEFAULT 'active',  -- active | completed | paused
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plantillas de planes nutricionales
CREATE TABLE nutrition_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  name        TEXT NOT NULL,
  description TEXT,
  meals       JSONB NOT NULL DEFAULT '[]',
  -- [{ name, time, foods: [{ name, quantity, unit, calories, protein, carbs, fat }] }]
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Planes nutricionales asignados a clientes
CREATE TABLE nutrition_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id  UUID REFERENCES nutrition_templates(id),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_by  UUID NOT NULL REFERENCES profiles(id),
  name         TEXT NOT NULL,
  description  TEXT,
  meals        JSONB NOT NULL DEFAULT '[]',
  start_date   DATE NOT NULL,
  end_date     DATE,
  status       TEXT NOT NULL DEFAULT 'active',
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Entradas de progreso del cliente
CREATE TABLE progress_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  entry_type  TEXT NOT NULL,  -- weight | body_measurement | workout_completion | photo
  data        JSONB NOT NULL, -- { weight_kg, body_fat_pct, waist_cm, ... }
  notes       TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.6 Comunicación

```sql
-- Conversaciones (1:1 o grupales)
CREATE TABLE conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'direct',  -- direct | group
  title        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at    TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

-- Mensajes
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id),
  body            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'sent',  -- sent | delivered | read | failed
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notificaciones
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  -- appointment_created | appointment_cancelled | appointment_reminder
  -- payment_confirmed | payment_failed | new_message | virtual_class_scheduled
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  data         JSONB DEFAULT '{}',
  channel      TEXT NOT NULL,  -- push | email | in_app
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | delivered | failed
  delivered_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_preferences (
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  push_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, notification_type)
);
```

### 3.7 Negocio: Pagos y Facturación

```sql
-- Clientes de facturación (Stripe Customer)
CREATE TABLE billing_customers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id            UUID REFERENCES profiles(id),
  stripe_customer_id TEXT UNIQUE NOT NULL,
  email              TEXT NOT NULL,
  name               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pagos registrados
CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  billing_customer_id   UUID REFERENCES billing_customers(id),
  stripe_payment_intent TEXT,
  amount                NUMERIC(10,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'USD',
  status                TEXT NOT NULL DEFAULT 'pending',
  -- pending | succeeded | failed | refunded
  description           TEXT,
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Facturas electrónicas (CR Hacienda)
CREATE TABLE invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_id          UUID REFERENCES payments(id),
  invoice_number      TEXT NOT NULL,  -- consecutivo Hacienda
  invoice_type        TEXT NOT NULL DEFAULT 'FE',  -- FE | TE | NC | ND
  issuer_id           UUID NOT NULL REFERENCES profiles(id),  -- Admin del tenant
  recipient_id        UUID REFERENCES profiles(id),
  recipient_name      TEXT NOT NULL,
  recipient_email     TEXT NOT NULL,
  recipient_id_type   TEXT NOT NULL DEFAULT 'cedula',
  recipient_id_number TEXT NOT NULL,
  subtotal            NUMERIC(10,2) NOT NULL,
  tax_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'CRC',
  line_items          JSONB NOT NULL DEFAULT '[]',
  -- [{ description, quantity, unit_price, tax_rate, subtotal }]
  hacienda_xml        TEXT,           -- XML de respuesta de Hacienda
  hacienda_key        TEXT,           -- clave numérica de 50 dígitos
  pdf_url             TEXT,
  status              TEXT NOT NULL DEFAULT 'draft',
  -- draft | submitted | accepted | rejected | cancelled
  submitted_at        TIMESTAMPTZ,
  accepted_at         TIMESTAMPTZ,
  rejected_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- submitted | accepted | rejected | pdf_generated | emailed
  payload    JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.8 Auditoría

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,   -- create | update | delete | login | logout
  resource    TEXT NOT NULL,   -- tabla o recurso afectado
  resource_id TEXT,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```


---

## 4. Políticas de Row-Level Security (RLS)

Todas las tablas con `tenant_id` siguen el mismo patrón base. Se muestran las políticas más representativas:

```sql
-- Función helper para obtener el tenant_id del usuario autenticado
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Función helper para verificar permiso granular
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

-- Política base para appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON appointments
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "coaches_see_own_appointments" ON appointments
  FOR SELECT USING (
    tenant_id = auth.tenant_id()
    AND (
      auth.has_permission('appointments.read_all')
      OR coach_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM appointment_participants
        WHERE appointment_id = appointments.id AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "create_appointment" ON appointments
  FOR INSERT WITH CHECK (
    tenant_id = auth.tenant_id()
    AND auth.has_permission('appointments.create')
  );

-- Política para client_notes (coaches solo ven notas de sus clientes)
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_tenant_isolation" ON client_notes
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "notes_access" ON client_notes
  FOR SELECT USING (
    tenant_id = auth.tenant_id()
    AND (
      auth.has_permission('clients.read_all')
      OR author_id = auth.uid()
      OR (
        NOT is_private
        AND EXISTS (
          SELECT 1 FROM clients c
          WHERE c.id = client_notes.client_id
            AND c.assigned_coach = auth.uid()
        )
      )
    )
  );

-- Política para messages (solo participantes de la conversación)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_participants_only" ON messages
  FOR SELECT USING (
    tenant_id = auth.tenant_id()
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );
```

---

## 5. Diseño de RBAC Granular

### 5.1 Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| `admin` | Control total del tenant |
| `coach` | Gestión de clientes asignados, citas, rutinas, nutrición |
| `client` | Acceso a su propio perfil, citas, planes y mensajes |
| `receptionist` | Gestión de citas y clientes (sin planes ni pagos) — Fase 2 |
| `nutritionist` | Gestión de planes nutricionales — Fase 2 |
| `supervisor` | Visibilidad de todos los coaches — Fase 2 |

### 5.2 Catálogo de Permisos

```
Módulo: clients
  clients.read          — Ver lista de clientes
  clients.read_all      — Ver todos los clientes del tenant
  clients.create        — Crear nuevo cliente
  clients.update        — Editar datos de cliente
  clients.delete        — Eliminar/archivar cliente
  clients.notes.create  — Agregar notas
  clients.files.upload  — Subir archivos

Módulo: appointments
  appointments.read         — Ver citas propias
  appointments.read_all     — Ver todas las citas del tenant
  appointments.create       — Crear cita
  appointments.edit         — Editar cita
  appointments.cancel       — Cancelar cita
  appointments.mark_complete — Marcar como completada

Módulo: routines
  routines.read         — Ver rutinas
  routines.create       — Crear rutina/plantilla
  routines.assign       — Asignar rutina a cliente
  routines.edit         — Editar rutina asignada

Módulo: nutrition
  nutrition.read        — Ver planes nutricionales
  nutrition.create      — Crear plan/plantilla
  nutrition.assign      — Asignar plan a cliente
  nutrition.edit        — Editar plan asignado

Módulo: billing
  billing.read          — Ver historial de pagos
  billing.manage        — Gestionar suscripciones y pagos
  billing.invoices      — Ver y descargar facturas

Módulo: tenant
  tenant.manage_users   — Crear/editar/desactivar usuarios
  tenant.manage_roles   — Asignar roles
  tenant.manage_settings — Configurar el tenant
  tenant.manage_modules  — Activar/desactivar módulos

Módulo: messaging
  messages.send         — Enviar mensajes
  messages.read         — Leer mensajes propios

Módulo: virtual_classes
  virtual_classes.create  — Crear clase virtual
  virtual_classes.enroll  — Inscribirse en clase

Módulo: ai
  ai.use                — Usar el asistente IA

Módulo: analytics
  analytics.read        — Ver analítica del tenant
```

### 5.3 Asignación de Permisos por Rol (MVP)

| Permiso | admin | coach | client |
|---------|-------|-------|--------|
| clients.read_all | ✓ | — | — |
| clients.read | ✓ | ✓ | — |
| clients.create | ✓ | ✓ | — |
| clients.update | ✓ | ✓ | — |
| clients.delete | ✓ | — | — |
| appointments.read_all | ✓ | — | — |
| appointments.read | ✓ | ✓ | ✓ |
| appointments.create | ✓ | ✓ | — |
| appointments.cancel | ✓ | ✓ | ✓ |
| routines.assign | ✓ | ✓ | — |
| nutrition.assign | ✓ | ✓ | — |
| billing.manage | ✓ | — | — |
| billing.read | ✓ | — | ✓ |
| tenant.manage_users | ✓ | — | — |
| tenant.manage_settings | ✓ | — | — |
| messages.send | ✓ | ✓ | ✓ |
| analytics.read | ✓ | — | — |
| ai.use | ✓ | ✓ | ✓ |


---

## 6. Diseño de Edge Functions

### 6.1 `create-appointment`

**Propósito**: Crear una cita con validación de conflictos y envío de notificaciones.

**Trigger**: POST `/functions/v1/create-appointment`

**Input**:
```typescript
{
  tenant_id: string
  coach_id: string
  client_ids: string[]
  title: string
  start_time: string  // ISO 8601
  end_time: string
  location?: string
  virtual_link?: string
  appointment_type: 'in_person' | 'virtual'
}
```

**Lógica**:
1. Verificar JWT y extraer `user_id` + `tenant_id`
2. Verificar permiso `appointments.create`
3. Consultar conflictos: `SELECT * FROM appointments WHERE coach_id = $1 AND status = 'scheduled' AND tsrange(start_time, end_time) && tsrange($2, $3)`
4. Si hay conflicto → retornar 409 con detalles del conflicto
5. Insertar appointment + appointment_participants en transacción
6. Encolar notificaciones para todos los participantes
7. Registrar en audit_logs

**Output**:
```typescript
{ appointment: Appointment } | { error: ConflictError }
```

---

### 6.2 `assign-routine`

**Propósito**: Asignar una rutina a un cliente, opcionalmente desde una plantilla.

**Input**:
```typescript
{
  client_id: string
  template_id?: string
  name: string
  exercises: Exercise[]
  start_date: string
  end_date?: string
}
```

**Lógica**:
1. Verificar permiso `routines.assign`
2. Verificar que el cliente pertenece al tenant
3. Si `template_id` → copiar ejercicios de la plantilla
4. Insertar `routine_assignments`
5. Notificar al cliente

---

### 6.3 `create-checkout-session`

**Propósito**: Crear una sesión de Stripe Checkout para suscripción o pago de servicio.

**Input**:
```typescript
{
  plan_id?: string          // para suscripción SaaS
  service_description?: string  // para cobro B2C
  amount?: number
  currency?: string
  success_url: string
  cancel_url: string
}
```

**Lógica**:
1. Verificar permiso `billing.manage`
2. Obtener o crear `billing_customer` en Stripe
3. Crear `stripe.checkout.sessions.create(...)` con `mode: 'subscription'` o `'payment'`
4. Retornar `session.url`

---

### 6.4 `stripe-webhook`

**Propósito**: Procesar eventos de Stripe de forma segura.

**Trigger**: POST `/functions/v1/stripe-webhook` (llamado por Stripe)

**Eventos manejados**:

| Evento | Acción |
|--------|--------|
| `payment_intent.succeeded` | Actualizar payment a `succeeded`, activar suscripción, encolar generación de factura |
| `payment_intent.payment_failed` | Actualizar a `failed`, notificar al usuario |
| `customer.subscription.updated` | Sincronizar estado de `tenant_subscriptions` |
| `customer.subscription.deleted` | Marcar suscripción como `cancelled` |

**Lógica**:
1. Verificar firma HMAC del webhook con `STRIPE_WEBHOOK_SECRET`
2. Parsear evento
3. Ejecutar acción correspondiente en transacción
4. Retornar 200 inmediatamente (idempotente)

---

### 6.5 `generate-invoice`

**Propósito**: Generar factura electrónica CR y enviarla a Hacienda.

**Input**:
```typescript
{
  payment_id: string
  recipient: {
    name: string
    email: string
    id_type: 'cedula' | 'dimex' | 'nite' | 'passport'
    id_number: string
  }
  line_items: LineItem[]
}
```

**Lógica**:
1. Verificar permiso `billing.invoices`
2. Generar clave numérica de 50 dígitos (Hacienda format)
3. Construir XML según esquema Hacienda v4.3
4. Firmar XML con certificado digital del tenant
5. POST al API de Hacienda (ATV)
6. Si aceptado → generar PDF, subir a Storage, enviar email al cliente
7. Si rechazado → guardar detalles, notificar al Admin
8. Registrar todos los eventos en `invoice_events`

---

### 6.6 `send-notification`

**Propósito**: Enviar notificaciones push y/o email a uno o varios usuarios.

**Input**:
```typescript
{
  user_ids: string[]
  type: NotificationType
  title: string
  body: string
  data?: Record<string, string>
  channels: ('push' | 'email')[]
}
```

**Lógica**:
1. Para cada usuario, verificar `notification_preferences`
2. Para push: obtener `device_tokens` activos → llamar FCM/APNs según plataforma
3. Para email: llamar Resend/SendGrid con template correspondiente
4. Registrar resultado en `notifications`

---

### 6.7 `ai-assistant`

**Propósito**: Procesar mensajes del chatbot IA con contexto del usuario.

**Input**:
```typescript
{
  message: string
  conversation_history: { role: 'user' | 'assistant', content: string }[]
}
```

**Lógica**:
1. Verificar que el módulo `ai` está habilitado para el tenant
2. Verificar permiso `ai.use`
3. Construir system prompt con contexto: rol del usuario, próximas citas, plan activo
4. Llamar `openai.chat.completions.create(...)` con `gpt-4o-mini`
5. Asegurar que el prompt incluya instrucción de no revelar datos de otros usuarios
6. Retornar respuesta

---

## 7. Flujos de Datos Críticos

### 7.1 Flujo de Autenticación

```
Usuario                MobileApp              Supabase Auth         profiles
  │                       │                        │                    │
  │── email + password ──►│                        │                    │
  │                       │── signInWithPassword ─►│                    │
  │                       │                        │── verify hash ─────│
  │                       │                        │◄── user record ────│
  │                       │◄── JWT + refresh_token ─│                    │
  │                       │                        │                    │
  │                       │── GET /profiles ───────────────────────────►│
  │                       │◄── profile + tenant_id + roles ─────────────│
  │                       │                        │                    │
  │                       │── store in SecureStore │                    │
  │◄── navigate to dashboard ─│                    │                    │
```

### 7.2 Flujo de Creación de Cita

```
Coach/Admin            MobileApp          Edge Function          DB + Notifications
  │                       │               create-appointment           │
  │── fill form ─────────►│                       │                    │
  │                       │── POST /create-appointment ──────────────►│
  │                       │               │── verify JWT               │
  │                       │               │── check permission         │
  │                       │               │── query conflicts ─────────►│
  │                       │               │◄── no conflict ────────────│
  │                       │               │── INSERT appointment ──────►│
  │                       │               │── INSERT participants ─────►│
  │                       │               │── call send-notification ──►│
  │                       │◄── 201 appointment ────│                    │
  │◄── show confirmation ─│                        │                    │
                                                   │── push + email ───►│ (async)
```

### 7.3 Flujo de Pago + Facturación

```
Admin/Client           MobileApp        create-checkout    Stripe       stripe-webhook    generate-invoice
  │                       │                   │              │                │                  │
  │── initiate payment ──►│                   │              │                │                  │
  │                       │── POST ──────────►│              │                │                  │
  │                       │               │── stripe.checkout.create ────────►│                  │
  │                       │◄── session_url ───│              │                │                  │
  │◄── redirect to Stripe ─│                  │              │                │                  │
  │── complete payment ──────────────────────────────────────►│               │                  │
  │                       │              │◄── payment_intent.succeeded ───────│                  │
  │                       │              │── update payment status ────────────────────────────► │
  │                       │              │── call generate-invoice ────────────────────────────► │
  │                       │              │                   │                │── build XML ─────►│
  │                       │              │                   │                │── POST Hacienda ──►│
  │                       │              │                   │                │◄── accepted ──────│
  │                       │              │                   │                │── generate PDF ───►│
  │                       │              │                   │                │── email to client ►│
```

### 7.4 Flujo de Mensajería Realtime

```
Coach                  MobileApp A        Supabase Realtime       MobileApp B          Client
  │                       │                      │                     │                  │
  │── type message ──────►│                      │                     │                  │
  │                       │── INSERT messages ──►│                     │                  │
  │                       │                      │── broadcast ────────►│                 │
  │                       │                      │                     │◄── display msg ──│
  │                       │                      │                     │                  │
  │                       │                      │  (if app background) │                 │
  │                       │                      │── send-notification ─────────────────► │
  │                       │                      │                     │◄── push notif ───│
```


---

## 8. Componentes e Interfaces

### 8.1 Capa de Servicios (`packages/services`)

```typescript
// packages/services/src/appointment.service.ts
export interface AppointmentService {
  // Lectura directa (Supabase client)
  getUpcoming(userId: string, days: number): Promise<Appointment[]>
  getByCoach(coachId: string, from: Date, to: Date): Promise<Appointment[]>
  getById(id: string): Promise<Appointment>

  // Escritura via Edge Functions
  create(input: CreateAppointmentInput): Promise<Appointment>
  cancel(id: string, reason?: string): Promise<void>
  edit(id: string, input: Partial<CreateAppointmentInput>): Promise<Appointment>
  markComplete(id: string): Promise<void>
}

// packages/services/src/client.service.ts
export interface ClientService {
  search(query: string, tenantId: string): Promise<ClientProfile[]>
  getById(id: string): Promise<ClientProfile>
  create(input: CreateClientInput): Promise<ClientProfile>
  update(id: string, input: Partial<CreateClientInput>): Promise<ClientProfile>
  addNote(clientId: string, content: string, isPrivate: boolean): Promise<ClientNote>
  uploadFile(clientId: string, file: File): Promise<ClientFile>
  getHistory(clientId: string): Promise<ClientHistory>
}
```

### 8.2 Zustand Stores (`apps/mobile/store`)

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
```

### 8.3 Contratos de API (para web-readiness)

Todos los Edge Functions exponen contratos TypeScript en `packages/types/src/api.ts`:

```typescript
// Contrato compartido entre mobile y web
export interface CreateAppointmentRequest {
  coach_id: string
  client_ids: string[]
  title: string
  start_time: string
  end_time: string
  location?: string
  appointment_type: 'in_person' | 'virtual'
}

export interface CreateAppointmentResponse {
  appointment: Appointment
}

export interface ConflictError {
  code: 'APPOINTMENT_CONFLICT'
  conflicting_appointment: Pick<Appointment, 'id' | 'start_time' | 'end_time' | 'title'>
}
```

---

## 9. Estrategia de Notificaciones

### 9.1 Arquitectura

```
Edge Function (send-notification)
  │
  ├── Push (FCM/APNs)
  │     ├── Android → Firebase Cloud Messaging (FCM)
  │     │     └── POST https://fcm.googleapis.com/v1/projects/{id}/messages:send
  │     └── iOS → Apple Push Notification service (APNs)
  │           └── HTTP/2 con JWT (p8 key)
  │
  └── Email (Resend)
        └── POST https://api.resend.com/emails
              └── Templates React Email en packages/email-templates/
```

### 9.2 Eventos y Canales

| Evento | Push | Email | In-App |
|--------|------|-------|--------|
| Cita creada | ✓ | ✓ | ✓ |
| Cita cancelada | ✓ | ✓ | ✓ |
| Recordatorio 24h | ✓ | ✓ | — |
| Pago confirmado | ✓ | ✓ | ✓ |
| Pago fallido | ✓ | ✓ | ✓ |
| Nuevo mensaje | ✓ | — | ✓ |
| Clase virtual programada | ✓ | ✓ | ✓ |
| Factura aceptada | — | ✓ | ✓ |
| Factura rechazada | ✓ | ✓ | ✓ |

### 9.3 Recordatorios Programados

Los recordatorios de 24h se implementan con un **Supabase Cron Job** (pg_cron):

```sql
-- Ejecutar cada hora para buscar citas en las próximas 24h
SELECT cron.schedule(
  'appointment-reminders',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.edge_function_url') || '/send-appointment-reminders',
      headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
    )
  $$
);
```

---

## 10. Estrategia de Offline y Sincronización

### 10.1 Datos Cacheados Localmente

| Dato | Librería | TTL |
|------|----------|-----|
| Dashboard data | TanStack Query + MMKV | 5 min |
| Citas próximas (7 días) | TanStack Query + MMKV | 15 min |
| Rutina activa | TanStack Query + MMKV | 1 hora |
| Plan nutricional activo | TanStack Query + MMKV | 1 hora |
| Perfil del usuario | Zustand persist + MMKV | sesión |
| Mensajes recientes (50) | TanStack Query + MMKV | 5 min |

### 10.2 Acciones Offline (Cola de Sincronización)

Las acciones que requieren conectividad se encolan en `offline.store`:

```typescript
interface PendingAction {
  id: string
  type: 'send_message' | 'log_progress' | 'add_note'
  payload: unknown
  created_at: number
  retry_count: number
}
```

Al recuperar conectividad (`NetInfo.addEventListener`), el store ejecuta `syncPending()` que procesa la cola en orden FIFO.

### 10.3 Configuración TanStack Query

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutos
      gcTime: 24 * 60 * 60 * 1000,   // 24 horas en caché
      retry: 3,
      networkMode: 'offlineFirst',    // usar caché si no hay red
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
})
```

---

## 11. Roadmap de Fases

### Fase 1 — MVP (Semanas 1–12)

**Sprint 1–2: Fundación**
- Configuración monorepo (Turborepo + pnpm workspaces)
- Supabase project setup + migraciones base
- Auth (email/password, JWT, refresh)
- Multi-tenant: tenants, profiles, user_roles, permissions
- Expo Router: layout base, navegación por tabs

**Sprint 3–4: Clientes y Staff**
- CRUD de clientes con búsqueda
- Perfiles de staff
- Notas y archivos adjuntos
- RLS completo para módulo de clientes

**Sprint 5–6: Citas y Calendario**
- Edge Function `create-appointment` con validación de conflictos
- Vistas de calendario (diaria, semanal, mensual)
- Disponibilidad de coaches
- Cancelación y edición de citas

**Sprint 7–8: Rutinas y Nutrición**
- CRUD de plantillas de rutinas y nutrición
- Asignación a clientes
- Registro de progreso
- Gráficas de progreso

**Sprint 9–10: Notificaciones y Dashboard**
- Edge Function `send-notification` (FCM + APNs + email)
- Dashboards por rol (Admin, Coach, Client)
- Preferencias de notificación
- Recordatorios automáticos (pg_cron)

**Sprint 11–12: Admin Panel + Pulido MVP**
- Panel de administración (usuarios, roles, módulos)
- Analítica básica
- Modo offline básico (TanStack Query cache)
- Localización es-CR / en-US
- Light/dark mode

---

### Fase 2 — Crecimiento (Semanas 13–24)

**Sprint 13–14: Mensajería Realtime**
- Supabase Realtime para chat 1:1
- Historial paginado
- Notificaciones push para mensajes en background

**Sprint 15–16: Clases Virtuales**
- CRUD de clases virtuales
- Integración WebRTC (o Zoom API)
- Inscripción y asistencia

**Sprint 17–18: Pagos Stripe**
- Edge Functions `create-checkout-session` + `stripe-webhook`
- Suscripciones SaaS (B2B)
- Cobros a clientes (B2C)
- Historial de pagos

**Sprint 19–20: Suscripciones SaaS**
- Feature toggles por plan
- Límites de clientes/staff por plan
- Portal de gestión de suscripción

**Sprint 21–22: Analítica Avanzada**
- Revenue por mes, churn rate
- Tasa de asistencia a citas
- Progreso agregado de clientes

**Sprint 23–24: Offline Robusto**
- Cola de sincronización completa
- Resolución de conflictos
- Indicadores de estado de sincronización

---

### Fase 3 — Expansión (Semanas 25–36)

**Sprint 25–26: Facturación Electrónica CR**
- Edge Function `generate-invoice`
- Integración API Hacienda (ATV)
- Generación de PDF
- Envío automático por email

**Sprint 27–28: AI Chatbot**
- Edge Function `ai-assistant`
- Interfaz de chat persistente
- Contexto de usuario en prompts

**Sprint 29–30: Automatizaciones**
- Workflows configurables por Admin
- Triggers: cita completada → enviar encuesta
- Triggers: plan vencido → notificar coach

**Sprint 31–32: Feature Toggles por Plan**
- Sistema de módulos dinámico
- UI adaptativa según módulos habilitados

**Sprint 33–36: Versión Web**
- Scaffolding `apps/web` con Next.js
- Reutilización de `packages/services` y `packages/types`
- Componentes web en `packages/ui` (adaptados de NativeWind a Tailwind)
- Paridad de funcionalidades con mobile


---

## 12. Decisiones de Arquitectura

### 12.1 Web-Readiness

| Decisión | Rationale |
|----------|-----------|
| `packages/types` compartido | Los tipos TypeScript son agnósticos de plataforma; mobile y web usan los mismos contratos |
| `packages/services` compartido | La lógica de llamadas a Supabase y Edge Functions no depende de React Native |
| Edge Functions como API REST | Cualquier cliente HTTP puede consumirlas; no hay acoplamiento a Supabase JS SDK |
| Supabase como BaaS | El mismo proyecto Supabase sirve a mobile y web sin cambios |
| `packages/ui` con NativeWind | NativeWind usa clases Tailwind; la migración a Tailwind CSS para web es directa |

### 12.2 Separación Supabase Directo vs Edge Functions

**Acceso directo al cliente Supabase**:
- Lecturas de perfil, dashboard, historial
- Subscripciones Realtime (chat)
- Uploads a Storage
- Consultas de solo lectura con RLS

**Siempre via Edge Function**:
- Creación de citas (validación de conflictos)
- Asignación de rutinas/planes
- Cualquier operación que involucre Stripe
- Generación de facturas Hacienda
- Envío de notificaciones
- Llamadas a OpenAI
- Operaciones multi-tabla en transacción
- Lógica que requiere service_role (bypass RLS controlado)

### 12.3 Estado Global

- **Zustand**: estado de auth, tenant, offline queue, UI preferences
- **TanStack Query**: caché de datos del servidor, sincronización, paginación
- **No Redux**: la combinación Zustand + TanStack Query cubre todos los casos sin la complejidad de Redux

### 12.4 Seguridad de Tokens

Los JWT y refresh tokens se almacenan exclusivamente en:
- **iOS**: Keychain (via `expo-secure-store`)
- **Android**: Android Keystore (via `expo-secure-store`)

Nunca en AsyncStorage, MMKV sin cifrado, ni logs.

---

## 13. Correctness Properties

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquinas.*

### Property 1: Aislamiento de Tenant

*Para cualquier* usuario autenticado y cualquier consulta a la base de datos, los resultados retornados deben pertenecer exclusivamente al tenant del usuario autenticado.

**Validates: Requirements 1.1, 1.3**

---

### Property 2: Módulos habilitados por plan

*Para cualquier* tenant y cualquier módulo, si el módulo no está incluido en el plan de suscripción activo del tenant, entonces ningún usuario de ese tenant debe poder acceder a ese módulo.

**Validates: Requirements 1.5, 1.6**

---

### Property 3: JWT contiene tenant_id

*Para cualquier* usuario autenticado exitosamente, el JWT emitido debe contener el `tenant_id` correcto del usuario, y todas las solicitudes subsecuentes deben usar ese contexto.

**Validates: Requirements 1.2, 2.3**

---

### Property 4: Permisos RBAC son exhaustivos

*Para cualquier* usuario con un rol asignado y cualquier operación solicitada, si el rol del usuario no incluye el permiso requerido, la API debe retornar 403.

**Validates: Requirements 2.7, 2.8**

---

### Property 5: Sin doble reserva de coach

*Para cualquier* coach y cualquier par de citas, si los rangos de tiempo de ambas citas se solapan, el sistema debe rechazar la creación de la segunda cita con un error de conflicto.

**Validates: Requirements 4.3, 4.4**

---

### Property 6: Notificaciones respetan preferencias

*Para cualquier* usuario que haya desactivado un tipo de notificación, el sistema no debe enviar notificaciones de ese tipo a ese usuario, independientemente del evento que las dispare.

**Validates: Requirements 13.3**

---

### Property 7: Archivos dentro del límite de tamaño

*Para cualquier* intento de subida de archivo, si el tamaño del archivo supera 20 MB, el sistema debe rechazar la operación y retornar un mensaje de error descriptivo.

**Validates: Requirements 5.4, 5.5**

---

### Property 8: Mensajes solo visibles para participantes

*Para cualquier* mensaje en una conversación, solo los usuarios que son participantes de esa conversación deben poder leer ese mensaje.

**Validates: Requirements 8.1, 8.5**

---

### Property 9: Pagos no almacenan datos de tarjeta

*Para cualquier* transacción de pago procesada, la base de datos del sistema no debe contener números de tarjeta ni CVV; solo identificadores de Stripe.

**Validates: Requirements 9.7**

---

### Property 10: Factura tiene número consecutivo único por tenant

*Para cualquier* par de facturas del mismo tenant, sus números de factura deben ser distintos y seguir el formato consecutivo requerido por Hacienda.

**Validates: Requirements 10.6**

---

### Property 11: Datos cacheados offline son del usuario autenticado

*Para cualquier* sesión offline, los datos mostrados deben corresponder exclusivamente al usuario autenticado y a su tenant, nunca a datos de otro usuario.

**Validates: Requirements 15.1, 15.2**

---

### Property 12: Tareas pendientes offline se sincronizan al reconectar

*Para cualquier* acción encolada durante modo offline, cuando la conectividad se restaura, la acción debe ejecutarse y el estado local debe converger con el estado del servidor dentro de 30 segundos.

**Validates: Requirements 15.3**

---

### Property 13: Formato de mensajes incluye timestamp y remitente

*Para cualquier* mensaje almacenado en el sistema, su representación debe incluir la identidad del remitente y el timestamp de envío.

**Validates: Requirements 8.4, 8.5**

---

### Property 14: Búsqueda de clientes retorna solo del tenant

*Para cualquier* consulta de búsqueda de clientes, todos los resultados retornados deben pertenecer al tenant del usuario que realiza la búsqueda.

**Validates: Requirements 5.6, 1.3**

---

### Property 15: Asignación de rutina preserva copia de ejercicios

*Para cualquier* rutina asignada a un cliente, si la plantilla original es modificada posteriormente, la asignación existente del cliente debe mantener los ejercicios originales al momento de la asignación.

**Validates: Requirements 6.2, 6.7**

---

## 14. Manejo de Errores

### 14.1 Códigos de Error Estándar

```typescript
// packages/types/src/errors.ts
export enum AppErrorCode {
  // Auth
  INVALID_CREDENTIALS = 'AUTH_001',
  SESSION_EXPIRED = 'AUTH_002',
  INSUFFICIENT_PERMISSIONS = 'AUTH_003',
  RATE_LIMIT_EXCEEDED = 'AUTH_004',

  // Appointments
  APPOINTMENT_CONFLICT = 'APT_001',
  APPOINTMENT_EDIT_WINDOW_CLOSED = 'APT_002',
  APPOINTMENT_NOT_FOUND = 'APT_003',

  // Files
  FILE_TOO_LARGE = 'FILE_001',
  FILE_TYPE_NOT_ALLOWED = 'FILE_002',

  // Payments
  PAYMENT_FAILED = 'PAY_001',
  STRIPE_WEBHOOK_INVALID = 'PAY_002',

  // Invoicing
  HACIENDA_REJECTED = 'INV_001',
  HACIENDA_UNAVAILABLE = 'INV_002',

  // AI
  AI_UNAVAILABLE = 'AI_001',
  AI_CONTEXT_TOO_LONG = 'AI_002',

  // General
  TENANT_MODULE_DISABLED = 'TEN_001',
  VALIDATION_ERROR = 'GEN_001',
  NOT_FOUND = 'GEN_002',
  INTERNAL_ERROR = 'GEN_003',
}

export interface AppError {
  code: AppErrorCode
  message: string  // en idioma del usuario
  details?: unknown
}
```

### 14.2 Estrategia de Retry

| Operación | Reintentos | Backoff |
|-----------|-----------|---------|
| Llamadas a Supabase | 3 | exponencial (1s, 2s, 4s) |
| Push notifications | 3 | lineal (30s) |
| Hacienda API | 5 | exponencial con jitter |
| OpenAI API | 2 | lineal (5s) |
| Stripe webhooks | idempotente | Stripe maneja reintentos |

### 14.3 Errores en UI

- Todos los errores se muestran en el idioma seleccionado por el usuario
- Nunca se exponen códigos de error internos o stack traces al usuario final
- Acciones destructivas requieren confirmación explícita antes de ejecutarse
- Los errores de red muestran opción de reintentar

---

## 15. Estrategia de Testing

### 15.1 Enfoque Dual

La estrategia combina **tests unitarios** para casos específicos y **tests de propiedades** para validar comportamiento universal. Ambos son complementarios y necesarios.

**Tests unitarios** se enfocan en:
- Ejemplos concretos de flujos críticos
- Casos borde y condiciones de error
- Integración entre componentes

**Tests de propiedades** se enfocan en:
- Propiedades universales que deben mantenerse para cualquier input válido
- Cobertura exhaustiva mediante inputs generados aleatoriamente
- Mínimo 100 iteraciones por propiedad

### 15.2 Stack de Testing

| Capa | Herramienta |
|------|-------------|
| Unit + Integration (TS) | Vitest |
| Property-based testing | fast-check |
| React Native components | React Native Testing Library |
| Edge Functions | Deno test + fast-check |
| E2E Mobile | Maestro |

### 15.3 Tests de Propiedades (Property-Based Tests)

Cada propiedad del diseño debe implementarse como un test de propiedad usando `fast-check`.
Cada test debe referenciar la propiedad del diseño con el formato:

`// Feature: saas-client-management-platform, Property N: <texto>`

**Ejemplos de implementación**:

```typescript
// Property 5: Sin doble reserva de coach
// Feature: saas-client-management-platform, Property 5: Sin doble reserva de coach
test('rechaza citas solapadas para el mismo coach', () => {
  fc.assert(
    fc.property(
      fc.record({
        start: fc.date({ min: new Date() }),
        duration: fc.integer({ min: 30, max: 120 }),
      }),
      ({ start, duration }) => {
        const end = new Date(start.getTime() + duration * 60000)
        const overlap = new Date(start.getTime() + 15 * 60000)
        const result = checkConflict(
          { start_time: start, end_time: end },
          [{ start_time: overlap, end_time: new Date(overlap.getTime() + 60 * 60000) }]
        )
        return result.hasConflict === true
      }
    ),
    { numRuns: 100 }
  )
})

// Property 7: Archivos dentro del límite de tamaño
// Feature: saas-client-management-platform, Property 7: Archivos dentro del límite de tamaño
test('rechaza archivos mayores a 20MB', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 20 * 1024 * 1024 + 1, max: 100 * 1024 * 1024 }),
      (fileSize) => {
        const result = validateFileSize(fileSize)
        return result.valid === false && result.error === 'FILE_TOO_LARGE'
      }
    ),
    { numRuns: 100 }
  )
})

// Property 10: Número consecutivo único por tenant
// Feature: saas-client-management-platform, Property 10: Factura tiene número consecutivo único por tenant
test('números de factura son únicos por tenant', () => {
  fc.assert(
    fc.property(
      fc.array(fc.uuid(), { minLength: 2, maxLength: 50 }),
      (invoiceIds) => {
        const numbers = invoiceIds.map((_, i) => generateInvoiceNumber('tenant-1', i + 1))
        const unique = new Set(numbers)
        return unique.size === numbers.length
      }
    ),
    { numRuns: 100 }
  )
})
```

### 15.4 Tests Unitarios Prioritarios

- Auth: login exitoso, login fallido, expiración de JWT, rate limiting
- Appointments: creación sin conflicto, creación con conflicto, cancelación
- Files: validación de tipo y tamaño
- RBAC: verificación de permisos por rol
- Notifications: respeto de preferencias de usuario
- Invoicing: generación de número consecutivo, construcción de XML

### 15.5 Cobertura Objetivo

| Módulo | Cobertura mínima |
|--------|-----------------|
| Edge Functions | 80% |
| packages/services | 75% |
| packages/types (validaciones) | 90% |
| UI Components | 60% |

