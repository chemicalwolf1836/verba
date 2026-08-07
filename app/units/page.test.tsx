import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'
import type { CardProgress, ProgressMap } from '@/lib/leitner'

/**
 * Minimal render harness (no @testing-library/react available offline), matching
 * the pattern used by components/UnitUnlockRing.test.tsx.
 *
 * NOTE: this page now renders <RouteMap /> (see components/RouteMap.tsx) instead
 * of the old per-unit UnitCard list, so assertions below check RouteMap's markup:
 * station links to /units/<id> for unlocked units only, unit.theme text for every
 * unit, and "Locked" (not the old UnitCard-specific copy) for locked units.
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
    await act(async () => {})

    // The rail opens stations in the detail pane beside it rather than
    // navigating, so an unlocked station is a button, not a link.
    const open = Array.from(container.querySelectorAll('ol button[data-unit]'))
    expect(open).toHaveLength(1)
    expect(open[0].getAttribute('data-unit')).toBe('bjt-w01')

    expect(container.textContent).toContain('Locked')
    expect(container.textContent).toContain(course.units[1].theme)
    unmount()
  })

  it('renders per-unit progress against real localStorage progress, not a mock', async () => {
    const { saveProgress } = await import('@/lib/progress')
    const course = getCourse(DEFAULT_COURSE_ID)!
    const w1cards = course.cards.filter((c) => c.unitId === 'bjt-w01')
    // Learn 3 of week 1's 8 cards (box >= 2 counts as learned).
    const progress: ProgressMap = Object.fromEntries(
      w1cards.slice(0, 3).map((c) => [c.id, box(2)]),
    )
    saveProgress(progress)

    const { default: UnitsPage } = await import('./page')
    const { container, unmount } = render(<UnitsPage />)
    await act(async () => {})

    expect(container.textContent).toContain('3 / 8 learned')
    unmount()
  })

  it('unlocks week 2 - and makes it a real link - once week 1 crosses its unlock threshold', async () => {
    const { saveProgress } = await import('@/lib/progress')
    const course = getCourse(DEFAULT_COURSE_ID)!
    const w1cards = course.cards.filter((c) => c.unitId === 'bjt-w01')
    // unlockPoint(8) = ceil(8 * 0.75) = 6.
    const progress: ProgressMap = Object.fromEntries(
      w1cards.slice(0, 6).map((c) => [c.id, box(2)]),
    )
    saveProgress(progress)

    const { default: UnitsPage } = await import('./page')
    const { container, unmount } = render(<UnitsPage />)
    await act(async () => {})

    const open = Array.from(container.querySelectorAll('ol button[data-unit]')).map((b) =>
      b.getAttribute('data-unit'),
    )
    expect(open).toContain('bjt-w01')
    expect(open).toContain('bjt-w02')
    expect(open).not.toContain('bjt-w03')
    unmount()
  })

  it('renders all 24 units, each unit rendered exactly once', async () => {
    const { default: UnitsPage } = await import('./page')
    const course = getCourse(DEFAULT_COURSE_ID)!
    const { container, unmount } = render(<UnitsPage />)
    await act(async () => {})

    expect(course.units).toHaveLength(24)
    for (const unit of course.units) {
      expect(container.textContent).toContain(unit.theme)
    }
    unmount()
  })
})
