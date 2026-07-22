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

import { nextCard, unlockPoint, unlockedUnits, unlockedCards, TUNING } from './leitner'
import type { Card, Course } from '@/lib/courses'

const card = (id: string, unitId: string): Card => ({
  id,
  courseId: 'test',
  unitId,
  deck: 'vocab',
  jp: id,
  reading: id,
  meaning: id,
  theme: 't',
  origin: 'drafted',
})

const course: Course = {
  id: 'test',
  name: 'Test',
  unitLabel: 'Unit',
  units: [
    { id: 'u1', index: 1, theme: 't' },
    { id: 'u2', index: 2, theme: 't' },
    { id: 'u3', index: 3, theme: 't' },
  ],
  cards: [
    ...Array.from({ length: 4 }, (_, i) => card(`a${i}`, 'u1')),
    ...Array.from({ length: 4 }, (_, i) => card(`b${i}`, 'u2')),
    ...Array.from({ length: 4 }, (_, i) => card(`c${i}`, 'u3')),
  ],
}

const learned = (ids: string[]): Record<string, CardProgress> =>
  Object.fromEntries(ids.map((id) => [id, { box: 2 as const, seen: 1, correct: 1, lastSeen: 1 }]))

describe('unlockPoint', () => {
  it('rounds up to 75% of the unit', () => {
    expect(unlockPoint(8)).toBe(6)
    expect(unlockPoint(4)).toBe(3)
    expect(unlockPoint(1)).toBe(1)
  })
})

describe('unlockedUnits', () => {
  it('unlocks only the first unit with no progress', () => {
    expect(unlockedUnits(course, {}).map((u) => u.id)).toEqual(['u1'])
  })

  it('unlocks the next unit once the threshold is met, not the whole unit', () => {
    // 3 of 4 is exactly the 75% threshold
    expect(unlockedUnits(course, learned(['a0', 'a1', 'a2'])).map((u) => u.id)).toEqual([
      'u1',
      'u2',
    ])
  })

  it('does not unlock past a unit that has not met the threshold', () => {
    const p = learned(['a0', 'a1', 'a2', 'a3', 'b0'])
    expect(unlockedUnits(course, p).map((u) => u.id)).toEqual(['u1', 'u2'])
  })
})

describe('unlockedCards', () => {
  it('includes cards with no unit, such as phrases, from the start', () => {
    const withPhrase: Course = {
      ...course,
      cards: [...course.cards, card('p0', '')],
    }
    expect(unlockedCards(withPhrase, {}).map((c) => c.id)).toContain('p0')
  })
})

describe('nextCard', () => {
  const pool = course.cards.filter((c) => c.unitId === 'u1')

  it('returns null when the pool is empty', () => {
    expect(nextCard([], {}, [])).toBeNull()
  })

  it('serves an unseen card at position 0', () => {
    expect(nextCard(pool, {}, [])?.id).toBe('a0')
  })

  it('prefers the weakest review card at a non-new position', () => {
    // history length 1 is not a multiple of NEW_CARD_INTERVAL, so a review is due
    const p: Record<string, CardProgress> = {
      a0: { box: 4, seen: 2, correct: 2, lastSeen: 10 },
      a1: { box: 1, seen: 2, correct: 0, lastSeen: 20 },
      a2: { box: 2, seen: 2, correct: 1, lastSeen: 5 },
      a3: { box: 3, seen: 2, correct: 1, lastSeen: 1 },
    }
    expect(nextCard(pool, p, ['x'])?.id).toBe('a1')
  })

  it('breaks ties within a box by staleness, oldest first', () => {
    const p: Record<string, CardProgress> = {
      a0: { box: 2, seen: 1, correct: 1, lastSeen: 50 },
      a1: { box: 2, seen: 1, correct: 1, lastSeen: 10 },
      a2: { box: 2, seen: 1, correct: 1, lastSeen: 30 },
      a3: { box: 2, seen: 1, correct: 1, lastSeen: 20 },
    }
    expect(nextCard(pool, p, ['x'])?.id).toBe('a1')
  })

  it('avoids repeating a card seen within MIN_GAP positions', () => {
    const p: Record<string, CardProgress> = {
      a0: { box: 1, seen: 1, correct: 0, lastSeen: 1 },
      a1: { box: 2, seen: 1, correct: 1, lastSeen: 1 },
      a2: { box: 3, seen: 1, correct: 1, lastSeen: 1 },
      a3: { box: 4, seen: 1, correct: 1, lastSeen: 1 },
    }
    // a0 is the weakest but was just shown
    expect(nextCard(pool, p, ['x', 'a0'])?.id).toBe('a1')
  })

  it('ignores MIN_GAP when nothing else is available', () => {
    const single = [card('solo', 'u1')]
    const p: Record<string, CardProgress> = {
      solo: { box: 2, seen: 1, correct: 1, lastSeen: 1 },
    }
    expect(nextCard(single, p, ['solo'])?.id).toBe('solo')
  })

  it('interleaves a new card every NEW_CARD_INTERVAL positions', () => {
    const p: Record<string, CardProgress> = {
      a0: { box: 2, seen: 1, correct: 1, lastSeen: 1 },
      a1: { box: 2, seen: 1, correct: 1, lastSeen: 2 },
    }
    // a2 and a3 are unseen; position 5 is a multiple of NEW_CARD_INTERVAL
    const history = ['q', 'r', 's', 't', 'u']
    expect(history.length % TUNING.NEW_CARD_INTERVAL).toBe(0)
    expect(nextCard(pool, p, history)?.id).toBe('a2')
  })
})
