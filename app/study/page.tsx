'use client'

import { Suspense, useEffect, useMemo, useReducer, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CardStage } from '@/components/CardStage'
import { SoundToggle } from '@/components/SoundToggle'
import { UnitUnlockRing } from '@/components/UnitUnlockRing'
import { VoiceWarning } from '@/components/VoiceWarning'
import { matchesAnswer } from '@/lib/answer'
import { type Card } from '@/lib/courses'
import { currentUnitGoal, drillPool } from '@/lib/goals'
import { nextCard, unlockedUnits, type ProgressMap } from '@/lib/leitner'
import { playSfx } from '@/lib/sfx'
import { useActiveCourse, useProgress } from '@/lib/useProgress'

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
  | { type: 'reveal'; isNew: boolean }
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
      // `state.phase === 'prompt'` alone is NOT enough to guard this transition: a
      // brand-new, not-yet-introduced card also has phase 'prompt' in internal state -
      // 'introduce' is only a derived rendering (see derivePhase), never stored on
      // state.phase. Without also checking `isNew`, a reveal dispatched for a card
      // that hasn't gone through introduce -> continue yet would illegally skip
      // straight to 'revealed'. Requiring `!action.isNew` here is what makes the
      // introduce -> prompt -> reveal order a real state-machine invariant, not just
      // something CardStage's JSX happens to enforce by omission.
      return !action.isNew && state.phase === 'prompt' ? { ...state, phase: 'revealed' } : state
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

function StudySession() {
  const { course } = useActiveCourse()
  const { progress, gradeCard } = useProgress()
  const [state, dispatch] = useReducer(reducer, initial)

  const mode = useSearchParams().get('mode')
  const pool = useMemo(() => drillPool(course, progress, mode), [course, progress, mode])
  const goal = useMemo(() => currentUnitGoal(course, progress), [course, progress])
  const unlockedCount = useMemo(() => unlockedUnits(course, progress).length, [course, progress])
  const prevUnlocked = useRef(unlockedCount)
  useEffect(() => {
    // Only a grade made in this session can open a station. The studied check is
    // what makes this correct under hydration too: the first client render may use
    // an empty progress snapshot, so the ref alone could capture a stale count and
    // misfire when the real count arrives.
    if (state.tally.studied > 0 && unlockedCount > prevUnlocked.current) playSfx('unlock')
    prevUnlocked.current = unlockedCount
  }, [unlockedCount, state.tally.studied])
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
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="sig-label text-xs text-[var(--color-muted)]">Terminus</p>
        <span className="mx-auto mt-4 grid h-14 w-14 place-items-center rounded-full bg-[var(--color-accent)] text-2xl text-white">
          ✓
        </span>
        <h1 className="mt-4 text-2xl font-bold">Session complete</h1>
        <p className="mt-3 text-lg">
          You studied {studied} card{studied === 1 ? '' : 's'}.
        </p>
        <p className="mt-1 tabular-nums text-[var(--color-muted)]">
          Got {got} of {studied}.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          {card && (
            // Only offered when a card is actually waiting - if the queue itself is
            // empty there is nothing to resume into, and offering the button would
            // just redisplay this same summary.
            <button
              onClick={() => dispatch({ type: 'resume' })}
              className="rounded-xl bg-[var(--color-accent)] px-5 py-2.5 font-bold text-white"
            >
              Keep studying ▸
            </button>
          )}
          <Link
            href="/"
            className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] px-5 py-2.5 font-semibold"
          >
            Back home
          </Link>
        </div>
      </main>
    )
  }

  if (!card) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="sig-label text-xs text-[var(--color-muted)]">Out of service</p>
        <p className="mt-3 text-lg">Nothing to study right now.</p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] px-5 py-2.5 font-semibold"
        >
          Back home
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-4 flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span className="tabular-nums">
          {state.tally.studied} studied · {state.tally.got} got
        </span>
        <div className="flex items-center gap-3">
          <SoundToggle />
          <Link
            href="/"
            className="sig-label rounded-full border border-[var(--color-line)] px-3 py-1 text-[11px]"
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
        </div>
      </header>

      {goal && <UnitUnlockRing goal={goal} unitLabel={course.unitLabel} />}

      <VoiceWarning />

      <CardStage
        card={card}
        phase={phase}
        typed={state.typed}
        matched={matchesAnswer(state.typed, card)}
        onType={(value) => dispatch({ type: 'type', value })}
        onReveal={() => {
          playSfx('reveal')
          dispatch({ type: 'reveal', isNew })
        }}
        onContinue={() => dispatch({ type: 'continue', cardId: card.id })}
        onGrade={(correct) => {
          playSfx(correct ? 'correct' : 'incorrect')
          gradeCard(card.id, correct)
          dispatch({ type: 'graded', correct, cardId: card.id })
        }}
      />
    </main>
  )
}

export default function StudyPage() {
  // useSearchParams must sit under a Suspense boundary for the static export build.
  return (
    <Suspense fallback={null}>
      <StudySession />
    </Suspense>
  )
}
