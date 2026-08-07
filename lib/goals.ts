import type { Card, Course, Unit } from '@/lib/courses'
import {
  isLearned,
  isMastered,
  unlockPoint,
  unlockedCards,
  type CardProgress,
  type ProgressMap,
} from './leitner'

export type UnitGoal = {
  unit: Unit
  learned: number
  total: number
  /** Cards needed before the next unit opens. */
  unlockAt: number
  /** Cards still needed, counted against unlockAt - never against total. */
  toUnlock: number
  nextUnit: Unit | null
}

/**
 * The goal the ring tracks: the lowest-index unlocked unit that has not yet met its
 * threshold. Deliberately not "the unit of the card on screen" - in a mixed session
 * most cards are reviews from earlier units, and a ring that followed them would jump
 * around and read as noise.
 */
export function currentUnitGoal(course: Course, progress: ProgressMap): UnitGoal | null {
  const ordered = [...course.units].sort((a, b) => a.index - b.index)
  for (let i = 0; i < ordered.length; i++) {
    const unit = ordered[i]
    const cards = course.cards.filter((c) => c.unitId === unit.id)
    const learned = cards.filter((c) => isLearned(progress[c.id])).length
    const unlockAt = unlockPoint(cards.length)
    if (learned < unlockAt) {
      return {
        unit,
        learned,
        total: cards.length,
        unlockAt,
        toUnlock: unlockAt - learned,
        nextUnit: ordered[i + 1] ?? null,
      }
    }
  }
  return null
}

export type BoxDistribution = [number, number, number, number, number]

export function boxDistribution(cards: Card[], progress: ProgressMap): BoxDistribution {
  const out: BoxDistribution = [0, 0, 0, 0, 0]
  for (const c of cards) {
    const box = progress[c.id]?.box ?? 1
    out[box - 1] += 1
  }
  return out
}

export function masteredCount(cards: Card[], progress: ProgressMap): number {
  return cards.filter((c) => isMastered(progress[c.id])).length
}

export function notLearnedCount(cards: Card[], progress: ProgressMap): number {
  return cards.filter((c) => !isLearned(progress[c.id])).length
}

/** How many weak cards the dashboard lists and the focused drill runs on. */
export const WEAK_COUNT = 8

/**
 * A card is weak until it is solid - answered correctly three times running (box 4).
 * Deliberately a third threshold alongside learned (box >= 2) and mastered (box 5):
 * "words to shore up" must mean cards that still need work, not just the bottom of
 * the pile, or the list would keep offering box-5 cards once everything is going well.
 */
export function isWeak(p?: CardProgress): boolean {
  return (p?.box ?? 1) < 4
}

/** The n weakest cards - box ascending, then lastSeen ascending (stalest first) -
 *  drawn only from cards that are still weak. An unseen card counts as box 1,
 *  lastSeen 0. Returns fewer than n, or none at all, when little is weak. */
export function weakestCards(cards: Card[], progress: ProgressMap, n: number): Card[] {
  return cards
    .filter((c) => isWeak(progress[c.id]))
    .sort((a, b) => {
      const pa = progress[a.id]
      const pb = progress[b.id]
      const boxDiff = (pa?.box ?? 1) - (pb?.box ?? 1)
      if (boxDiff !== 0) return boxDiff
      return (pa?.lastSeen ?? 0) - (pb?.lastSeen ?? 0)
    })
    .slice(0, n)
}

/** The pool a study session draws from. `mode === 'weak'` focuses it on the
 *  weakest cards; any other value is the full unlocked pool (today's behaviour). */
export function drillPool(course: Course, progress: ProgressMap, mode: string | null): Card[] {
  const pool = unlockedCards(course, progress)
  return mode === 'weak' ? weakestCards(pool, progress, WEAK_COUNT) : pool
}

/**
 * One station's cards, for drilling a single unit from the line browser.
 *
 * Filtered out of `unlockedCards` rather than off `course.cards` directly, so a
 * hand-typed `?unit=` for a station further up the line yields nothing instead of
 * handing over words the learner has not reached. The unlock gate is the same one
 * the browser and the scheduler use - it is not re-derived here.
 */
export function unitPool(course: Course, progress: ProgressMap, unitId: string): Card[] {
  return unlockedCards(course, progress).filter((c) => c.unitId === unitId)
}
