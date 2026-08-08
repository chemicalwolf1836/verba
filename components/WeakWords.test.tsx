import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'

function render(node: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(node))
  return { container, unmount: () => act(() => root.unmount()) }
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('WeakWords', () => {
  it('links its drill button to the weak study mode', async () => {
    const { WeakWords } = await import('./WeakWords')
    const { container, unmount } = render(<WeakWords />)
    await act(async () => {})
    const link = container.querySelector('a[href="/study?mode=weak"]')
    expect(link).not.toBeNull()
    unmount()
  })

  it('lists weak cards from the active course (week 1 is always unlocked)', async () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    const first = course.cards.find((c) => c.unitId === 'bjt-w01')!
    const { WeakWords } = await import('./WeakWords')
    const { container, unmount } = render(<WeakWords />)
    await act(async () => {})
    expect(container.textContent).toContain(first.jp)
    unmount()
  })
})

describe('BoxBars', () => {
  it('fills exactly as many segments as the box number', async () => {
    const { BoxBars } = await import('./WeakWords')
    const { container, unmount } = render(<BoxBars box={3} />)
    const segs = container.querySelectorAll('span > span')
    expect(segs).toHaveLength(5)
    const filled = [...segs].filter((s) => !s.className.includes('color-line'))
    expect(filled).toHaveLength(3)
    unmount()
  })

  it('colours a not-yet-learned card amber and a learned one teal', async () => {
    const { BoxBars } = await import('./WeakWords')
    // box 1 is below the learned line (box >= 2), so it reads as amber.
    const one = render(<BoxBars box={1} />)
    expect(one.container.innerHTML).toContain('color-here')
    expect(one.container.innerHTML).not.toContain('color-accent')
    one.unmount()

    const two = render(<BoxBars box={2} />)
    expect(two.container.innerHTML).toContain('color-accent')
    expect(two.container.innerHTML).not.toContain('color-here')
    two.unmount()
  })

  it('labels itself for screen readers', async () => {
    const { BoxBars } = await import('./WeakWords')
    const { container, unmount } = render(<BoxBars box={4} />)
    expect(container.querySelector('[aria-label="Box 4 of 5"]')).not.toBeNull()
    unmount()
  })
})
