import { describe, it, expect, afterEach, vi } from 'vitest'
import { CARD_LEAVE_MS, STATION_ARRIVE_MS, motionDuration } from './motion'

const original = window.matchMedia

/** Replace matchMedia with one that reports the given answer for any query. */
function stubMatchMedia(matches: boolean | 'throws' | 'missing') {
  if (matches === 'missing') {
    // @ts-expect-error - deliberately removing it to model an environment without it
    delete window.matchMedia
    return
  }
  window.matchMedia = vi.fn((query: string) => {
    if (matches === 'throws') throw new Error('unsupported feature')
    return { matches, media: query } as MediaQueryList
  }) as unknown as typeof window.matchMedia
}

afterEach(() => {
  window.matchMedia = original
})

describe('motionDuration', () => {
  it('returns the full duration when motion is fine', () => {
    stubMatchMedia(false)
    expect(motionDuration(260)).toBe(260)
  })

  it('collapses to zero when the user asked for reduced motion', () => {
    // The CSS collapses on its own; a setTimeout does not. Without this, reduced
    // motion would mean the same wait with nothing to look at - worse than either.
    stubMatchMedia(true)
    expect(motionDuration(260)).toBe(0)
  })

  it('asks about prefers-reduced-motion specifically', () => {
    stubMatchMedia(false)
    motionDuration(100)
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })

  it('falls back to the full duration where matchMedia does not exist', () => {
    stubMatchMedia('missing')
    expect(motionDuration(260)).toBe(260)
  })

  it('falls back to the full duration rather than throwing', () => {
    // Some engines expose matchMedia but reject queries they do not know.
    stubMatchMedia('throws')
    expect(motionDuration(260)).toBe(260)
  })

  it('never returns a negative or fractional wait for zero', () => {
    stubMatchMedia(false)
    expect(motionDuration(0)).toBe(0)
  })
})

describe('durations', () => {
  it('keeps the card exit brief enough not to gate the next answer', () => {
    // Long enough to read as motion, short enough that a fast learner is not
    // waiting on it between cards.
    expect(CARD_LEAVE_MS).toBeGreaterThanOrEqual(150)
    expect(CARD_LEAVE_MS).toBeLessThanOrEqual(400)
  })

  it('lets the station flourish outlast the card exit', () => {
    // It marks a rarer, larger event, so it is allowed more room.
    expect(STATION_ARRIVE_MS).toBeGreaterThan(CARD_LEAVE_MS)
  })
})
