import type { CardProgress, ProgressMap } from './leitner'

export const PROGRESS_KEY = 'trainer.progress.v1'

/**
 * Deliberately not course-prefixed. Card ids already carry their course, so one flat
 * map holds every course; a 'bjt.' key would force a second store when JLPT is added.
 */

const listeners = new Set<() => void>()

function isCardProgress(v: unknown): v is CardProgress {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>
  return (
    typeof p.box === 'number' &&
    Number.isInteger(p.box) &&
    p.box >= 1 &&
    p.box <= 5 &&
    typeof p.seen === 'number' &&
    typeof p.correct === 'number' &&
    typeof p.lastSeen === 'number'
  )
}

export function loadProgress(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const out: ProgressMap = {}
    for (const [id, value] of Object.entries(parsed)) {
      // Drop malformed entries rather than failing the whole load - a single bad
      // record should not wipe months of study.
      if (isCardProgress(value)) out[id] = value
    }
    return out
  } catch {
    return {}
  }
}

export function saveProgress(next: ProgressMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next))
    listeners.forEach((fn) => fn())
  } catch {
    // Quota or private-mode failure. The session continues in memory.
    // Do not notify - the stored value did not actually change.
  }
}

export function subscribeProgress(fn: () => void): () => void {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => {
    if (e.key === PROGRESS_KEY) fn()
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}
