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
