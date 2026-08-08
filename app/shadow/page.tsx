'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { VoiceWarning } from '@/components/VoiceWarning'
import { SHADOW_LINES } from '@/lib/courses/shadow'
import { estimateDuration, SPEAK_MULTIPLIER } from '@/lib/shadow'
import { cancel, speak } from '@/lib/speech'

type Phase = 'idle' | 'listen' | 'speak'

const RATES = [
  { rate: 0.55, label: 'Slow' },
  { rate: 0.85, label: 'Normal' },
  { rate: 1, label: 'Native' },
] as const

const pill =
  'rounded-full border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-2 text-sm font-bold'

export default function ShadowPage() {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [rate, setRate] = useState(0.85)
  const [showText, setShowText] = useState(true)
  // Bumped on each play so the draining bar's animation restarts.
  const [runs, setRuns] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const line = SHADOW_LINES[index]
  const listenMs = estimateDuration(line.jp, rate)
  const speakMs = listenMs * SPEAK_MULTIPLIER

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const stop = useCallback(() => {
    clearTimers()
    cancel()
    setPhase('idle')
  }, [clearTimers])

  // Leaving the page must not leave the browser talking.
  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    cancel()
  }, [])

  /**
   * One beat, driven by the play button rather than a rolling cycle: listen while
   * it speaks, then a turn of your own that is longer than the line took - copying
   * a phrase back is slower than hearing it. Manual is the right default here;
   * an auto-advancing loop moves on whether or not you managed to say anything.
   */
  const run = () => {
    clearTimers()
    setRuns((n) => n + 1)
    setPhase('listen')
    speak(line.jp, { rate })
    timers.current.push(
      setTimeout(() => setPhase('speak'), listenMs + 250),
      setTimeout(() => setPhase('idle'), listenMs + 250 + speakMs),
    )
  }

  const go = (next: number) => {
    stop()
    setIndex(next)
  }

  return (
    <main className="mx-auto flex min-h-[34rem] w-full max-w-xl flex-col gap-5 px-4 py-5">
      <div className="space-y-2.5">
        <div className="flex items-baseline">
          <span className="text-sm font-extrabold tabular-nums">
            {index + 1}{' '}
            <span className="font-semibold text-[var(--color-muted)]">
              of {SHADOW_LINES.length}
            </span>
          </span>
          <Link
            href="/"
            onClick={() => cancel()}
            className="ml-auto text-sm font-bold text-[var(--color-muted)]"
          >
            Done
          </Link>
        </div>
        <div className="h-[5px] overflow-hidden rounded-sm bg-[var(--color-line)]">
          <span
            className="block h-full bg-[var(--color-accent)]"
            style={{ width: `${((index + 1) / SHADOW_LINES.length) * 100}%` }}
          />
        </div>
      </div>

      <VoiceWarning />

      <div className="flex flex-col items-center gap-1 pt-3">
        <p className="sig-label text-sm text-[var(--color-accent)]">
          {phase === 'speak' ? 'Your turn' : 'Listen'}
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          {phase === 'speak'
            ? 'Repeat it while the bar runs out'
            : 'Press play, then echo it back'}
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Drains only during your turn - it is a countdown for speaking, not a
            progress bar for the audio. */}
        <span className="flex h-1.5 w-full max-w-md overflow-hidden rounded-sm bg-[var(--color-line)]">
          {phase === 'speak' && (
            <span
              key={runs}
              className="gap-drain bg-[var(--color-here)]"
              style={{ animationDuration: `${speakMs}ms` }}
            />
          )}
        </span>

        <p
          className={`jp text-center text-2xl font-bold leading-relaxed sm:text-3xl ${
            showText ? '' : 'select-none blur-md'
          }`}
        >
          {line.jp}
        </p>
        {showText && (
          <>
            <p className="jp text-center text-sm text-[var(--color-muted)]">{line.reading}</p>
            <p className="text-center text-sm">{line.en}</p>
          </>
        )}
      </div>

      <div className="mt-auto space-y-4 pb-2">
        <div aria-hidden className="h-px bg-[var(--color-line)]" />

        <div className="flex items-center justify-center gap-7">
          <button
            onClick={() => go(Math.max(0, index - 1))}
            disabled={index === 0}
            aria-label="Previous line"
            className="text-3xl leading-none text-[var(--color-muted)] disabled:opacity-30"
          >
            ‹
          </button>
          <button
            onClick={phase === 'idle' ? run : stop}
            aria-label={phase === 'idle' ? 'Play line' : 'Stop'}
            className="flex h-[74px] w-[74px] items-center justify-center rounded-full bg-[var(--color-ink)] pl-1 text-2xl font-extrabold text-white active:scale-95"
          >
            {phase === 'idle' ? '▶' : '■'}
          </button>
          <button
            onClick={() => go(Math.min(SHADOW_LINES.length - 1, index + 1))}
            disabled={index === SHADOW_LINES.length - 1}
            aria-label="Next line"
            className="text-3xl leading-none text-[var(--color-muted)] disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {RATES.map(({ rate: r, label }) => (
            <button
              key={r}
              onClick={() => setRate(r)}
              aria-pressed={rate === r}
              className={
                rate === r
                  ? 'rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-bold text-white'
                  : pill
              }
            >
              {label}
            </button>
          ))}
          {/* Not in the design, but shadowing with the text hidden is the point of
              the exercise once a line is familiar - keeping it. */}
          <button
            onClick={() => setShowText((v) => !v)}
            aria-pressed={!showText}
            className={
              showText
                ? pill
                : 'rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-bold text-white'
            }
          >
            {showText ? 'Text: on' : 'Text: off'}
          </button>
        </div>
      </div>
    </main>
  )
}
