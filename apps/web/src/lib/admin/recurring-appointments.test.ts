import { describe, it, expect } from 'vitest'
import { computeWeeklyOccurrences } from '@platform/types'

describe('computeWeeklyOccurrences', () => {
  it('returns just the first occurrence when count is 1', () => {
    const result = computeWeeklyOccurrences('2026-01-05T10:00:00.000Z', '2026-01-05T11:00:00.000Z', 1)
    expect(result).toEqual([
      { start_time: '2026-01-05T10:00:00.000Z', end_time: '2026-01-05T11:00:00.000Z' },
    ])
  })

  it('generates N occurrences spaced exactly 7 days apart', () => {
    const result = computeWeeklyOccurrences('2026-01-05T10:00:00.000Z', '2026-01-05T11:00:00.000Z', 4)
    expect(result).toEqual([
      { start_time: '2026-01-05T10:00:00.000Z', end_time: '2026-01-05T11:00:00.000Z' },
      { start_time: '2026-01-12T10:00:00.000Z', end_time: '2026-01-12T11:00:00.000Z' },
      { start_time: '2026-01-19T10:00:00.000Z', end_time: '2026-01-19T11:00:00.000Z' },
      { start_time: '2026-01-26T10:00:00.000Z', end_time: '2026-01-26T11:00:00.000Z' },
    ])
  })

  it('preserves the original duration across every occurrence', () => {
    const result = computeWeeklyOccurrences('2026-03-01T08:30:00.000Z', '2026-03-01T09:15:00.000Z', 3)
    for (const occ of result) {
      const durationMs = new Date(occ.end_time).getTime() - new Date(occ.start_time).getTime()
      expect(durationMs).toBe(45 * 60 * 1000)
    }
  })

  it('floors a fractional count and treats 0 or negative as 1', () => {
    expect(computeWeeklyOccurrences('2026-01-05T10:00:00.000Z', '2026-01-05T11:00:00.000Z', 2.9)).toHaveLength(2)
    expect(computeWeeklyOccurrences('2026-01-05T10:00:00.000Z', '2026-01-05T11:00:00.000Z', 0)).toHaveLength(1)
    expect(computeWeeklyOccurrences('2026-01-05T10:00:00.000Z', '2026-01-05T11:00:00.000Z', -3)).toHaveLength(1)
  })
})
