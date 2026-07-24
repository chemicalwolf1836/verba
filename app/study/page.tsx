'use client'

import { useMemo, useReducer } from 'react'
import Link from 'next/link'
import { CardStage } from '@/components/CardStage'
import { VoiceWarning } from '@/components/VoiceWarning'
import { matchesAnswer } from '@/lib/answer'
import { getCourse, DEFAULT_COURSE_ID, type Card } from '@/lib/courses'
import { nextCard, unlockedCards, type ProgressMap } from '@/lib/leitner'
import { useProgress } from '@/lib/useProgress'

export type Phase = 'introduce' | 'prompt' | 'revealed'

export type State = {
  phase: Phase
  typed: string
  history: string[]
  /**
   * Cards already introduced this session. Introducing is not grading, so `seen`
   * stays 0 - without this list the same new card would re-introduce itself every
   * time the queue served it, and never become a real prompt.
   */
  introduced: string[]
  tally: { studied: number; got: number; missed: number }
  /** True once the user has ended the session - renders the summary instead of a card. */
  finished: boolean
}

export type Action =
  | { type: 'reveal' }
  | { type: 'type'; value: string }
  | { type: 'graded'; correct: boolean; cardId: string }
  | { type: 'continue'; cardId: string }
  | { type: 'finish' }
  | { type: 'resume' }

export const initial: State = {
  phase: 'prompt',
  typed: '',
  history: [],
  introduced: [],
  tally: { studied: 0, got: 0, missed: 0 },
  finished: false,
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'type':
      return { ...state, typed: action.value }
    case 'reveal':
      // A card can only be revealed from the prompt phase - never from 'introduce'
      // (a new/un-introduced card) or already 'revealed'. This makes the
      // introduce -> prompt -> reveal invariant unrepresentable at the state-machine
      // level, not just enforced by CardStage's JSX gating.
      return state.phase === 'prompt' ? { ...state, phase: 'revealed' } : state
    case 'finish':
      return { ...state, finished: true }
    case 'resume':
      return { ...state, finished: false }
    case 'continue':
      // An introduced card is not graded - it re-enters the queue as a real prompt.
      return {
        ...state,
        phase: 'prompt',
        typed: '',
        history: [...state.history, action.cardId],
        introduced: [...state.introduced, action.cardId],
      }
    case 'graded':
      return {
        ...state,
        phase: 'prompt',
        typed: '',
        history: [...state.history, action.cardId],
        tally: {
          studied: state.tally.studied + 1,
          got: state.tally.got + (action.correct ? 1 : 0),
          missed: state.tally.missed + (action.correct ? 0 : 1),
        },
      }
  }
}

/**
 * A card is a first exposure only while it has never been graded (`seen === 0`)
 * and this session hasn't already walked it through the introduce phase. Once
 * either is true, isNewCard is false for the rest of the session - so a card
 * can never re-enter 'introduce' after being introduced or graded once.
 */
export function isNewCard(card: Card | null, progress: ProgressMap, state: State): boolean {
  return card !== null && (progress[card.id]?.seen ?? 0) === 0 && !state.introduced.includes(card.id)
}

/**
 * The rendered phase is derived, not stored directly: a first-exposure card is
 * always shown as 'introduce' regardless of the reducer's last phase, so there is
 * no action path that can render a fresh card as a blind prompt or a revealed
 * grade screen. `state.phase !== 'revealed'` is a defensive guard - introduce-phase
 * cards never dispatch 'reveal', so this branch should be unreachable in practice.
 */
export function derivePhase(isNew: boolean, state: State): Phase {
  return isNew && state.phase !== 'revealed' ? 'introduce' : state.phase
}

/**
 * Whether the end-of-session summary should replace the normal card view. Requires at
 * least one studied card, so a zero-length session - Finish tapped immediately, or a
 * queue that was empty from the start - never renders a fake "session complete" screen.
 * True both when the user explicitly finishes and when the queue naturally exhausts
 * (no card left to show) after real studying happened.
 */
export function isSessionEnded(state: State, hasCard: boolean): boolean {
  return state.tally.studied > 0 && (state.finished || !hasCard)
}

export default function StudyPage() {
  const course = getCourse(DEFAULT_COURSE_ID)!
  const { progress, gradeCard } = useProgress()
  const [state, dispatch] = useReducer(reducer, initial)

  const pool = useMemo(() => unlockedCards(course, progress), [course, progress])
  const card: Card | null = useMemo(
    () => nextCard(pool, progress, state.history),
    [pool, progress, state.history],
  )

  const isNew = isNewCard(card, progress, state)
  const phase: Phase = derivePhase(isNew, state)

  // Distinct from the "no card was ever available" state below, which never had a
  // session to summarise.
  const sessionEnded = isSessionEnded(state, card !== null)

  if (sessionEnded) {
    const { studied, got } = state.tally
    return (
      <main className="mx-auto max-w-lg px-4 py-8 text-center">
        <h1 className="text-xl font-bold">Session complete</h1>
        <p className="mt-3 text-lg">
          You studied {studied} card{studied === 1 ? '' : 's'}.
        </p>
        <p className="mt-1 text-[var(--color-muted)]">
          Got {got} of {studied}.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          {card && (
            // Only offered when a card is actually waiting - if the queue itself is
            // empty there is nothing to resume into, and offering the button would
            // just redisplay this same summary.
            <button
              onClick={() => dispatch({ type: 'resume' })}
              className="rounded-lg border border-[var(--color-line)] px-4 py-2 underline"
            >
              Keep studying
            </button>
          )}
          <Link href="/" className="inline-block underline">
            Back home
          </Link>
        </div>
      </main>
    )
  }

  if (!card) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-lg">Nothing to study right now.</p>
        <Link href="/" className="mt-4 inline-block underline">
          Back home
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-4 flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span>
          {state.tally.studied} studied · {state.tally.got} got
        </span>
        <Link
          href="/"
          className="underline"
          onClick={(e) => {
            // Zero cards studied: Finish just navigates home like a plain link -
            // no fake "session complete" screen for a session that never happened.
            if (state.tally.studied === 0) return
            e.preventDefault()
            dispatch({ type: 'finish' })
          }}
        >
          Finish
        </Link>
      </header>

      <VoiceWarning />

      <CardStage
        card={card}
        phase={phase}
        typed={state.typed}
        matched={matchesAnswer(state.typed, card)}
        onType={(value) => dispatch({ type: 'type', value })}
        onReveal={() => dispatch({ type: 'reveal' })}
        onContinue={() => dispatch({ type: 'continue', cardId: card.id })}
        onGrade={(correct) => {
          gradeCard(card.id, correct)
          dispatch({ type: 'graded', correct, cardId: card.id })
        }}
      />
    </main>
  )
}
