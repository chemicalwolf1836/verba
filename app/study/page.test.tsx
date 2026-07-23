import { describe, it, expect } from 'vitest'
import { reducer, initial, isNewCard, derivePhase, type State } from './page'
import type { ProgressMap } from '@/lib/leitner'

function cardProgress(overrides: Partial<ProgressMap[string]> = {}): ProgressMap[string] {
  return { box: 1, seen: 0, correct: 0, lastSeen: 0, ...overrides }
}

describe('reducer', () => {
  it('starts in prompt phase with empty history, introduced list, and tally', () => {
    expect(initial).toEqual({
      phase: 'prompt',
      typed: '',
      history: [],
      introduced: [],
      tally: { studied: 0, got: 0, missed: 0 },
    })
  })

  it('type updates typed and leaves everything else untouched', () => {
    const next = reducer(initial, { type: 'type', value: 'かいぎ' })
    expect(next).toEqual({ ...initial, typed: 'かいぎ' })
  })

  it('reveal moves phase to revealed without touching history or tally', () => {
    const next = reducer(initial, { type: 'reveal' })
    expect(next).toEqual({ ...initial, phase: 'revealed' })
  })

  it('continue returns to prompt, clears typed, and records the card as introduced', () => {
    const withTyped = { ...initial, typed: 'partial' }
    const next = reducer(withTyped, { type: 'continue', cardId: 'card-1' })
    expect(next).toEqual({
      ...initial,
      phase: 'prompt',
      typed: '',
      history: ['card-1'],
      introduced: ['card-1'],
    })
  })

  it('graded(true) returns to prompt, appends history, and increments studied+got', () => {
    const revealed = { ...initial, phase: 'revealed' as const, typed: 'x' }
    const next = reducer(revealed, { type: 'graded', correct: true, cardId: 'card-1' })
    expect(next).toEqual({
      ...initial,
      phase: 'prompt',
      typed: '',
      history: ['card-1'],
      tally: { studied: 1, got: 1, missed: 0 },
    })
  })

  it('graded(false) increments studied+missed but not got', () => {
    const revealed = { ...initial, phase: 'revealed' as const }
    const next = reducer(revealed, { type: 'graded', correct: false, cardId: 'card-1' })
    expect(next.tally).toEqual({ studied: 1, got: 0, missed: 1 })
  })

  it('does not mutate the previous state object (immutability)', () => {
    const before = { ...initial }
    reducer(initial, { type: 'graded', correct: true, cardId: 'card-1' })
    expect(initial).toEqual(before)
  })

  it('advances endlessly: tally keeps accumulating across many grades, no fixed length', () => {
    let state: State = initial
    for (let i = 0; i < 50; i++) {
      state = reducer(state, { type: 'graded', correct: i % 2 === 0, cardId: `card-${i}` })
    }
    expect(state.tally.studied).toBe(50)
    expect(state.history).toHaveLength(50)
    expect(state.history[49]).toBe('card-49')
  })
})

describe('isNewCard', () => {
  it('is true for a card never seen and never introduced this session', () => {
    const progress: ProgressMap = {}
    expect(isNewCard({ id: 'card-1' } as never, progress, initial)).toBe(true)
  })

  it('is false once the card has been graded at least once (seen > 0)', () => {
    const progress: ProgressMap = { 'card-1': cardProgress({ seen: 1 }) }
    expect(isNewCard({ id: 'card-1' } as never, progress, initial)).toBe(false)
  })

  it('is false once the card has been introduced this session, even with seen still 0', () => {
    const progress: ProgressMap = {}
    const state = { ...initial, introduced: ['card-1'] }
    expect(isNewCard({ id: 'card-1' } as never, progress, state)).toBe(false)
  })

  it('is false when there is no card', () => {
    expect(isNewCard(null, {}, initial)).toBe(false)
  })
})

describe('derivePhase', () => {
  it('forces introduce for a new card regardless of stored phase', () => {
    expect(derivePhase(true, { ...initial, phase: 'prompt' })).toBe('introduce')
  })

  it('falls back to the stored phase once the card is not new', () => {
    expect(derivePhase(false, { ...initial, phase: 'prompt' })).toBe('prompt')
    expect(derivePhase(false, { ...initial, phase: 'revealed' })).toBe('revealed')
  })

  it('never renders introduce over an already-revealed phase (defensive guard)', () => {
    expect(derivePhase(true, { ...initial, phase: 'revealed' })).toBe('revealed')
  })
})
