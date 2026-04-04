-- Sprint 1A: Enums
-- All PostgreSQL enums used across the platform

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
