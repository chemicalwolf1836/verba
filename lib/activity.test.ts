import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ACTIVITY_KEY,
  dayKey,
  dailyRate,
  loadActivity,
  projectDays,
  recordGrade,
  subscribeActivity,
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

  it('drops entries older than 98 days', () => {
    recordGrade(NOW - 110 * DAY)
    recordGrade(NOW)
    expect(Object.keys(loadActivity())).toEqual(['2026-07-22'])
  })

  it('recovers from corrupt storage', () => {
    localStorage.setItem(ACTIVITY_KEY, 'nonsense')
    recordGrade(NOW)
    expect(loadActivity()).toEqual({ '2026-07-22': 1 })
  })

  it('keeps the oldest surviving day and drops the day just before it', () => {
    recordGrade(NOW - 99 * DAY)
    recordGrade(NOW - 98 * DAY)
    recordGrade(NOW)
    const keys = Object.keys(loadActivity())
    expect(keys).toContain(dayKey(NOW - 98 * DAY))
    expect(keys).not.toContain(dayKey(NOW - 99 * DAY))
  })

  it('notifies a same-tab subscriber after a successful write (the storage event does not fire in the writing tab)', () => {
    const fn = vi.fn()
    const unsubscribe = subscribeActivity(fn)
    recordGrade(NOW)
    expect(fn).toHaveBeenCalled()
    unsubscribe()
  })

  it('does not notify subscribers when the write fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const fn = vi.fn()
    const unsubscribe = subscribeActivity(fn)
    recordGrade(NOW)
    expect(fn).not.toHaveBeenCalled()
    unsubscribe()
    spy.mockRestore()
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

  it('counts the last in-window day and excludes the first out-of-window day', () => {
    const included = { [dayKey(NOW - 6 * DAY)]: 7 }
    expect(dailyRate(included, NOW)).toBe(1)

    const excluded = { [dayKey(NOW - 7 * DAY)]: 700 }
    expect(dailyRate(excluded, NOW)).toBe(0)
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

import { studyStreak, heatmapCells, totalStudyDays } from './activity'

const NOW2 = Date.UTC(2026, 6, 28, 12, 0, 0)
const D = 86_400_000
const key = (n: number) => new Date(n).toISOString().slice(0, 10)

describe('studyStreak', () => {
  it('is 0 for an empty log', () => {
    expect(studyStreak({}, NOW2)).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    const log = { [key(NOW2)]: 3, [key(NOW2 - D)]: 1, [key(NOW2 - 2 * D)]: 5 }
    expect(studyStreak(log, NOW2)).toBe(3)
  })

  it('keeps yesterday\'s run alive when today is not yet studied', () => {
    const log = { [key(NOW2 - D)]: 2, [key(NOW2 - 2 * D)]: 2 }
    expect(studyStreak(log, NOW2)).toBe(2)
  })

  it('resets after a full missed day', () => {
    const log = { [key(NOW2)]: 1, [key(NOW2 - 2 * D)]: 9 }
    expect(studyStreak(log, NOW2)).toBe(1)
  })
})

describe('heatmapCells', () => {
  it('returns weeks*7 cells, oldest first, last cell is today', () => {
    const cells = heatmapCells({}, NOW2, 13)
    expect(cells).toHaveLength(91)
    expect(cells[90].date).toBe(key(NOW2))
    expect(cells[0].date).toBe(key(NOW2 - 90 * D))
  })

  it('buckets counts into levels 0-3', () => {
    const log = { [key(NOW2)]: 0, [key(NOW2 - D)]: 2, [key(NOW2 - 2 * D)]: 9, [key(NOW2 - 3 * D)]: 40 }
    const byDate = Object.fromEntries(heatmapCells(log, NOW2, 13).map((c) => [c.date, c.level]))
    expect(byDate[key(NOW2)]).toBe(0)
    expect(byDate[key(NOW2 - D)]).toBe(1)
    expect(byDate[key(NOW2 - 2 * D)]).toBe(2)
    expect(byDate[key(NOW2 - 3 * D)]).toBe(3)
  })
})

describe('totalStudyDays', () => {
  it('counts distinct days with any activity', () => {
    expect(totalStudyDays({ a: 3, b: 0, c: 1 })).toBe(2)
  })
})
