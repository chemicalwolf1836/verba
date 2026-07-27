import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { COURSES } from '@/lib/courses'

function render(node: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(node)
  })
  return { container, unmount: () => act(() => root.unmount()) }
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('CoursePicker', () => {
  it('renders nothing while only one course is registered', async () => {
    // Guards the "invisible until a second course exists" contract - the moment a
    // second language or test is added, this test should be updated to expect the
    // select to appear.
    expect(COURSES.length).toBe(1)

    const { CoursePicker } = await import('./CoursePicker')
    const { container, unmount } = render(<CoursePicker />)
    expect(container.textContent).toBe('')
    expect(container.querySelector('select')).toBeNull()
    unmount()
  })
})
