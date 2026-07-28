export const ACTIVITY_KEY = 'trainer.activity.v1'

export type ActivityLog = Record<string, number>

/**
 * Deliberately not course-prefixed, same reasoning as trainer.progress.v1 - card
 * ids already carry their course, so one flat log holds every course's activity.
 */

const DAY = 86_400_000
const WINDOW_DAYS = 7
const RETAIN_DAYS = 98

const listeners = new Set<() => void>()

export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10)
}

export function loadActivity(): ActivityLog {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const out: ActivityLog = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

export function recordGrade(now: number): void {
  if (typeof window === 'undefined') return
  const log = loadActivity()
  const key = dayKey(now)
  log[key] = (log[key] ?? 0) + 1
  const cutoff = dayKey(now - RETAIN_DAYS * DAY)
  const trimmed: ActivityLog = {}
  for (const [k, v] of Object.entries(log)) {
    if (k >= cutoff) trimmed[k] = v
  }
  try {
    window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(trimmed))
    listeners.forEach((fn) => fn())
  } catch {
    // Quota failure is not worth interrupting a study session for.
    // Do not notify - the stored value did not actually change.
  }
}

/**
 * Mirrors subscribeProgress: the browser `storage` event never fires in the tab
 * that made the write, so a same-tab `recordGrade` (e.g. mid study-session) would
 * not reach same-tab listeners without the explicit notify above. The `storage`
 * listener here covers the cross-tab case instead.
 */
export function subscribeActivity(fn: () => void): () => void {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => {
    if (e.key === ACTIVITY_KEY) fn()
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

/** Cards graded per day over the trailing week, counting days with no study as zero. */
export function dailyRate(log: ActivityLog, now: number): number {
  let total = 0
  for (let i = 0; i < WINDOW_DAYS; i++) {
    total += log[dayKey(now - i * DAY)] ?? 0
  }
  return total / WINDOW_DAYS
}

/**
 * Days to finish at the current rate, or null when no honest estimate exists.
 * Showing "Infinity weeks" to someone returning after a break is hostile - the
 * whole point of this app's schedule model is that it never reports you as
 * behind, so a stalled rate must suppress the projection, not distort it.
 */
export function projectDays(remaining: number, rate: number): number | null {
  if (rate <= 0 || remaining <= 0) return null
  return Math.ceil(remaining / rate)
}

export type HeatCell = { date: string; count: number; level: 0 | 1 | 2 | 3 }

/** Level 1/2/3 lower bounds for the heatmap intensity buckets. */
export const HEAT_LEVELS = [1, 5, 15] as const

function heatLevel(count: number): 0 | 1 | 2 | 3 {
  if (count < HEAT_LEVELS[0]) return 0
  if (count < HEAT_LEVELS[1]) return 1
  if (count < HEAT_LEVELS[2]) return 2
  return 3
}

/**
 * Consecutive days with at least one graded card, ending today or yesterday.
 * Today not-yet-studied does not break a live run - it only breaks after a full
 * missed day, so the streak still reads while today is in progress.
 */
export function studyStreak(log: ActivityLog, now: number): number {
  let streak = 0
  let cursor = (log[dayKey(now)] ?? 0) > 0 ? now : now - DAY
  while ((log[dayKey(cursor)] ?? 0) > 0) {
    streak += 1
    cursor -= DAY
  }
  return streak
}

/**
 * weeks*7 cells ending today, oldest first, so a 7-row grid reads left-to-right
 * by week. The last cell is always today.
 */
export function heatmapCells(log: ActivityLog, now: number, weeks: number): HeatCell[] {
  const days = weeks * 7
  const cells: HeatCell[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = dayKey(now - i * DAY)
    const count = log[date] ?? 0
    cells.push({ date, count, level: heatLevel(count) })
  }
  return cells
}

export function totalStudyDays(log: ActivityLog): number {
  return Object.values(log).filter((n) => n > 0).length
}
