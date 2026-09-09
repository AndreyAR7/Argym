import type { AppointmentStatus as Status } from '@platform/types'

export type { AppointmentStatus as Status } from '@platform/types'

// Pure data, no JSX — split out of appointment-status-select.tsx so it can
// be unit-tested without Vitest needing to parse/transform the component's
// JSX. Exported so a coverage test can assert every AppointmentStatus has a
// (possibly empty) transitions entry and a translated label — a status
// silently missing from one of these maps used to mean a raw enum string
// leaking into the UI, or `TRANSITIONS[status]` reading undefined.
export const TRANSITIONS: Record<Status, Status[]> = {
  pending_confirmation: ['confirmed', 'cancelled'],
  postpone_requested:   ['pending_confirmation', 'confirmed', 'cancelled'],
  scheduled:            ['confirmed', 'cancelled'],
  confirmed:            ['completed', 'no_show', 'cancelled'],
  completed:            [],
  no_show:              [],
  cancelled:            [],
}

export const STATUS_LABELS: Record<Status, string> = {
  pending_confirmation: 'Pend. confirmación',
  postpone_requested:   'Cambio solicitado',
  scheduled:            'Programada',
  confirmed:            'Confirmada',
  completed:            'Completada',
  no_show:              'No asistió',
  cancelled:            'Cancelada',
}
