import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

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

describe('StreakHeatmap', () => {
  it('renders 91 day cells', async () => {
    const { StreakHeatmap } = await import('./StreakHeatmap')
    const { container, unmount } = render(<StreakHeatmap />)
    await act(async () => {})
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(91)
    unmount()
  })

  it('shows a streak from real activity written today and yesterday', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    localStorage.setItem('trainer.activity.v1', JSON.stringify({ [today]: 3, [yesterday]: 2 }))

    const { StreakHeatmap } = await import('./StreakHeatmap')
    const { container, unmount } = render(<StreakHeatmap />)
    await act(async () => {})
    expect(container.textContent).toContain('2-day streak')
    unmount()
  })
})
