import { describe, it, expect } from 'vitest'
import { reducer, initial, isNewCard, derivePhase, isSessionEnded, type State } from './page'
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
      finished: false,
    })
  })

  it('type updates typed and leaves everything else untouched', () => {
    const next = reducer(initial, { type: 'type', value: 'かいぎ' })
    expect(next).toEqual({ ...initial, typed: 'かいぎ' })
  })

  it('reveal moves phase to revealed without touching history or tally', () => {
    const next = reducer(initial, { type: 'reveal', isNew: false })
    expect(next).toEqual({ ...initial, phase: 'revealed' })
  })

  it('reveal on a still-new/un-introduced card (isNew: true) is a no-op', () => {
    // A brand-new card is internally still `phase: 'prompt'` - 'introduce' is only a
    // derived rendering (derivePhase), never stored on state.phase. So `state.phase
    // === 'prompt'` alone cannot distinguish a genuinely revealable prompt from a
    // not-yet-introduced new card. If a future keyboard shortcut or swipe ever
    // dispatched 'reveal' while a card is still new/un-introduced, it must not be
    // able to skip straight to a gradeable 'revealed' phase - the introduce ->
    // prompt -> reveal invariant must hold inside the reducer itself via the
    // `isNew` flag, not just via CardStage's JSX gating.
    const next = reducer(initial, { type: 'reveal', isNew: true })
    expect(next.phase).not.toBe('revealed')
    expect(next).toEqual(initial)
  })

  it('reveal on a seen/already-introduced card (isNew: false) does move to revealed', () => {
    const next = reducer(initial, { type: 'reveal', isNew: false })
    expect(next.phase).toBe('revealed')
  })

  it('reveal from an already-revealed state is also a no-op', () => {
    const revealed: State = { ...initial, phase: 'revealed' as const }
    const next = reducer(revealed, { type: 'reveal', isNew: false })
    expect(next).toEqual(revealed)
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

  it('finish sets finished without touching the tally the summary will read', () => {
    const revealed = { ...initial, phase: 'revealed' as const }
    const midSession = reducer(revealed, { type: 'graded', correct: true, cardId: 'card-1' })
    const finished = reducer(midSession, { type: 'finish' })
    expect(finished).toEqual({ ...midSession, finished: true })
    expect(finished.tally).toEqual({ studied: 1, got: 1, missed: 0 })
  })

  it('resume clears finished so studying can continue', () => {
    const finished = reducer(initial, { type: 'finish' })
    const resumed = reducer(finished, { type: 'resume' })
    expect(resumed).toEqual({ ...initial, finished: false })
  })
})

describe('isSessionEnded', () => {
  it('is false for a mid-session state with a card still available', () => {
    const midSession = reducer(initial, { type: 'graded', correct: true, cardId: 'card-1' })
    expect(isSessionEnded(midSession, true)).toBe(false)
  })

  it('is true once finished is set and at least one card was studied', () => {
    const midSession = reducer(initial, { type: 'graded', correct: true, cardId: 'card-1' })
    const finished = reducer(midSession, { type: 'finish' })
    expect(isSessionEnded(finished, true)).toBe(true)
  })

  it('does not claim a session happened when finishing with zero cards studied', () => {
    // Tapping Finish immediately (before studying anything) must never produce a
    // fake "session complete" summary - even if 'finish' were dispatched directly.
    const finishedImmediately = reducer(initial, { type: 'finish' })
    expect(finishedImmediately.tally.studied).toBe(0)
    expect(isSessionEnded(finishedImmediately, true)).toBe(false)
  })

  it('is true when the queue naturally exhausts after real studying', () => {
    const midSession = reducer(initial, { type: 'graded', correct: false, cardId: 'card-1' })
    expect(isSessionEnded(midSession, false)).toBe(true)
  })

  it('stays false for an empty queue that never had a session (distinct from the summary)', () => {
    // This is the "Nothing to study right now" case, not the end-of-session summary.
    expect(isSessionEnded(initial, false)).toBe(false)
  })

  it('reflects the actual accumulated tally, not just a single grade', () => {
    let state: State = initial
    state = reducer(state, { type: 'graded', correct: true, cardId: 'card-1' })
    state = reducer(state, { type: 'graded', correct: false, cardId: 'card-2' })
    state = reducer(state, { type: 'graded', correct: true, cardId: 'card-3' })
    const finished = reducer(state, { type: 'finish' })
    expect(finished.tally).toEqual({ studied: 3, got: 2, missed: 1 })
    expect(isSessionEnded(finished, true)).toBe(true)
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
