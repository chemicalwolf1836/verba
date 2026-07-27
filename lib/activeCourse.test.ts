import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  COURSE_KEY,
  loadActiveCourseId,
  saveActiveCourseId,
  subscribeActiveCourse,
} from './activeCourse'
import { DEFAULT_COURSE_ID } from './courses'

beforeEach(() => {
  localStorage.clear()
})

describe('loadActiveCourseId', () => {
  it('returns the default course when nothing is stored', () => {
    expect(loadActiveCourseId()).toBe(DEFAULT_COURSE_ID)
  })

  it('returns the stored id when it names a real course', () => {
    localStorage.setItem(COURSE_KEY, DEFAULT_COURSE_ID)
    expect(loadActiveCourseId()).toBe(DEFAULT_COURSE_ID)
  })

  it('falls back to the default when the stored id names no known course', () => {
    localStorage.setItem(COURSE_KEY, 'course-that-was-removed')
    expect(loadActiveCourseId()).toBe(DEFAULT_COURSE_ID)
  })
})

describe('saveActiveCourseId', () => {
  it('persists the id and notifies subscribers', () => {
    let notified = 0
    const unsub = subscribeActiveCourse(() => {
      notified++
    })

    saveActiveCourseId(DEFAULT_COURSE_ID)

    expect(localStorage.getItem(COURSE_KEY)).toBe(DEFAULT_COURSE_ID)
    expect(notified).toBe(1)
    unsub()
  })

  it('does not notify subscribers when the write fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    let notified = 0
    const unsub = subscribeActiveCourse(() => {
      notified++
    })

    expect(() => saveActiveCourseId(DEFAULT_COURSE_ID)).not.toThrow()
    expect(notified).toBe(0)

    unsub()
    spy.mockRestore()
  })
})
