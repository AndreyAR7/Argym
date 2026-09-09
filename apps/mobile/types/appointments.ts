// Re-exported from the shared package so the two apps can't drift apart
// again (this union used to be redefined locally here, missing
// 'pending_confirmation' and 'postpone_requested' — every 1:1 appointment
// created via the app actually starts in one of those two states).
import type { AppointmentStatus } from '@platform/types';
export type { AppointmentStatus };
export { isActiveAppointmentStatus } from '@platform/types';
export type AppointmentType = 'in_person' | 'virtual';
export type GroupMode = 'individual' | 'group';

export interface Appointment {
  id: string;
  tenant_id: string;
  client_id: string;
  coach_id?: string | null;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  group_mode?: GroupMode | null;
  // Extended fields
  appointment_type?: AppointmentType | null;
  location?: string | null;
  meeting_url?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // UI-only joined fields
  client_name?: string | null;
  coach_name?: string | null;
}

export interface CreateAppointmentInput {
  tenant_id: string;
  client_id: string;
  coach_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  appointment_type?: AppointmentType;
  location?: string;
  meeting_url?: string;
  notes?: string;
  group_mode?: GroupMode;
}

export interface UpdateAppointmentInput {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  status?: AppointmentStatus;
  coach_id?: string;
  appointment_type?: AppointmentType;
  location?: string;
  meeting_url?: string;
  notes?: string;
}

// ── Conflict detection ────────────────────────────────────────
export interface ConflictResult {
  hasConflict: boolean;
  messages: string[]; // human-readable, in Spanish
}

export interface ConflictCheckInput {
  start_time: string;
  end_time: string;
  clientIds: string[];          // names keyed by id for messages
  clientNames: Record<string, string>;
  coachId?: string | null;
  coachName?: string | null;
  excludeAppointmentId?: string; // for edit — skip self
}
