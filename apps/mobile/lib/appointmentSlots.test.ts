import { computeSlotConflicts, buildStartISO, buildEndISO } from './appointmentSlots';
import { isActiveAppointmentStatus } from '@/types/appointments';
import type { Appointment } from '@/types/appointments';

// Exercises a real (non type-only) import through @/types/appointments,
// which now re-exports from the @platform/types workspace package — a
// runtime require(), unlike the `import type` above (erased at compile
// time), proving the pnpm workspace symlink actually resolves under Jest.
describe('isActiveAppointmentStatus (re-exported from @platform/types)', () => {
  it('treats pending_confirmation, scheduled, confirmed and postpone_requested as active', () => {
    expect(isActiveAppointmentStatus('pending_confirmation')).toBe(true);
    expect(isActiveAppointmentStatus('scheduled')).toBe(true);
    expect(isActiveAppointmentStatus('confirmed')).toBe(true);
    expect(isActiveAppointmentStatus('postpone_requested')).toBe(true);
  });

  it('treats completed, no_show and cancelled as not active', () => {
    expect(isActiveAppointmentStatus('completed')).toBe(false);
    expect(isActiveAppointmentStatus('no_show')).toBe(false);
    expect(isActiveAppointmentStatus('cancelled')).toBe(false);
  });
});

function apt(overrides: Partial<Appointment>): Appointment {
  return {
    id: 'a1',
    tenant_id: 't1',
    client_id: 'client-1',
    coach_id: 'coach-1',
    title: 'Sesión',
    start_time: '2026-01-05T14:00:00.000Z',
    end_time: '2026-01-05T15:00:00.000Z',
    status: 'confirmed',
    ...overrides,
  } as Appointment;
}

describe('computeSlotConflicts', () => {
  it('flags an overlap with the same coach', () => {
    const existing = [apt({ coach_id: 'coach-1', client_id: 'other-client' })];
    const result = computeSlotConflicts(
      existing,
      '2026-01-05T14:30:00.000Z',
      '2026-01-05T15:30:00.000Z',
      ['client-2'],
      'coach-1',
    );
    expect(result.hasConflicts).toBe(true);
    expect(result.conflictTitles).toContain('Sesión');
  });

  it('flags an overlap with a selected client, regardless of coach', () => {
    const existing = [apt({ coach_id: 'someone-else', client_id: 'client-2' })];
    const result = computeSlotConflicts(
      existing,
      '2026-01-05T14:30:00.000Z',
      '2026-01-05T15:30:00.000Z',
      ['client-2'],
      null,
    );
    expect(result.hasConflicts).toBe(true);
  });

  it('ignores cancelled appointments', () => {
    const existing = [apt({ coach_id: 'coach-1', status: 'cancelled' })];
    const result = computeSlotConflicts(
      existing,
      '2026-01-05T14:30:00.000Z',
      '2026-01-05T15:30:00.000Z',
      [],
      'coach-1',
    );
    expect(result.hasConflicts).toBe(false);
  });

  it('does not flag back-to-back appointments that only touch at the boundary', () => {
    const existing = [apt({ coach_id: 'coach-1', start_time: '2026-01-05T13:00:00.000Z', end_time: '2026-01-05T14:00:00.000Z' })];
    const result = computeSlotConflicts(
      existing,
      '2026-01-05T14:00:00.000Z',
      '2026-01-05T15:00:00.000Z',
      [],
      'coach-1',
    );
    expect(result.hasConflicts).toBe(false);
  });

  it('does not flag an unrelated coach/client', () => {
    const existing = [apt({ coach_id: 'coach-2', client_id: 'client-9' })];
    const result = computeSlotConflicts(
      existing,
      '2026-01-05T14:30:00.000Z',
      '2026-01-05T15:30:00.000Z',
      ['client-2'],
      'coach-1',
    );
    expect(result.hasConflicts).toBe(false);
  });
});

describe('buildStartISO / buildEndISO', () => {
  it('builds an ISO start time from a date, hour and minute', () => {
    const start = buildStartISO(new Date('2026-01-05T00:00:00'), '09', '30');
    expect(new Date(start).getHours()).toBe(9);
    expect(new Date(start).getMinutes()).toBe(30);
  });

  it('adds the duration in minutes to get the end time', () => {
    const start = buildStartISO(new Date('2026-01-05T00:00:00'), '09', '00');
    const end = buildEndISO(start, 90);
    const diffMinutes = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
    expect(diffMinutes).toBe(90);
  });
});
