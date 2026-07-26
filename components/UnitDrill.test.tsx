import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'
import type { CardProgress, ProgressMap } from '@/lib/leitner'

/**
 * Minimal render harness (no @testing-library/react available offline), matching
 * the pattern used by components/UnitUnlockRing.test.tsx.
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

const box = (n: CardProgress['box']): CardProgress => ({
  box: n,
  seen: 1,
  correct: 1,
  lastSeen: 1,
})

beforeEach(() => {
  localStorage.clear()
  // useProgress caches its snapshot at module scope - reset the registry so each
  // test gets a fresh cache, matching lib/useProgress.test.tsx's approach.
  vi.resetModules()
})

describe('UnitDrill', () => {
  it('shows week 1 - always unlocked - even with no progress saved', async () => {
    const { UnitDrill } = await import('./UnitDrill')
    const course = getCourse(DEFAULT_COURSE_ID)!
    const w1 = course.cards.filter((c) => c.unitId === 'w01')

    const { container, unmount } = render(<UnitDrill unitId="w01" />)
    expect(container.textContent).not.toContain('Locked')
    for (const c of w1) expect(container.textContent).toContain(c.jp)
    unmount()
  })

  it('refuses to drill week 2 while week 1 has not crossed unlockedUnits\' threshold - a direct URL visit must not leak the cards', async () => {
    const { UnitDrill } = await import('./UnitDrill')
    const course = getCourse(DEFAULT_COURSE_ID)!
    const w2 = course.cards.filter((c) => c.unitId === 'w02')

    const { container, unmount } = render(<UnitDrill unitId="w02" />)
    expect(container.textContent).toContain('Locked - finish the previous week first.')
    for (const c of w2) expect(container.textContent).not.toContain(c.jp)
    unmount()
  })

  it('shows week 2 once week 1 crosses unlockedUnits\' threshold - the same gate the browser uses, not a locally recomputed one', async () => {
    const { saveProgress } = await import('@/lib/progress')
    const course = getCourse(DEFAULT_COURSE_ID)!
    const w1cards = course.cards.filter((c) => c.unitId === 'w01')
    // unlockPoint(8) = ceil(8 * 0.75) = 6.
    const progress: ProgressMap = Object.fromEntries(
      w1cards.slice(0, 6).map((c) => [c.id, box(2)]),
    )
    saveProgress(progress)

    const { UnitDrill } = await import('./UnitDrill')
    const w2 = course.cards.filter((c) => c.unitId === 'w02')
    const { container, unmount } = render(<UnitDrill unitId="w02" />)
    expect(container.textContent).not.toContain('Locked')
    for (const c of w2) expect(container.textContent).toContain(c.jp)
    unmount()
  })

  it('renders nothing for an id generateStaticParams never produced, rather than throwing', async () => {
    const { UnitDrill } = await import('./UnitDrill')
    const { container, unmount } = render(<UnitDrill unitId="does-not-exist" />)
    expect(container.textContent).toBe('')
    unmount()
  })

  // UnitDrill has no unitLabel/course prop - it always reads
  // getCourse(DEFAULT_COURSE_ID) internally, and DEFAULT_COURSE_ID is hardcoded to
  // 'bjt' in lib/courses/index.ts. So the only way to exercise a non-Week course's
  // label here is to mock the courses module itself; there is no prop to swap it
  // through the way UnitCard's unitLabel prop allows. This is the limitation noted
  // in the task brief - threading a real unitLabel prop into UnitDrill would need a
  // component signature change beyond this fix's scope.
  it('uses the course unitLabel - not a hardcoded "week" - for the locked hint and the back link', async () => {
    const fakeCourse = {
      id: 'fake',
      name: 'Fake Course',
      unitLabel: 'Set',
      units: [
        { id: 'u01', index: 1, theme: 'Intro' },
        { id: 'u02', index: 2, theme: 'More' },
      ],
      cards: [
        {
          id: 'fake-vocab-1',
          courseId: 'fake',
          unitId: 'u01',
          deck: 'vocab' as const,
          jp: '一',
          reading: 'いち',
          meaning: 'one',
          theme: 'Intro',
          origin: 'prototype' as const,
        },
      ],
    }

    vi.doMock('@/lib/courses', () => ({
      getCourse: (id: string) => (id === 'fake' ? fakeCourse : undefined),
      DEFAULT_COURSE_ID: 'fake',
    }))

    try {
      const { UnitDrill } = await import('./UnitDrill')
      const { container, unmount } = render(<UnitDrill unitId="u02" />)
      expect(container.textContent).toContain('Back to sets')
      expect(container.textContent).toContain('Locked - finish the previous set first.')
      expect(container.textContent).not.toContain('week')
      unmount()
    } finally {
      vi.doUnmock('@/lib/courses')
      vi.resetModules()
    }
  })
})
