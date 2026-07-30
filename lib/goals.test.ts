import { describe, it, expect } from 'vitest'
import { boxDistribution, currentUnitGoal, masteredCount, notLearnedCount } from './goals'
import type { CardProgress, ProgressMap } from './leitner'
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
  code: 'TST',
  target: 'X',
  unitLabel: 'Unit',
  units: [
    { id: 'u1', index: 1, theme: 'One' },
    { id: 'u2', index: 2, theme: 'Two' },
  ],
  cards: [
    ...Array.from({ length: 4 }, (_, i) => card(`a${i}`, 'u1')),
    ...Array.from({ length: 4 }, (_, i) => card(`b${i}`, 'u2')),
  ],
}

const box = (n: CardProgress['box']): CardProgress => ({
  box: n,
  seen: 1,
  correct: 1,
  lastSeen: 1,
})

const learned = (ids: string[]): ProgressMap =>
  Object.fromEntries(ids.map((id) => [id, box(2)]))

describe('currentUnitGoal', () => {
  it('targets the first unit with no progress', () => {
    const g = currentUnitGoal(course, {})
    expect(g?.unit.id).toBe('u1')
    expect(g?.learned).toBe(0)
    expect(g?.total).toBe(4)
    expect(g?.unlockAt).toBe(3)
    expect(g?.toUnlock).toBe(3)
    expect(g?.nextUnit?.id).toBe('u2')
  })

  it('counts down against the unlock point, not the unit total', () => {
    // 2 of 4 learned, threshold is 3 - so 1 more, never 2
    expect(currentUnitGoal(course, learned(['a0', 'a1']))?.toUnlock).toBe(1)
  })

  it('reports 0 remaining once the threshold is met', () => {
    const g = currentUnitGoal(course, learned(['a0', 'a1', 'a2']))
    expect(g?.unit.id).toBe('u2')
    expect(g?.toUnlock).toBe(3)
  })

  it('returns null when every unit has met its threshold', () => {
    expect(currentUnitGoal(course, learned(['a0', 'a1', 'a2', 'b0', 'b1', 'b2']))).toBeNull()
  })

  it('has no next unit on the final unit', () => {
    const g = currentUnitGoal(course, learned(['a0', 'a1', 'a2']))
    expect(g?.nextUnit).toBeNull()
  })

  it('honors unlockPoint\'s rounding at a non-integer threshold', () => {
    // A 5-card unit has unlockPoint(5) = ceil(5 * 0.75) = ceil(3.75) = 4, not
    // 3 (floor) and not 3.75. This is the case the 4-card fixture above can't
    // exercise, since ceil(4 * 0.75) = 3 lands on a whole number either way.
    const roundingCourse: Course = {
      ...course,
      cards: [
        ...Array.from({ length: 5 }, (_, i) => card(`c${i}`, 'u1')),
        ...course.cards.filter((c) => c.unitId === 'u2'),
      ],
    }
    const oneShort = currentUnitGoal(roundingCourse, learned(['c0', 'c1', 'c2']))
    expect(oneShort?.unlockAt).toBe(4)
    expect(oneShort?.toUnlock).toBe(1)

    const justPast = currentUnitGoal(roundingCourse, learned(['c0', 'c1', 'c2', 'c3']))
    expect(justPast?.unit.id).toBe('u2')
  })
})

describe('boxDistribution', () => {
  it('counts every card, treating missing records as box 1', () => {
    const p: ProgressMap = { a0: box(5), a1: box(3), a2: box(3) }
    const d = boxDistribution(course.cards, p)
    expect(d).toEqual([5, 0, 2, 0, 1])
    expect(d.reduce((a, b) => a + b, 0)).toBe(course.cards.length)
  })
})

describe('masteredCount and notLearnedCount', () => {
  it('counts box 5 as mastered and box 1 as not learned', () => {
    const p: ProgressMap = { a0: box(5), a1: box(5), a2: box(2) }
    expect(masteredCount(course.cards, p)).toBe(2)
    expect(notLearnedCount(course.cards, p)).toBe(5)
  })
})

import { weakestCards, drillPool, isWeak, WEAK_COUNT } from './goals'
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'

const boxWithLastSeen = (n: CardProgress['box'], lastSeen = 0): CardProgress => ({
  box: n,
  seen: 1,
  correct: 0,
  lastSeen,
})

describe('weakestCards', () => {
  it('orders by box ascending, then by lastSeen ascending', () => {
    // Input order and each single key deliberately disagree with the final order,
    // so a sort using only box, or only lastSeen, or relying on input order, fails.
    const cards = [
      { id: 'a-box2-fresh' } as never,   // box 2, high lastSeen
      { id: 'b-box1-stale-late' } as never, // box 1, high lastSeen, listed before its box-mate
      { id: 'c-box1-stale-early' } as never, // box 1, low lastSeen
    ]
    const progress: ProgressMap = {
      'a-box2-fresh': boxWithLastSeen(2, 5),
      'b-box1-stale-late': boxWithLastSeen(1, 99),
      'c-box1-stale-early': boxWithLastSeen(1, 10),
    }
    // box asc puts the two box-1 cards first; within box 1, lastSeen asc puts
    // the low-lastSeen card first. Final: c, b, a.
    const out = weakestCards(cards, progress, 3).map((c) => c.id)
    expect(out).toEqual(['c-box1-stale-early', 'b-box1-stale-late', 'a-box2-fresh'])
  })

  it('treats an unseen card as box 1, ranking it above a stronger card, and takes at most n', () => {
    const cards = [{ id: 'strong' } as never, { id: 'unseen' } as never, { id: 'also-unseen' } as never]
    const progress: ProgressMap = { strong: boxWithLastSeen(4, 0) }
    // 'unseen' and 'also-unseen' have no progress -> box 1 -> weaker than 'strong' (box 4).
    const out = weakestCards(cards, progress, 2).map((c) => c.id)
    expect(out).toHaveLength(2)
    expect(out).not.toContain('strong')
  })

  it('excludes solid cards (box 4 and 5) even when fewer than n weak cards remain', () => {
    // The list is "words to shore up", not "the bottom n by rank" - a card answered
    // right three times running is not something to shore up.
    const cards = [
      { id: 'w-box3' } as never,
      { id: 's-box4' } as never,
      { id: 's-box5' } as never,
    ]
    const progress: ProgressMap = {
      'w-box3': boxWithLastSeen(3, 1),
      's-box4': boxWithLastSeen(4, 1),
      's-box5': boxWithLastSeen(5, 1),
    }
    const out = weakestCards(cards, progress, 8).map((c) => c.id)
    expect(out).toEqual(['w-box3'])
  })

  it('returns an empty list once every card is solid, so the empty state is reachable', () => {
    const cards = [{ id: 'a' } as never, { id: 'b' } as never]
    const progress: ProgressMap = { a: boxWithLastSeen(4, 1), b: boxWithLastSeen(5, 1) }
    expect(weakestCards(cards, progress, 8)).toEqual([])
  })
})

describe('isWeak', () => {
  it('counts boxes 1 to 3 as weak and 4 to 5 as solid', () => {
    expect(isWeak(undefined)).toBe(true)
    expect(isWeak(boxWithLastSeen(1))).toBe(true)
    expect(isWeak(boxWithLastSeen(3))).toBe(true)
    expect(isWeak(boxWithLastSeen(4))).toBe(false)
    expect(isWeak(boxWithLastSeen(5))).toBe(false)
  })
})

describe('drillPool', () => {
  it('returns the full unlocked pool when mode is null', () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    expect(drillPool(course, {}, null).length).toBeGreaterThan(WEAK_COUNT)
  })

  it('returns at most WEAK_COUNT weakest cards when mode is "weak"', () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    expect(drillPool(course, {}, 'weak')).toHaveLength(WEAK_COUNT)
  })
})
