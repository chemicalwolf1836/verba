import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { UnitUnlockRing } from './UnitUnlockRing'
import { currentUnitGoal } from '@/lib/goals'
import type { CardProgress, ProgressMap } from '@/lib/leitner'
import type { Card, Course } from '@/lib/courses'

/**
 * Minimal render harness (no @testing-library/react available offline), matching
 * the pattern used by lib/useProgress.test.tsx.
 */
function render(node: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(node)
  })
  return {
    container,
    unmount: () => act(() => root.unmount()),
  }
}

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
  unitLabel: 'Week',
  units: [
    { id: 'u1', index: 1, theme: 'Greetings' },
    { id: 'u2', index: 2, theme: 'Numbers' },
  ],
  cards: [
    ...Array.from({ length: 8 }, (_, i) => card(`a${i}`, 'u1')),
    ...Array.from({ length: 8 }, (_, i) => card(`b${i}`, 'u2')),
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

describe('UnitUnlockRing', () => {
  it('renders the caption toward the unlock threshold, not the unit total (5 of 8, threshold 6 -> "1 more")', () => {
    // unlockPoint(8) = ceil(8 * 0.75) = 6, so 5 learned needs 1 more, never 3.
    const progress = learned(['a0', 'a1', 'a2', 'a3', 'a4'])
    const goal = currentUnitGoal(course, progress)
    expect(goal).not.toBeNull()
    expect(goal!.toUnlock).toBe(1)

    const { container, unmount } = render(<UnitUnlockRing goal={goal!} unitLabel={course.unitLabel} />)
    expect(container.textContent).toContain('5 of 8 learned')
    expect(container.textContent).toContain('1 more to unlock Week 2')
    expect(container.textContent).not.toContain('3 more')
    unmount()
  })

  it('tracks the lowest unfinished unlocked unit, ignoring which card is on screen', () => {
    // Unit 1 is fully learned and past its unlock threshold, so the goal must be
    // unit 2 - regardless of what card happens to be showing (a review from unit 1,
    // say). currentUnitGoal is fed only course + progress, never a card.
    const progress = learned(['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'])
    const goal = currentUnitGoal(course, progress)
    expect(goal!.unit.id).toBe('u2')

    const { container, unmount } = render(<UnitUnlockRing goal={goal!} unitLabel={course.unitLabel} />)
    expect(container.textContent).toContain('Week 2 - Numbers')
    unmount()
  })

  it('renders the honest end-state on the final unit: remaining-in-unit, no "unlock null"', () => {
    // Unit 2 is the last unit (no nextUnit) and still below its own threshold, so
    // toUnlock > 0 but nextUnit is null - the ring must fall back to a remaining
    // count for the unit itself, not print "unlock null".
    const progress = learned(['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'b0', 'b1'])
    const goal = currentUnitGoal(course, progress)
    expect(goal!.unit.id).toBe('u2')
    expect(goal!.nextUnit).toBeNull()
    expect(goal!.toUnlock).toBeGreaterThan(0)

    const { container, unmount } = render(<UnitUnlockRing goal={goal!} unitLabel={course.unitLabel} />)
    expect(container.textContent).toContain('6 words left in Week 2')
    expect(container.textContent).not.toContain('null')
    unmount()
  })

  it('uses the course unitLabel rather than a hardcoded "Week"', () => {
    const jlptCourse: Course = { ...course, unitLabel: 'Set' }
    const goal = currentUnitGoal(jlptCourse, {})
    const { container, unmount } = render(<UnitUnlockRing goal={goal!} unitLabel={jlptCourse.unitLabel} />)
    expect(container.textContent).toContain('Set 1')
    expect(container.textContent).not.toContain('Week')
    unmount()
  })
})
