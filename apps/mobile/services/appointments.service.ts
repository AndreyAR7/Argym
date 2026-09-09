import { supabase } from '@/lib/supabase';
import { throwFriendlyAppointmentError } from '@/lib/appointmentErrors';
import type { Appointment, CreateAppointmentInput, UpdateAppointmentInput, ConflictCheckInput, ConflictResult } from '@/types/appointments';

const REAL_COLUMNS = 'id, tenant_id, client_id, coach_id, title, description, start_time, end_time, status, appointment_type, location, meeting_url, notes, created_at, updated_at';

// coach_name/client_name are UI-only — never persisted, only populated
// here via a join for screens that display them (home dashboard,
// appointment lists/detail). Web already does this; mobile never did,
// so it always rendered without a coach/client name.
const COLUMNS_WITH_NAMES = `${REAL_COLUMNS}, coach:profiles!appointments_coach_id_fkey(full_name), client:profiles!appointments_client_id_fkey(full_name)`;

function flattenNames(row: any): Appointment {
  const coach = Array.isArray(row.coach) ? row.coach[0] : row.coach;
  const client = Array.isArray(row.client) ? row.client[0] : row.client;
  const { coach: _coach, client: _client, ...rest } = row;
  return { ...rest, coach_name: coach?.full_name ?? null, client_name: client?.full_name ?? null };
}

export async function getAppointmentsByTenant(tenantId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(REAL_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export async function getAppointmentsByClient(userId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(COLUMNS_WITH_NAMES)
    .eq('client_id', userId)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as any[]).map(flattenNames);
}

export async function getAppointmentsByCoach(userId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(COLUMNS_WITH_NAMES)
    .eq('coach_id', userId)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as any[]).map(flattenNames);
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      tenant_id: input.tenant_id,
      client_id: input.client_id,
      coach_id: input.coach_id ?? null,
      title: input.title,
      description: input.description ?? null,
      start_time: input.start_time,
      end_time: input.end_time,
      status: 'pending_confirmation',
      appointment_type: input.appointment_type ?? 'in_person',
      location: input.location ?? null,
      meeting_url: input.meeting_url ?? null,
      notes: input.notes ?? null,
      group_mode: input.group_mode ?? 'individual',
    })
    .select(REAL_COLUMNS)
    .single();

  if (error) throwFriendlyAppointmentError(error);
  return data as Appointment;
}

export async function getAppointmentById(id: string): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .select(COLUMNS_WITH_NAMES)
    .eq('id', id)
    .single();

  if (error) throw error;
  return flattenNames(data);
}

export async function updateAppointment(id: string, input: UpdateAppointmentInput): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .update(input)
    .eq('id', id)
    .select(REAL_COLUMNS)
    .single();

  if (error) throwFriendlyAppointmentError(error);
  return data as Appointment;
}

export async function cancelAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) throw error;
}

// ── Conflict detection ────────────────────────────────────────

const NULL_UUID = '00000000-0000-0000-0000-000000000000';

export async function checkAppointmentConflicts(input: ConflictCheckInput): Promise<ConflictResult> {
  const messages: string[] = [];
  const excludeId = input.excludeAppointmentId ?? NULL_UUID;

  for (const clientId of input.clientIds) {
    const { data } = await supabase
      .from('appointments')
      .select('id, title')
      .eq('client_id', clientId)
      .neq('status', 'cancelled')
      .lt('start_time', input.end_time)
      .gt('end_time', input.start_time)
      .not('id', 'eq', excludeId);

    if (data && data.length > 0) {
      const name = input.clientNames[clientId] ?? 'Un cliente';
      messages.push(`${name} ya tiene una cita en ese horario ("${data[0].title}").`);
    }
  }

  if (input.coachId) {
    const { data } = await supabase
      .from('appointments')
      .select('id, title')
      .eq('coach_id', input.coachId)
      .neq('status', 'cancelled')
      .lt('start_time', input.end_time)
      .gt('end_time', input.start_time)
      .not('id', 'eq', excludeId);

    if (data && data.length > 0) {
      const name = input.coachName ?? 'El coach seleccionado';
      messages.push(`${name} ya tiene una cita en ese horario ("${data[0].title}").`);
    }
  }

  return { hasConflict: messages.length > 0, messages };
}

// ── Create individual appointments (one per client) ───────────
export async function createIndividualAppointments(
  inputs: CreateAppointmentInput[]
): Promise<Appointment[]> {
  return Promise.all(inputs.map((inp) => createAppointment({ ...inp, group_mode: 'individual' })));
}

// ── Create group appointment (one appointment + participants) ──
export async function createGroupAppointment(
  base: CreateAppointmentInput,
  participantIds: string[]
): Promise<Appointment> {
  const apt = await createAppointment({ ...base, group_mode: 'group' });

  if (participantIds.length > 0) {
    const rows = participantIds.map((userId) => ({
      appointment_id: apt.id,
      user_id: userId,
      tenant_id: base.tenant_id,
    }));
    const { error } = await supabase.from('appointment_participants').insert(rows);
    if (error) throw error;
  }

  return apt;
}

export async function cancelExpiredAppointments(tenantId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('tenant_id', tenantId)
    .in('status', ['scheduled', 'confirmed'])
    .lt('end_time', now);
}

export async function cancelExpiredClientAppointments(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('client_id', userId)
    .in('status', ['scheduled', 'confirmed', 'pending_confirmation'])
    .lt('end_time', now);
}

export async function confirmAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'confirmed' })
    .eq('id', id);
  if (error) throw error;
}

export async function declineAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) throw error;
}
