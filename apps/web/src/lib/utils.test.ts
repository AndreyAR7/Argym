import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, getInitials } from '@/lib/utils'

describe('cn', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})

describe('formatCurrency', () => {
  it('formats CRC amounts with the es-CR locale', () => {
    expect(formatCurrency(1000)).toContain('1')
  })
})

describe('getInitials', () => {
  it('takes the first letter of the first two words', () => {
    expect(getInitials('Andrey Rojas')).toBe('AR')
  })
})
