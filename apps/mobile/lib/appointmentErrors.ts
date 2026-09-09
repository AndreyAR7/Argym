// Postgres exclusion-constraint violation (23P01) — the real, DB-level
// no-overlap guard added in migration 20240101000171. The client-side
// checkAppointmentConflicts / DayPreviewStrip warn ahead of time, but a
// race between two concurrent requests can still only be caught here.
//
// Kept out of services/appointments.service.ts (which imports the live
// Supabase client) so this pure mapping stays unit-testable in isolation.
export function throwFriendlyAppointmentError(error: { code?: string; message: string }): never {
  if (error.code === '23P01') {
    throw new Error('Ese horario ya se traslapa con otra cita del mismo coach o cliente. Elige otro horario.');
  }
  throw error;
}
