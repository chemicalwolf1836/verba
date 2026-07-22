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
