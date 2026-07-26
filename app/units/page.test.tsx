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

describe('UnitsPage', () => {
  it('with real (empty) progress, only week 1 is drillable - every other week is locked and not a link', async () => {
    const { default: UnitsPage } = await import('./page')
    const course = getCourse(DEFAULT_COURSE_ID)!
    const { container, unmount } = render(<UnitsPage />)

    const links = Array.from(container.querySelectorAll('a[href^="/units/"]'))
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('/units/w01')

    expect(container.textContent).toContain('Locked - finish the previous week first')
    expect(container.textContent).toContain(`${course.unitLabel} 2`)
    unmount()
  })

  it('renders per-unit progress against real localStorage progress, not a mock', async () => {
    const { saveProgress } = await import('@/lib/progress')
    const course = getCourse(DEFAULT_COURSE_ID)!
    const w1cards = course.cards.filter((c) => c.unitId === 'w01')
    // Learn 3 of week 1's 8 cards (box >= 2 counts as learned).
    const progress: ProgressMap = Object.fromEntries(
      w1cards.slice(0, 3).map((c) => [c.id, box(2)]),
    )
    saveProgress(progress)

    const { default: UnitsPage } = await import('./page')
    const { container, unmount } = render(<UnitsPage />)

    expect(container.textContent).toContain('3 of 8 learned')
    unmount()
  })

  it('unlocks week 2 - and makes it a real link - once week 1 crosses its unlock threshold', async () => {
    const { saveProgress } = await import('@/lib/progress')
    const course = getCourse(DEFAULT_COURSE_ID)!
    const w1cards = course.cards.filter((c) => c.unitId === 'w01')
    // unlockPoint(8) = ceil(8 * 0.75) = 6.
    const progress: ProgressMap = Object.fromEntries(
      w1cards.slice(0, 6).map((c) => [c.id, box(2)]),
    )
    saveProgress(progress)

    const { default: UnitsPage } = await import('./page')
    const { container, unmount } = render(<UnitsPage />)

    const hrefs = Array.from(container.querySelectorAll('a[href^="/units/"]')).map((a) =>
      a.getAttribute('href'),
    )
    expect(hrefs).toContain('/units/w01')
    expect(hrefs).toContain('/units/w02')
    expect(hrefs).not.toContain('/units/w03')
    unmount()
  })

  it('renders all 24 units, each unit rendered exactly once', async () => {
    const { default: UnitsPage } = await import('./page')
    const course = getCourse(DEFAULT_COURSE_ID)!
    const { container, unmount } = render(<UnitsPage />)

    expect(course.units).toHaveLength(24)
    for (const unit of course.units) {
      expect(container.textContent).toContain(`${course.unitLabel} ${unit.index} - ${unit.theme}`)
    }
    unmount()
  })
})
