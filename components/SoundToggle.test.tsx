import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { SOUND_KEY } from '@/lib/sound'

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

describe('SoundToggle', () => {
  it('starts unmuted (sound on) and mutes on click', async () => {
    const { SoundToggle } = await import('./SoundToggle')
    const { container, unmount } = render(<SoundToggle />)
    await act(async () => {})

    const btn = container.querySelector('button')!
    expect(btn.getAttribute('aria-label')).toBe('Mute sounds')

    await act(async () => {
      btn.click()
    })

    expect(localStorage.getItem(SOUND_KEY)).toBe('off')
    expect(container.querySelector('button')!.getAttribute('aria-label')).toBe('Unmute sounds')
    unmount()
  })
})
