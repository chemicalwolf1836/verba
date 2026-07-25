'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { VoiceWarning } from '@/components/VoiceWarning'
import { SHADOW_LINES } from '@/lib/courses/shadow'
import { estimateDuration, SPEAK_MULTIPLIER } from '@/lib/shadow'
import { cancel, speak } from '@/lib/speech'

type Phase = 'idle' | 'listen' | 'speak'

export default function ShadowPage() {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [running, setRunning] = useState(false)
  const [rate, setRate] = useState(0.85)
  const [showText, setShowText] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const line = SHADOW_LINES[index]

  useEffect(() => {
    // Cancel any in-flight speech and timer when the component unmounts or the
    // cycle stops, or a paused session keeps talking in the background.
    return () => {
      if (timer.current) clearTimeout(timer.current)
      cancel()
    }
  }, [])

  useEffect(() => {
    if (!running) return

    const listenMs = estimateDuration(line.jp, rate)
    setPhase('listen')
    speak(line.jp, { rate })

    timer.current = setTimeout(() => {
      setPhase('speak')
      timer.current = setTimeout(() => {
        if (index + 1 >= SHADOW_LINES.length) {
          setRunning(false)
          setPhase('idle')
        } else {
          setIndex((i) => i + 1)
        }
      }, listenMs * SPEAK_MULTIPLIER)
    }, listenMs + 250)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [running, index, rate, line.jp])

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <div className="flex justify-between text-sm text-[var(--color-muted)]">
        <span>
          Sentence {index + 1} / {SHADOW_LINES.length}
        </span>
        <Link href="/" className="underline" onClick={() => cancel()}>
          Finish
        </Link>
      </div>

      <VoiceWarning />

      <p className="text-center text-sm font-bold">
        {phase === 'listen'
          ? 'Listen carefully...'
          : phase === 'speak'
            ? 'Your turn - repeat it aloud'
            : 'Press start when ready'}
      </p>

      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-6 text-center">
        <p className={`text-xl font-bold ${showText ? '' : 'blur-md select-none'}`}>
          {line.jp}
        </p>
        {showText && (
          <p className="mt-2 text-sm text-[var(--color-muted)]">{line.reading}</p>
        )}
        <p className="mt-3 border-t border-dashed border-[var(--color-line)] pt-3 text-sm text-[var(--color-muted)]">
          {line.en}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            if (running) {
              setRunning(false)
              setPhase('idle')
              cancel()
            } else {
              setRunning(true)
            }
          }}
          className="flex-1 rounded-lg bg-[var(--color-ink)] py-3 font-bold text-[var(--color-card)]"
        >
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={() => speak(line.jp, { rate })}
          className="flex-1 rounded-lg border border-[var(--color-line)] py-3"
        >
          Replay
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {([0.6, 0.85, 1] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRate(r)}
            className={`rounded-full border px-3 py-1 text-xs ${
              rate === r
                ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-card)]'
                : 'border-[var(--color-line)]'
            }`}
          >
            {r === 0.6 ? 'Slow' : r === 0.85 ? 'Normal' : 'Native'}
          </button>
        ))}
        <button
          onClick={() => setShowText((v) => !v)}
          className={`rounded-full border px-3 py-1 text-xs ${
            showText
              ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-card)]'
              : 'border-[var(--color-line)]'
          }`}
        >
          {showText ? 'Text: on' : 'Text: off'}
        </button>
      </div>
    </main>
  )
}
