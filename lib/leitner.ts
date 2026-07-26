import type { Card, Course, Unit } from '@/lib/courses/types'

export type Box = 1 | 2 | 3 | 4 | 5

export type CardProgress = {
  box: Box
  seen: number
  correct: number
  /** Epoch ms. Injected by the caller - this module never reads the clock. */
  lastSeen: number
}

export type ProgressMap = Record<string, CardProgress>

/**
 * Chosen defaults with no empirical basis. Revisit after roughly a week of real
 * study - see section 15 of the design spec.
 */
export const TUNING = {
  /** Every Nth queue position prefers an unseen card. */
  NEW_CARD_INTERVAL: 5,
  /** Do not repeat a card within this many positions. */
  MIN_GAP: 8,
  /** Fraction of a unit that must be learned before the next unlocks. */
  UNLOCK_THRESHOLD: 0.75,
} as const

const boxOf = (p?: CardProgress): Box => p?.box ?? 1

export const isLearned = (p?: CardProgress): boolean => boxOf(p) >= 2
export const isMastered = (p?: CardProgress): boolean => boxOf(p) === 5

export function grade(
  prev: CardProgress | undefined,
  correct: boolean,
  now: number,
): CardProgress {
  const current = boxOf(prev)
  // A miss goes straight back to box 1, not one box down. Partial credit for a
  // word you just failed is how cards drift upward without being known.
  const box = (correct ? Math.min(current + 1, 5) : 1) as Box
  return {
    box,
    seen: (prev?.seen ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    lastSeen: now,
  }
}

/** Cards needed in a unit before the next one opens. Rounds up. */
export function unlockPoint(unitCardCount: number): number {
  return Math.ceil(unitCardCount * TUNING.UNLOCK_THRESHOLD)
}

function learnedInUnit(course: Course, unit: Unit, progress: ProgressMap): number {
  return course.cards.filter((c) => c.unitId === unit.id && isLearned(progress[c.id])).length
}

/**
 * Units unlock by demonstrated mastery, never by calendar date. This is what makes
 * pace emergent: study heavily and units open in days, lightly and they open in weeks.
 */
export function unlockedUnits(course: Course, progress: ProgressMap): Unit[] {
  const ordered = [...course.units].sort((a, b) => a.index - b.index)
  const out: Unit[] = []
  for (const unit of ordered) {
    out.push(unit)
    const total = course.cards.filter((c) => c.unitId === unit.id).length
    if (learnedInUnit(course, unit, progress) < unlockPoint(total)) break
  }
  return out
}

export function unlockedCards(course: Course, progress: ProgressMap): Card[] {
  // Build the pool in ascending unit-index order ourselves - don't rely on
  // course.cards happening to be unit-sorted. This is what lets nextCard's
  // unseen[0] satisfy "a new card comes from the lowest-index unlocked unit"
  // regardless of how a given course's data file orders its rows.
  const byUnit = unlockedUnits(course, progress).flatMap((unit) =>
    course.cards.filter((c) => c.unitId === unit.id),
  )
  // Cards with no unit - phrases - have no unit index to sort by. They're
  // available from the start, so append them after the unit-ordered cards.
  const phrases = course.cards.filter((c) => c.unitId === '')
  return [...byUnit, ...phrases]
}

/**
 * Lazy queue. Deterministic given its arguments, so tests never stub Math.random.
 * `history` is the ids already shown this session, oldest first.
 */
export function nextCard(
  pool: Card[],
  progress: ProgressMap,
  history: string[],
): Card | null {
  if (pool.length === 0) return null

  const recent = new Set(history.slice(-TUNING.MIN_GAP))
  const unseen = pool.filter((c) => (progress[c.id]?.seen ?? 0) === 0)
  const seen = pool.filter((c) => (progress[c.id]?.seen ?? 0) > 0)

  const wantsNew = history.length % TUNING.NEW_CARD_INTERVAL === 0
  if (wantsNew && unseen.length > 0) return unseen[0]

  const byWeakest = [...seen].sort((a, b) => {
    const pa = progress[a.id]
    const pb = progress[b.id]
    const boxDiff = boxOf(pa) - boxOf(pb)
    if (boxDiff !== 0) return boxDiff
    return (pa?.lastSeen ?? 0) - (pb?.lastSeen ?? 0)
  })

  const fresh = byWeakest.find((c) => !recent.has(c.id))
  if (fresh) return fresh
  if (unseen.length > 0) return unseen[0]
  // Everything is recent - MIN_GAP yields rather than stalling the session.
  return byWeakest[0] ?? null
}
