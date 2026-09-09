import { describe, it, expect } from 'vitest'
import { friendlyAppointmentError } from './appointment-error'

describe('friendlyAppointmentError', () => {
  it('translates a Postgres exclusion-constraint violation (23P01) into a clear message', () => {
    const msg = friendlyAppointmentError({ code: '23P01', message: 'conflicting key value violates exclusion constraint' })
    expect(msg).toMatch(/traslapa/)
  })

  it('passes through any other error message unchanged', () => {
    const msg = friendlyAppointmentError({ code: '23505', message: 'duplicate key value' })
    expect(msg).toBe('duplicate key value')
  })

  it('passes through when there is no code at all', () => {
    const msg = friendlyAppointmentError({ message: 'network error' })
    expect(msg).toBe('network error')
  })
})
