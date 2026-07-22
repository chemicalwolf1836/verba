import { describe, it, expect } from 'vitest'
import { grade, isLearned, isMastered, type CardProgress } from './leitner'

const NOW = 1_700_000_000_000

const at = (box: CardProgress['box']): CardProgress => ({
  box,
  seen: 1,
  correct: 0,
  lastSeen: 0,
})

describe('isLearned', () => {
  it('treats a missing record as box 1, which is not learned', () => {
    expect(isLearned(undefined)).toBe(false)
    expect(isLearned(at(1))).toBe(false)
  })

  it('is true from box 2 upward', () => {
    expect(isLearned(at(2))).toBe(true)
    expect(isLearned(at(5))).toBe(true)
  })
})

describe('isMastered', () => {
  it('is true only in box 5', () => {
    expect(isMastered(undefined)).toBe(false)
    expect(isMastered(at(4))).toBe(false)
    expect(isMastered(at(5))).toBe(true)
  })
})

describe('grade', () => {
  it('starts an unseen card in box 2 when answered correctly', () => {
    const p = grade(undefined, true, NOW)
    expect(p).toEqual({ box: 2, seen: 1, correct: 1, lastSeen: NOW })
  })

  it('starts an unseen card in box 1 when missed', () => {
    const p = grade(undefined, false, NOW)
    expect(p).toEqual({ box: 1, seen: 1, correct: 0, lastSeen: NOW })
  })

  it('promotes one box at a time and caps at 5', () => {
    expect(grade(at(3), true, NOW).box).toBe(4)
    expect(grade(at(5), true, NOW).box).toBe(5)
  })

  it('resets to box 1 on a miss, not one box down', () => {
    expect(grade(at(5), false, NOW).box).toBe(1)
  })

  it('increments counters and stamps lastSeen', () => {
    const prev: CardProgress = { box: 2, seen: 3, correct: 2, lastSeen: 1 }
    expect(grade(prev, true, NOW)).toEqual({ box: 3, seen: 4, correct: 3, lastSeen: NOW })
  })
})
