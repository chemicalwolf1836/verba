import type { Card, Course, Unit } from '@/lib/courses'
import { isLearned, isMastered, unlockPoint, type ProgressMap } from './leitner'

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
