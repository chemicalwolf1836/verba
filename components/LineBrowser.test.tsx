import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'
import type { CardProgress, ProgressMap } from '@/lib/leitner'

/**
 * Minimal render harness (no @testing-library/react available offline), matching
 * the pattern used by the other component tests here.
 */
function render(node: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(node)
  })
  return { container, unmount: () => act(() => root.unmount()) }
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

describe('LineBrowser rail', () => {
  it('renders every station, locked ones included', async () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    const { LineBrowser } = await import('./LineBrowser')
    const { container, unmount } = render(<LineBrowser />)
    await act(async () => {})
    expect(container.textContent).toContain(course.units[0].theme)
    expect(container.textContent).toContain(course.units[23].theme)
    unmount()
  })

  it('makes only unlocked stations selectable', async () => {
    const { LineBrowser } = await import('./LineBrowser')
    const { container, unmount } = render(<LineBrowser />)
    await act(async () => {})
    // Empty progress unlocks week 1 only, so exactly one station is a button.
    const selectable = container.querySelectorAll('ol button')
    expect(selectable).toHaveLength(1)
    unmount()
  })
})

describe('LineBrowser detail', () => {
  it('shows week 1 - always unlocked - even with no progress saved', async () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    const w1 = course.cards.filter((c) => c.unitId === 'bjt-w01')
    const { LineBrowser } = await import('./LineBrowser')
    const { container, unmount } = render(<LineBrowser initialUnitId="bjt-w01" />)
    await act(async () => {})
    expect(container.textContent).not.toContain('Locked - finish')
    for (const c of w1) expect(container.textContent).toContain(c.jp)
    unmount()
  })

  it("refuses to open week 2 while week 1 has not crossed unlockedUnits' threshold - a direct URL visit must not leak the cards", async () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    const w2 = course.cards.filter((c) => c.unitId === 'bjt-w02')
    const { LineBrowser } = await import('./LineBrowser')
    const { container, unmount } = render(<LineBrowser initialUnitId="bjt-w02" />)
    await act(async () => {})
    expect(container.textContent).toContain('Locked - finish the previous week first.')
    for (const c of w2) expect(container.textContent).not.toContain(c.jp)
    unmount()
  })

  it('offers no drill link for a locked station', async () => {
    const { LineBrowser } = await import('./LineBrowser')
    const { container, unmount } = render(<LineBrowser initialUnitId="bjt-w02" />)
    await act(async () => {})
    expect(container.querySelector('a[href^="/study?unit="]')).toBeNull()
    unmount()
  })

  it("shows week 2 once week 1 crosses unlockedUnits' threshold - the same gate the rail uses, not a locally recomputed one", async () => {
    const { saveProgress } = await import('@/lib/progress')
    const course = getCourse(DEFAULT_COURSE_ID)!
    const w1cards = course.cards.filter((c) => c.unitId === 'bjt-w01')
    // unlockPoint(8) = ceil(8 * 0.75) = 6.
    const progress: ProgressMap = Object.fromEntries(
      w1cards.slice(0, 6).map((c) => [c.id, box(2)]),
    )
    saveProgress(progress)

    const { LineBrowser } = await import('./LineBrowser')
    const w2 = course.cards.filter((c) => c.unitId === 'bjt-w02')
    const { container, unmount } = render(<LineBrowser initialUnitId="bjt-w02" />)
    await act(async () => {})
    expect(container.textContent).not.toContain('Locked - finish')
    for (const c of w2) expect(container.textContent).toContain(c.jp)
    expect(container.querySelector('a[href="/study?unit=bjt-w02"]')).not.toBeNull()
    unmount()
  })

  it('renders nothing for an id generateStaticParams never produced, rather than throwing', async () => {
    const { LineBrowser } = await import('./LineBrowser')
    const { container, unmount } = render(<LineBrowser initialUnitId="does-not-exist" />)
    await act(async () => {})
    expect(container.textContent).toBe('')
    unmount()
  })

  // The browser resolves its course from the unit id via findUnit, so a non-Week
  // course can be exercised by mocking findUnit to return a fake course.
  it('uses the course unitLabel - not a hardcoded "week" - for the locked hint and the back link', async () => {
    const fakeCourse = {
      id: 'fake',
      name: 'Fake Course',
      code: 'FAKE',
      target: 'X',
      unitLabel: 'Set',
      units: [
        { id: 'fake-u01', index: 1, theme: 'Intro' },
        { id: 'fake-u02', index: 2, theme: 'More' },
      ],
      cards: [
        {
          id: 'fake-vocab-1',
          courseId: 'fake',
          unitId: 'fake-u01',
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
      findUnit: (unitId: string) => {
        const unit = fakeCourse.units.find((u) => u.id === unitId)
        return unit ? { course: fakeCourse, unit } : undefined
      },
      getCourse: () => fakeCourse,
      DEFAULT_COURSE_ID: 'fake',
      COURSES: [fakeCourse],
    }))

    try {
      const { LineBrowser } = await import('./LineBrowser')
      const { container, unmount } = render(<LineBrowser initialUnitId="fake-u02" />)
      await act(async () => {})
      expect(container.textContent).toContain('All sets')
      expect(container.textContent).toContain('Locked - finish the previous set first.')
      expect(container.textContent).not.toContain('week')
      unmount()
    } finally {
      vi.doUnmock('@/lib/courses')
      vi.resetModules()
    }
  })
})
