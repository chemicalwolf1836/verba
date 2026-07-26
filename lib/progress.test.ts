import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PROGRESS_KEY, loadProgress, saveProgress, subscribeProgress } from './progress'
import type { ProgressMap } from './leitner'

const sample: ProgressMap = {
  'bjt-vocab-会議': { box: 3, seen: 4, correct: 3, lastSeen: 1_700_000_000_000 },
}

describe('progress storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns an empty map when nothing is stored', () => {
    expect(loadProgress()).toEqual({})
  })

  it('round-trips a progress map', () => {
    saveProgress(sample)
    expect(loadProgress()).toEqual(sample)
  })

  it('returns an empty map rather than throwing on corrupt JSON', () => {
    localStorage.setItem(PROGRESS_KEY, '{not json')
    expect(loadProgress()).toEqual({})
  })

  it('discards a stored value that is not an object', () => {
    localStorage.setItem(PROGRESS_KEY, '"a string"')
    expect(loadProgress()).toEqual({})
  })

  it('drops entries whose shape is wrong rather than trusting them', () => {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ good: sample['bjt-vocab-会議'], bad: { box: 9 } }),
    )
    const loaded = loadProgress()
    expect(Object.keys(loaded)).toEqual(['good'])
  })

  it('drops an entry whose box is a non-integer rather than trusting it', () => {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ good: sample['bjt-vocab-会議'], bad: { box: 2.5, seen: 1, correct: 1, lastSeen: 1 } }),
    )
    const loaded = loadProgress()
    expect(Object.keys(loaded)).toEqual(['good'])
  })

  it('does not throw when the write fails (quota exceeded or private mode)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(() => saveProgress(sample)).not.toThrow()
    spy.mockRestore()
  })

  it('notifies subscribers after a successful write', () => {
    const fn = vi.fn()
    const unsubscribe = subscribeProgress(fn)
    saveProgress(sample)
    expect(fn).toHaveBeenCalled()
    unsubscribe()
  })

  it('does not notify subscribers when the write fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const fn = vi.fn()
    const unsubscribe = subscribeProgress(fn)
    saveProgress(sample)
    expect(fn).not.toHaveBeenCalled()
    unsubscribe()
    spy.mockRestore()
  })
})
