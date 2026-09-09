import { describe, it, expect } from 'vitest'
import { APPOINTMENT_STATUSES } from '@platform/types'
import { TRANSITIONS, STATUS_LABELS } from './appointment-status-transitions'

describe('appointment status transitions/labels coverage', () => {
  it.each(APPOINTMENT_STATUSES)('has a TRANSITIONS entry for "%s"', (status) => {
    expect(TRANSITIONS[status], `missing TRANSITIONS entry for "${status}"`).toBeDefined()
  })

  it.each(APPOINTMENT_STATUSES)('has a translated STATUS_LABELS entry for "%s"', (status) => {
    expect(STATUS_LABELS[status], `missing label for "${status}"`).toBeTruthy()
  })
})
