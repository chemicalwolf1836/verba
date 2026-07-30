import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SOUND_KEY, loadMuted, setMuted, subscribeSound } from './sound'

beforeEach(() => {
  localStorage.clear()
})

describe('loadMuted', () => {
  it('defaults to not muted (sound on) when nothing is stored', () => {
    expect(loadMuted()).toBe(false)
  })

  it('returns true only when the stored value is exactly "off"', () => {
    localStorage.setItem(SOUND_KEY, 'off')
    expect(loadMuted()).toBe(true)
  })

  it('degrades to not muted for a missing or unrecognised value', () => {
    localStorage.setItem(SOUND_KEY, 'garbage')
    expect(loadMuted()).toBe(false)
  })
})

describe('setMuted', () => {
  it('persists the state and notifies subscribers', () => {
    let notified = 0
    const unsub = subscribeSound(() => {
      notified++
    })
    setMuted(true)
    expect(localStorage.getItem(SOUND_KEY)).toBe('off')
    expect(loadMuted()).toBe(true)
    setMuted(false)
    expect(localStorage.getItem(SOUND_KEY)).toBe('on')
    expect(notified).toBe(2)
    unsub()
  })

  it('does not throw or notify when the write fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    let notified = 0
    const unsub = subscribeSound(() => {
      notified++
    })
    expect(() => setMuted(true)).not.toThrow()
    expect(notified).toBe(0)
    unsub()
    spy.mockRestore()
  })
})
