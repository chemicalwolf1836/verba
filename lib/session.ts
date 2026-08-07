/**
 * What the learner chose for *this* sitting: how long they have, what should be
 * in the queue, and whether they want to type as well as speak.
 *
 * Pace lives here rather than in the scheduler. `lib/leitner.ts` decides which
 * card is most worth showing; this decides how many of them the learner is in
 * the mood for today. Keeping the two apart is what lets "I've only got three
 * minutes" change the session without touching spaced repetition.
 */

import type { Card } from '@/lib/courses'
import { isLearned, type ProgressMap } from '@/lib/leitner'

export type SessionLength = 'short' | 'mid' | 'long'
export type AnswerMode = 'voice' | 'typing'

export type SessionConfig = {
  length: SessionLength
  /** Include cards never answered correctly - the front of the course. */
  includeNew: boolean
  /** Include cards already learned and due for another pass. */
  includeReviews: boolean
  answerMode: AnswerMode
}

/** Cards and rough minutes per length. Tuning values with no empirical basis
 *  yet - the same caveat as leitner's TUNING. */
export const LENGTHS: Record<SessionLength, { cards: number; minutes: number }> = {
  short: { cards: 4, minutes: 3 },
  mid: { cards: 6, minutes: 7 },
  long: { cards: 8, minutes: 15 },
}

export const DEFAULT_SESSION: SessionConfig = {
  length: 'mid',
  includeNew: true,
  includeReviews: true,
  answerMode: 'typing',
}

export const cardsFor = (length: SessionLength): number => LENGTHS[length].cards
export const minutesFor = (length: SessionLength): number => LENGTHS[length].minutes

/**
 * A card is "new" to a session while it has never been answered correctly, which
 * is the same box >= 2 line the rest of the app calls *learned*. Deliberately not
 * `seen === 0`: a word missed three times running is still new to the learner,
 * and hiding it behind the reviews toggle would strand it.
 */
export const isNewToSession = (card: Card, progress: ProgressMap): boolean =>
  !isLearned(progress[card.id])

export function countNew(pool: Card[], progress: ProgressMap): number {
  return pool.filter((c) => isNewToSession(c, progress)).length
}

export function countReviews(pool: Card[], progress: ProgressMap): number {
  return pool.length - countNew(pool, progress)
}

/**
 * Narrow a pool to what the config asks for. Order is preserved - the caller's
 * pool is already in scheduler order, and re-sorting here would quietly override
 * `nextCard`'s judgement about what to serve first.
 *
 * Turning *both* toggles off would leave nothing to study, so an empty result
 * falls back to the untouched pool rather than dead-ending the session on a
 * setting the learner can't see the consequence of.
 */
export function filterPool(
  pool: Card[],
  progress: ProgressMap,
  config: Pick<SessionConfig, 'includeNew' | 'includeReviews'>,
): Card[] {
  const kept = pool.filter((card) => {
    const fresh = isNewToSession(card, progress)
    return fresh ? config.includeNew : config.includeReviews
  })
  return kept.length > 0 ? kept : pool
}

/**
 * The pool a configured session draws from: filtered by the toggles, then capped
 * at the chosen length.
 *
 * The cap is a *pool* bound, not a queue of exactly N cards. `nextCard` revisits
 * cards within a session, so a 4-card short session still means "these four
 * words, however many passes that takes" - which is what makes a three-minute
 * sitting feel like focused repetition rather than a sprint through four items.
 */
export function sessionPool(
  pool: Card[],
  progress: ProgressMap,
  config: SessionConfig,
): Card[] {
  return filterPool(pool, progress, config).slice(0, cardsFor(config.length))
}

/* ---- persistence ---- */

/** Not course-prefixed: "how long have I got" is about the learner, not the course. */
export const SESSION_KEY = 'trainer.session.v1'

const listeners = new Set<() => void>()

const isLength = (v: unknown): v is SessionLength =>
  v === 'short' || v === 'mid' || v === 'long'

const isAnswerMode = (v: unknown): v is AnswerMode => v === 'voice' || v === 'typing'

/** Defensive: a hand-edited or half-written value falls back per field rather
 *  than throwing away the whole config. */
export function parseSession(raw: string | null): SessionConfig {
  if (!raw) return DEFAULT_SESSION
  try {
    const data = JSON.parse(raw) as Partial<Record<keyof SessionConfig, unknown>>
    if (typeof data !== 'object' || data === null) return DEFAULT_SESSION
    return {
      length: isLength(data.length) ? data.length : DEFAULT_SESSION.length,
      includeNew:
        typeof data.includeNew === 'boolean' ? data.includeNew : DEFAULT_SESSION.includeNew,
      includeReviews:
        typeof data.includeReviews === 'boolean'
          ? data.includeReviews
          : DEFAULT_SESSION.includeReviews,
      answerMode: isAnswerMode(data.answerMode)
        ? data.answerMode
        : DEFAULT_SESSION.answerMode,
    }
  } catch {
    return DEFAULT_SESSION
  }
}

export function loadSession(): SessionConfig {
  if (typeof window === 'undefined') return DEFAULT_SESSION
  try {
    return parseSession(window.localStorage.getItem(SESSION_KEY))
  } catch {
    return DEFAULT_SESSION
  }
}

export function saveSession(config: SessionConfig): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(config))
    // Notify only after a successful write, matching the other stores.
    listeners.forEach((fn) => fn())
  } catch {
    // Quota or private-mode failure - the session continues; do not notify.
  }
}

export function subscribeSession(fn: () => void): () => void {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) fn()
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}
