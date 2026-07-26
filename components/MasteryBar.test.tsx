import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'
import { PROGRESS_KEY } from '@/lib/progress'
import { ACTIVITY_KEY, dailyRate, projectDays } from '@/lib/activity'
import { boxDistribution, notLearnedCount } from '@/lib/goals'
import type { CardProgress, ProgressMap } from '@/lib/leitner'

/**
 * Minimal render harness (no @testing-library/react available offline), matching
 * the pattern used by UnitUnlockRing.test.tsx / useProgress.test.tsx.
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

const course = getCourse(DEFAULT_COURSE_ID)!
const total = course.cards.length

const box = (n: CardProgress['box']): CardProgress => ({
  box: n,
  seen: 1,
  correct: 1,
  lastSeen: 1,
})

beforeEach(() => {
  localStorage.clear()
  // useProgress/useActivity keep module-scoped snapshot caches - correct for a
  // real page load, but it leaks across test cases sharing one module registry.
  // Reset the registry so each test gets a fresh cache, same as a fresh load.
  vi.resetModules()
})

describe('MasteryBar', () => {
  it('renders sensibly on first run: 0 mastered and no pace line (rate is zero on day one)', async () => {
    const { MasteryBar } = await import('./MasteryBar')
    const { container, unmount } = render(<MasteryBar />)

    expect(container.textContent).toContain(`0 of ${total} words mastered - 0%`)
    // No activity logged yet, so dailyRate is zero and projectDays must return
    // null - the component must render no projection line at all, never
    // "Infinity weeks" or "0 weeks".
    expect(container.textContent).not.toContain('weeks')

    // Flush the post-mount effect that reads activity/clock and confirm the
    // suppression still holds once that effect has run.
    await act(async () => {})
    expect(container.textContent).not.toContain('weeks')

    unmount()
  })

  it('sums the mastery bar segments to the full course card count, not a subset', async () => {
    const progress: ProgressMap = {}
    for (let i = 0; i < 40 && i < course.cards.length; i++) {
      progress[course.cards[i].id] = box(((i % 5) + 1) as CardProgress['box'])
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))

    const dist = boxDistribution(course.cards, progress)
    expect(dist.reduce((a, b) => a + b, 0)).toBe(total)

    const { MasteryBar } = await import('./MasteryBar')
    const { container, unmount } = render(<MasteryBar />)

    const segments = container.querySelectorAll('div.flex.h-3 > span')
    expect(segments.length).toBe(5)
    const widths = Array.from(segments).map((el) => parseFloat((el as HTMLElement).style.width))
    // Each segment's width is (dist[box] / total) * 100, unrounded, so a correct
    // bar sums to exactly 100 - a bar that silently drops cards would not.
    const sum = widths.reduce((a, b) => a + b, 0)
    expect(sum).toBeGreaterThan(99.999)
    expect(sum).toBeLessThan(100.001)

    unmount()
  })

  it('shows the pace projection, never Infinity or NaN, once the trailing week has a nonzero rate', async () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify({ [today]: 10 }))

    const { MasteryBar } = await import('./MasteryBar')
    const { container, unmount } = render(<MasteryBar />)

    // Flush the post-mount effect that computes the projection.
    await act(async () => {})

    const remaining = notLearnedCount(course.cards, {})
    const rate = dailyRate({ [today]: 10 }, Date.now())
    const days = projectDays(remaining, rate)
    expect(days).not.toBeNull()
    const weeks = Math.ceil(days! / 7)

    expect(container.textContent).toContain(`About ${weeks} weeks at your recent pace`)
    expect(container.textContent).not.toContain('Infinity')
    expect(container.textContent).not.toContain('NaN')

    unmount()
  })

  it('counts mastered (box 5) for the headline, not learned (box 2+)', async () => {
    const progress: ProgressMap = {
      [course.cards[0].id]: box(5),
      [course.cards[1].id]: box(2),
      [course.cards[2].id]: box(3),
      [course.cards[3].id]: box(4),
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))

    const { MasteryBar } = await import('./MasteryBar')
    const { container, unmount } = render(<MasteryBar />)

    // Only the single box-5 card counts as mastered, even though four cards are
    // learned (box >= 2).
    expect(container.textContent).toContain(`1 of ${total} words mastered`)
    expect(container.textContent).not.toContain(`4 of ${total} words mastered`)

    unmount()
  })
})
