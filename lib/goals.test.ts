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
