import { describe, it, expect, beforeEach } from 'vitest'
import type { Card } from '@/lib/courses'
import type { ProgressMap } from './leitner'
import {
  DEFAULT_SESSION,
  SESSION_KEY,
  cardsFor,
  countNew,
  countReviews,
  filterPool,
  isNewToSession,
  loadSession,
  minutesFor,
  parseSession,
  saveSession,
  sessionPool,
  subscribeSession,
  type SessionConfig,
} from './session'

const card = (id: string): Card => ({
  id,
  courseId: 'bjt',
  unitId: 'bjt-w01',
  deck: 'vocab',
  jp: id,
  reading: id,
  meaning: id,
  theme: 'Test',
  origin: 'drafted',
})

const pool = [card('a'), card('b'), card('c'), card('d'), card('e')]

/** a and b are learned (box >= 2); c, d and e are not. */
const progress: ProgressMap = {
  a: { box: 3, seen: 4, correct: 3, lastSeen: 1 },
  b: { box: 5, seen: 9, correct: 9, lastSeen: 2 },
  // Missed repeatedly but never learned - still counts as new.
  c: { box: 1, seen: 3, correct: 0, lastSeen: 3 },
}

const config = (over: Partial<SessionConfig> = {}): SessionConfig => ({
  ...DEFAULT_SESSION,
  ...over,
})

describe('isNewToSession', () => {
  it('treats an unseen card as new', () => {
    expect(isNewToSession(card('d'), progress)).toBe(true)
  })

  it('treats a repeatedly-missed card as still new', () => {
    // Seen three times but never right, so it has not been learned yet.
    expect(isNewToSession(card('c'), progress)).toBe(true)
  })

  it('treats a learned card as a review', () => {
    expect(isNewToSession(card('a'), progress)).toBe(false)
  })
})

describe('counts', () => {
  it('splits the pool into new and review', () => {
    expect(countNew(pool, progress)).toBe(3)
    expect(countReviews(pool, progress)).toBe(2)
  })

  it('counts an empty pool as zero of each', () => {
    expect(countNew([], progress)).toBe(0)
    expect(countReviews([], progress)).toBe(0)
  })
})

describe('filterPool', () => {
  it('keeps everything when both toggles are on', () => {
    expect(filterPool(pool, progress, { includeNew: true, includeReviews: true })).toEqual(pool)
  })

  it('keeps only new cards when reviews are off', () => {
    const out = filterPool(pool, progress, { includeNew: true, includeReviews: false })
    expect(out.map((c) => c.id)).toEqual(['c', 'd', 'e'])
  })

  it('keeps only reviews when new cards are off', () => {
    const out = filterPool(pool, progress, { includeNew: false, includeReviews: true })
    expect(out.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('falls back to the whole pool rather than emptying the session', () => {
    // Both off would otherwise dead-end on a setting with no visible consequence.
    expect(filterPool(pool, progress, { includeNew: false, includeReviews: false })).toEqual(pool)
  })

  it('preserves scheduler order', () => {
    const reversed = [...pool].reverse()
    const out = filterPool(reversed, progress, { includeNew: true, includeReviews: true })
    expect(out.map((c) => c.id)).toEqual(['e', 'd', 'c', 'b', 'a'])
  })
})

describe('sessionPool', () => {
  it('caps at the chosen length', () => {
    expect(sessionPool(pool, progress, config({ length: 'short' }))).toHaveLength(4)
    expect(sessionPool(pool, progress, config({ length: 'mid' }))).toHaveLength(5)
  })

  it('never pads a short pool up to the cap', () => {
    expect(sessionPool([card('a')], progress, config({ length: 'long' }))).toHaveLength(1)
  })

  it('applies the toggles before the cap', () => {
    const out = sessionPool(pool, progress, config({ length: 'short', includeNew: false }))
    expect(out.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('returns nothing for an empty pool', () => {
    expect(sessionPool([], progress, config())).toEqual([])
  })
})

describe('length tuning', () => {
  it('grows in both cards and minutes', () => {
    expect(cardsFor('short')).toBeLessThan(cardsFor('mid'))
    expect(cardsFor('mid')).toBeLessThan(cardsFor('long'))
    expect(minutesFor('short')).toBeLessThan(minutesFor('long'))
  })
})

describe('parseSession', () => {
  it('returns the default for missing storage', () => {
    expect(parseSession(null)).toEqual(DEFAULT_SESSION)
  })

  it('returns the default rather than throwing on corrupt JSON', () => {
    expect(parseSession('{not json')).toEqual(DEFAULT_SESSION)
  })

  it('returns the default for a non-object payload', () => {
    expect(parseSession('"short"')).toEqual(DEFAULT_SESSION)
    expect(parseSession('null')).toEqual(DEFAULT_SESSION)
  })

  it('falls back per field, keeping the valid ones', () => {
    const out = parseSession('{"length":"long","answerMode":"nonsense"}')
    expect(out.length).toBe('long')
    expect(out.answerMode).toBe(DEFAULT_SESSION.answerMode)
    expect(out.includeNew).toBe(DEFAULT_SESSION.includeNew)
  })

  it('keeps a stored false rather than defaulting it back to true', () => {
    expect(parseSession('{"includeNew":false}').includeNew).toBe(false)
  })
})

describe('session storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns the default when nothing is stored', () => {
    expect(loadSession()).toEqual(DEFAULT_SESSION)
  })

  it('round-trips a config', () => {
    const saved = config({ length: 'long', includeNew: false, answerMode: 'voice' })
    saveSession(saved)
    expect(loadSession()).toEqual(saved)
  })

  it('notifies subscribers after a successful write', () => {
    let calls = 0
    const stop = subscribeSession(() => {
      calls += 1
    })
    saveSession(config({ length: 'short' }))
    expect(calls).toBe(1)
    stop()
    saveSession(config({ length: 'long' }))
    expect(calls).toBe(1)
  })

  it('recovers from a corrupt stored value', () => {
    localStorage.setItem(SESSION_KEY, '{not json')
    expect(loadSession()).toEqual(DEFAULT_SESSION)
  })
})
