import { describe, it, expect } from 'vitest'
import { APPOINTMENT_STATUSES } from '@platform/types'
import { styles, labels } from './badge-variants'

describe('Badge appointment status coverage', () => {
  it.each(APPOINTMENT_STATUSES)('has a real (non-default) style and a translated label for "%s"', (status) => {
    expect(styles[status as keyof typeof styles], `missing style for "${status}"`).toBeDefined()
    expect(labels[status], `missing label for "${status}" (would render the raw enum value)`).toBeDefined()
  })
})
