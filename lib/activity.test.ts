import { describe, it, expect, beforeEach } from 'vitest'
import {
  ACTIVITY_KEY,
  dayKey,
  dailyRate,
  loadActivity,
  projectDays,
  recordGrade,
} from './activity'

const NOW = Date.UTC(2026, 6, 22, 12, 0, 0)
const DAY = 86_400_000

describe('dayKey', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(dayKey(NOW)).toBe('2026-07-22')
  })
})

describe('recordGrade', () => {
  beforeEach(() => localStorage.clear())

  it('counts grades per day', () => {
    recordGrade(NOW)
    recordGrade(NOW)
    recordGrade(NOW - DAY)
    expect(loadActivity()).toEqual({ '2026-07-22': 2, '2026-07-21': 1 })
  })

  it('drops entries older than 30 days', () => {
    recordGrade(NOW - 40 * DAY)
    recordGrade(NOW)
    expect(Object.keys(loadActivity())).toEqual(['2026-07-22'])
  })

  it('recovers from corrupt storage', () => {
    localStorage.setItem(ACTIVITY_KEY, 'nonsense')
    recordGrade(NOW)
    expect(loadActivity()).toEqual({ '2026-07-22': 1 })
  })
})

describe('dailyRate', () => {
  it('averages the last 7 days including empty ones', () => {
    const log = { '2026-07-22': 14, '2026-07-21': 7 }
    expect(dailyRate(log, NOW)).toBe(3)
  })

  it('is 0 with no activity', () => {
    expect(dailyRate({}, NOW)).toBe(0)
  })

  it('ignores days outside the window', () => {
    const log = { '2026-07-01': 700 }
    expect(dailyRate(log, NOW)).toBe(0)
  })
})

describe('projectDays', () => {
  it('returns null at a zero rate rather than Infinity', () => {
    expect(projectDays(100, 0)).toBeNull()
  })

  it('returns null when nothing is left', () => {
    expect(projectDays(0, 5)).toBeNull()
  })

  it('rounds up to whole days', () => {
    expect(projectDays(10, 3)).toBe(4)
  })
})
