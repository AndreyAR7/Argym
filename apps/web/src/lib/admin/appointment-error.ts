// Postgres exclusion-constraint violation (23P01) — the real, DB-level
// no-overlap guard added in migration 20240101000171. The client-side
// checkAppointmentConflicts / DayPreviewStrip warn ahead of time, but a
// race between two concurrent requests can still only be caught here.
//
// Kept out of appointment-actions.ts (a 'use server' file, which may only
// export async functions) so this pure mapping stays unit-testable.
export function friendlyAppointmentError(error: { code?: string; message: string }): string {
  if (error.code === '23P01') {
    return 'Ese horario ya se traslapa con otra cita del mismo coach o cliente. Elige otro horario.'
  }
  return error.message
}
