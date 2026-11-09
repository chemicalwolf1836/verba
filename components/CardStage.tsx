'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Card } from '@/lib/courses'
import { toKana } from '@/lib/kana'
import { estimateDuration } from '@/lib/shadow'
import { cancel, speak } from '@/lib/speech'
import type { AnswerMode } from '@/lib/session'

type Props = {
  card: Card
  phase: 'introduce' | 'prompt' | 'revealed'
  typed: string
  onType: (v: string) => void
  onReveal: () => void
  onGrade: (correct: boolean) => void
  onContinue: () => void
  matched: boolean
  answerMode: AnswerMode
  /** Leitner box the card sits in right now, shown as context on reveal. */
  box: number
  /** Set while a graded card is on its way out - 'r' for knew it, 'l' for not
   *  yet. The page owns this so the buttons, the keys and the swipe all animate
   *  identically. */
  leaving?: 'l' | 'r' | null
  /** Horizontal drag in px while a revealed card is being swiped, 0 at rest.
   *  The card follows the finger so the gesture explains itself. */
  drag?: number
  /** True while the finger is down - the card tracks it without easing. */
  dragging?: boolean
}

const NORMAL_RATE = 0.85
const SLOW_RATE = 0.55
/** Quiet beat between loop repeats, so it reads as a repetition, not a stutter. */
const LOOP_GAP_MS = 700

const pill =
  'rounded-full border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-2 text-sm font-bold'

/**
 * The action row docks to the bottom of the screen. On a phone the card above it
 * runs taller than the viewport, and the buttons pressed every few seconds -
 * Show me, Not yet, I knew it - used to sit below the fold on every card.
 * The negative margin lets its backdrop run edge to edge under the page padding,
 * and the shadow in the ground colour fades whatever scrolls beneath it rather
 * than cutting it off at a hard edge.
 */
const dock =
  'sticky bottom-0 z-10 mt-auto -mx-4 space-y-2.5 bg-[var(--color-paper)] px-4 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-16px_14px_-6px_var(--color-paper)]'

/** Past this, a swipe grades - kept in step with the page's threshold. */
export const SWIPE_GRADE_PX = 70

const clock = (ms: number) => `0:${String(Math.round(ms / 1000)).padStart(2, '0')}`

/**
 * The size of the headword scales down as it gets longer, so 打ち合わせ and 会議
 * occupy roughly the same optical block instead of one overflowing its line.
 */
const wordSize = (jp: string) =>
  jp.length > 5 ? 'text-4xl' : jp.length > 3 ? 'text-5xl' : jp.length > 2 ? 'text-6xl' : 'text-7xl'

export function CardStage({
  card, phase, typed, onType, onReveal, onGrade, onContinue, matched, answerMode, box, leaving,
  drag = 0, dragging = false,
}: Props) {
  const [loop, setLoop] = useState(false)
  // Bumped on every play so the audio bar's CSS animation restarts from zero.
  const [plays, setPlays] = useState(0)
  const loopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const durationMs = estimateDuration(card.jp, NORMAL_RATE)
  const typedKana = toKana(typed)
  const showTyping = answerMode === 'typing'

  const play = useCallback(
    (rate = NORMAL_RATE) => {
      speak(card.jp, { rate })
      setPlays((n) => n + 1)
    },
    [card.jp],
  )

  // Loop lives here rather than in the reducer because it is a property of the
  // audio, not of the session: it must stop the moment the answer is on screen or
  // the card changes, and never outlive the component.
  useEffect(() => {
    if (loopTimer.current) clearTimeout(loopTimer.current)
    if (!loop || phase !== 'prompt') return
    loopTimer.current = setTimeout(() => play(), durationMs + LOOP_GAP_MS)
    return () => {
      if (loopTimer.current) clearTimeout(loopTimer.current)
    }
  }, [loop, phase, plays, durationMs, play])

  // A new card must never inherit the previous one's loop, and leaving the stage
  // must not leave the browser talking.
  useEffect(() => {
    setLoop(false)
  }, [card.id])
  useEffect(() => () => cancel(), [])

  // R replays. It lives here rather than with the page's other shortcuts because
  // this is what owns the audio. The INPUT guard matters more here than anywhere:
  // 'r' is an ordinary letter in the romaji the learner is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'r' || e.key === 'R') play()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [play])

  const leaveClass = leaving === 'r' ? 'card-leave-r' : leaving === 'l' ? 'card-leave-l' : ''

  if (phase === 'introduce') {
    return (
      <section className={`flex flex-1 flex-col gap-5 ${leaveClass}`}>
        <p className="text-center text-sm text-[var(--color-muted)]">
          A new stop on the line. Listen, read it, then it joins the queue.
        </p>
        <Headword card={card} onPlay={play} />
        <Reference card={card} />
        <div className={dock}>
          <Rule />
          <button
            onClick={onContinue}
            className="w-full rounded-2xl bg-[var(--color-accent)] py-4 text-lg font-extrabold text-white active:scale-[0.99]"
          >
            Got it - quiz me later
          </button>
        </div>
      </section>
    )
  }

  if (phase === 'revealed') {
    return (
      // reveal-stagger settles the answer in order - verdict, headword, rule,
      // example, actions - rather than dropping it all in at once.
      <section
        className={`reveal-stagger relative flex flex-1 flex-col gap-4 ${leaveClass} ${
          dragging ? 'select-none' : ''
        }`}
        style={
          drag !== 0
            ? {
                transform: `translateX(${drag}px) rotate(${drag / 40}deg)`,
                transition: dragging ? 'none' : 'transform .2s var(--ease-quiet)',
              }
            : undefined
        }
      >
        <SwipeVerdict drag={drag} />
        {showTyping && typed.trim() !== '' && (
          <p
            className={`text-center text-sm font-extrabold ${
              matched ? 'text-[var(--color-green)]' : 'text-[var(--color-here)]'
            }`}
          >
            {matched ? '✓ your answer matched' : `you typed ${typedKana || typed}`}
          </p>
        )}

        <Headword card={card} onPlay={play} showBox={box} />
        {/* Only when there is a reference panel to separate - otherwise this
            rule stacked directly on the dock's own. */}
        {(card.exampleJp || card.hook) && <Rule />}
        <Reference card={card} />

        <div className={dock}>
          <Rule />
          <div className="flex gap-2.5">
            <button
              onClick={() => onGrade(false)}
              className="flex-1 rounded-2xl border-[1.5px] border-[var(--color-line)] bg-[var(--color-card)] py-4 font-extrabold active:scale-[0.99]"
            >
              Not yet <span className="kbd-hint text-[var(--color-muted)]">1</span>
            </button>
            <button
              onClick={() => onGrade(true)}
              className="flex-1 rounded-2xl bg-[var(--color-accent)] py-4 font-extrabold text-white active:scale-[0.99]"
            >
              I knew it <span className="kbd-hint text-white/70">2</span>
            </button>
          </div>
          <p className="touch-hint text-center text-xs text-[var(--color-muted)]">
            Swipe right if you knew it, left if not
          </p>
          <p className="kbd-hint text-center text-xs text-[var(--color-muted)]">
            Keys 1 and 2 · swipe works too
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className={`flex flex-1 flex-col gap-5 ${leaveClass}`}>
      <div className="flex flex-col items-center gap-4 pt-2 sm:gap-5 sm:pt-5">
        <p className="text-[var(--color-muted)]">Listen, then say the reading out loud.</p>

        <button
          onClick={() => play()}
          aria-label="Play audio"
          className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-accent)] pl-1.5 text-4xl text-white shadow-[0_22px_44px_-20px_var(--color-accent)] active:scale-95 sm:h-32 sm:w-32 sm:pl-2 sm:text-5xl"
        >
          ▶
        </button>

        <div className="flex w-full max-w-md items-center gap-2.5">
          <span className="text-xs tabular-nums text-[var(--color-muted)]">0:00</span>
          <span className="flex h-[5px] flex-1 overflow-hidden rounded-sm bg-[var(--color-line)]">
            {/* Keyed on the play count so each press restarts the fill. */}
            <span
              key={plays}
              className={plays > 0 ? 'audio-fill bg-[var(--color-ink)]' : ''}
              style={{ animationDuration: `${durationMs}ms` }}
            />
          </span>
          <span className="text-xs tabular-nums text-[var(--color-muted)]">
            {clock(durationMs)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={() => play(SLOW_RATE)} className={pill}>
            Slower
          </button>
          <button
            onClick={() => play()}
            className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-bold text-white"
          >
            Replay
          </button>
          <button
            onClick={() => setLoop((v) => !v)}
            aria-pressed={loop}
            className={`rounded-full bg-[var(--color-card)] px-4 py-2 text-sm font-bold ${
              loop
                ? 'border border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border border-[var(--color-line)]'
            }`}
          >
            Loop
          </button>
        </div>
      </div>

      <div className={dock}>
        <Rule />
        {showTyping && (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2 border-b-2 border-[var(--color-ink)] pb-2">
              <input
                value={typed}
                onChange={(e) => onType(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onReveal()}
                placeholder="type the reading…"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Type the reading"
                className="min-w-0 flex-1 bg-transparent text-xl font-bold outline-none"
              />
              {/* The echo is a mirror of the keystrokes, not a verdict - it shows
                  what the romaji spells while the answer is still hidden. */}
              <span aria-hidden className="jp text-xl font-bold text-[var(--color-accent)]">
                {typedKana}
              </span>
            </div>
            <p className="text-center text-sm text-[var(--color-muted)]">
              {typedKana === ''
                ? 'Typing is optional - it is checked, never scored.'
                : matched
                  ? '✓ that matches the reading'
                  : 'keep going…'}
            </p>
          </div>
        )}
        <button
          onClick={onReveal}
          className="w-full rounded-2xl bg-[var(--color-ink)] py-4 text-lg font-extrabold text-white active:scale-[0.99]"
        >
          Show me
        </button>
        <p className="kbd-hint flex justify-center gap-4 text-xs text-[var(--color-muted)]">
          <span>
            <b className="text-[var(--color-ink)]">Space</b> reveal
          </span>
          <span>
            <b className="text-[var(--color-ink)]">R</b> replay
          </span>
        </p>
      </div>
    </section>
  )
}

const Rule = () => <div aria-hidden className="h-px bg-[var(--color-line)]" />

function Headword({
  card, onPlay, showBox,
}: {
  card: Card
  onPlay: (rate?: number) => void
  showBox?: number
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 pt-1">
      <p className={`jp font-bold leading-none ${wordSize(card.jp)}`}>{card.jp}</p>
      <p className="jp text-xl font-semibold tracking-[0.14em] text-[var(--color-accent)]">
        {card.reading}
      </p>
      <p className="mt-1 text-center text-xl font-semibold">{card.meaning}</p>
      <div className="mt-2.5 flex flex-wrap justify-center gap-2">
        {/* Same words as the prompt's controls - one action, one name. */}
        <button onClick={() => onPlay()} className={pill}>
          ▶ Replay
        </button>
        <button onClick={() => onPlay(SLOW_RATE)} className={pill}>
          Slower
        </button>
      </div>
      {/* Plain text, not a pill: it is a fact about the card, and in the
          buttons' shape it read as one more thing to tap. */}
      {showBox !== undefined && (
        <p className="text-xs font-semibold text-[var(--color-muted)]">
          Box {showBox} of 5
        </p>
      )}
    </div>
  )
}

/** Example sentence and memory hook, side by side where there is width for it.
 *  Either half is optional, so a card with neither renders nothing at all. */
function Reference({ card }: { card: Card }) {
  if (!card.exampleJp && !card.hook) return null
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {card.exampleJp && (
        <div className="min-w-0 space-y-2">
          <p className="sig-label text-[11px] text-[var(--color-muted)]">Heard in the wild</p>
          <p className="jp text-lg leading-relaxed">{card.exampleJp}</p>
          <p className="text-sm text-[var(--color-muted)]">{card.exampleEn}</p>
          <button
            onClick={() => speak(card.exampleJp!, { rate: 0.8 })}
            className="text-sm font-bold text-[var(--color-accent)]"
          >
            ▶ Play sentence
          </button>
        </div>
      )}
      {card.hook && (
        <div className="min-w-0 space-y-2">
          <p className="sig-label text-[11px] text-[var(--color-muted)]">Remember it</p>
          <p className="text-sm leading-relaxed text-[var(--color-ink)]/85">{card.hook}</p>
        </div>
      )}
    </div>
  )
}

/**
 * The verdict a swipe is heading for, shown on the card while it is dragged. It
 * fades in with distance and is fully opaque at the grading threshold, so the
 * learner can see where letting go will land - and pull back if it is wrong.
 */
function SwipeVerdict({ drag }: { drag: number }) {
  if (Math.abs(drag) < 12) return null
  const knew = drag > 0
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute top-2 z-10 rounded-full px-3 py-1 text-sm font-extrabold text-white ${
        knew ? 'right-0 bg-[var(--color-green)]' : 'left-0 bg-[var(--color-here)]'
      }`}
      style={{ opacity: Math.min(1, Math.abs(drag) / SWIPE_GRADE_PX), animation: 'none' }}
    >
      {knew ? 'I knew it' : 'Not yet'}
    </span>
  )
}
