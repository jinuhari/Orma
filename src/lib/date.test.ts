import { describe, expect, it } from 'vitest'

import { addDays, prettyTime, toDateKey } from './date'

describe('date utilities', () => {
  it('formats date keys and adds days', () => {
    const key = toDateKey(new Date('2026-10-20T12:00:00'))
    expect(key).toBe('2026-10-20')
    expect(addDays('2026-10-20', 1)).toBe('2026-10-21')
  })

  it('formats 24h time to readable label', () => {
    expect(prettyTime('00:05')).toBe('12:05 AM')
    expect(prettyTime('13:30')).toBe('1:30 PM')
  })
})
