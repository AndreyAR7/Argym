import { throwFriendlyAppointmentError } from './appointmentErrors';

describe('throwFriendlyAppointmentError', () => {
  it('throws a clear message for a Postgres exclusion-constraint violation (23P01)', () => {
    expect(() => throwFriendlyAppointmentError({ code: '23P01', message: 'exclusion violation' }))
      .toThrow(/traslapa/);
  });

  it('rethrows any other error unchanged', () => {
    expect(() => throwFriendlyAppointmentError({ code: '23505', message: 'duplicate key value' }))
      .toThrow('duplicate key value');
  });

  it('rethrows when there is no code at all', () => {
    expect(() => throwFriendlyAppointmentError({ message: 'network error' }))
      .toThrow('network error');
  });
});
