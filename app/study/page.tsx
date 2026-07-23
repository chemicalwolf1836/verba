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
}

export type Action =
  | { type: 'reveal' }
  | { type: 'type'; value: string }
  | { type: 'graded'; correct: boolean; cardId: string }
  | { type: 'continue'; cardId: string }

export const initial: State = {
  phase: 'prompt',
  typed: '',
  history: [],
  introduced: [],
  tally: { studied: 0, got: 0, missed: 0 },
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'type':
      return { ...state, typed: action.value }
    case 'reveal':
      return { ...state, phase: 'revealed' }
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
        <Link href="/" className="underline">
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
