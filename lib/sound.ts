/** App-wide sound on/off preference. Not course-prefixed - it is one setting. */
export const SOUND_KEY = 'trainer.sound.v1'

const listeners = new Set<() => void>()

/** true = muted. Default false (sound on). Stored as 'on' | 'off'. */
export function loadMuted(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SOUND_KEY) === 'off'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SOUND_KEY, muted ? 'off' : 'on')
    // Notify only after a successful write, matching the other stores.
    listeners.forEach((fn) => fn())
  } catch {
    // Quota or private-mode failure - the session continues; do not notify.
  }
}

export function subscribeSound(fn: () => void): () => void {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => {
    if (e.key === SOUND_KEY) fn()
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}
