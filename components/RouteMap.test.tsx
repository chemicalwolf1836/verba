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

describe('RouteMap', () => {
  it('renders every unit as a station, linking only unlocked ones', async () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    const { RouteMap } = await import('./RouteMap')
    const { container, unmount } = render(<RouteMap />)
    await act(async () => {})
    // With empty progress only week 1 is unlocked -> exactly one drill link.
    const links = container.querySelectorAll('a[href^="/units/"]')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe(`/units/${course.units[0].id}`)
    // All 24 unit themes still render (locked ones are shown, just not links).
    expect(container.textContent).toContain(course.units[0].theme)
    expect(container.textContent).toContain(course.units[23].theme)
    unmount()
  })
})
