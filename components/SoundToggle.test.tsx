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

const segments = (c: HTMLElement) => ({
  on: c.querySelector<HTMLButtonElement>('button[aria-label="Sound effects on"]')!,
  off: c.querySelector<HTMLButtonElement>('button[aria-label="Sound effects off"]')!,
})

const pressed = (c: HTMLElement) => {
  const { on, off } = segments(c)
  return { on: on.getAttribute('aria-pressed'), off: off.getAttribute('aria-pressed') }
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('SoundToggle', () => {
  it('shows both states at once, so the current one needs no decoding', async () => {
    const { SoundToggle } = await import('./SoundToggle')
    const { container, unmount } = render(<SoundToggle />)
    await act(async () => {})
    const { on, off } = segments(container)
    expect(on).not.toBeNull()
    expect(off).not.toBeNull()
    unmount()
  })

  it('starts with sound on and marks that segment as the active one', async () => {
    const { SoundToggle } = await import('./SoundToggle')
    const { container, unmount } = render(<SoundToggle />)
    await act(async () => {})
    expect(pressed(container)).toEqual({ on: 'true', off: 'false' })
    unmount()
  })

  it('mutes when the off segment is chosen', async () => {
    const { SoundToggle } = await import('./SoundToggle')
    const { container, unmount } = render(<SoundToggle />)
    await act(async () => {})
    await act(async () => segments(container).off.click())
    expect(localStorage.getItem(SOUND_KEY)).toBe('off')
    expect(pressed(container)).toEqual({ on: 'false', off: 'true' })
    unmount()
  })

  it('unmutes when the on segment is chosen', async () => {
    const { setMuted } = await import('@/lib/sound')
    setMuted(true)
    const { SoundToggle } = await import('./SoundToggle')
    const { container, unmount } = render(<SoundToggle />)
    await act(async () => {})
    await act(async () => segments(container).on.click())
    expect(localStorage.getItem(SOUND_KEY)).toBe('on')
    expect(pressed(container)).toEqual({ on: 'true', off: 'false' })
    unmount()
  })

  it('choosing the already-active segment is a no-op, not a toggle', async () => {
    // A segmented control sets a value; it does not flip one. Pressing "on"
    // twice must not mute, which is the bug a naive !muted handler would have.
    const { SoundToggle } = await import('./SoundToggle')
    const { container, unmount } = render(<SoundToggle />)
    await act(async () => {})
    await act(async () => segments(container).on.click())
    await act(async () => segments(container).on.click())
    expect(pressed(container)).toEqual({ on: 'true', off: 'false' })
    unmount()
  })

  it('names its scope, since it never silences the Japanese audio', async () => {
    const { SoundToggle } = await import('./SoundToggle')
    const { container, unmount } = render(<SoundToggle />)
    await act(async () => {})
    const group = container.querySelector('[role="group"]')!
    expect(group.getAttribute('aria-label')).toBe('Sound effects')
    unmount()
  })
})
