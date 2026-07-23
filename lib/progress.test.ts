import { describe, it, expect, beforeEach } from 'vitest'
import { PROGRESS_KEY, loadProgress, saveProgress } from './progress'
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
})
