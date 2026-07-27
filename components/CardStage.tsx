'use client'

import type { Card } from '@/lib/courses'
import { speak } from '@/lib/speech'

type Props = {
  card: Card
  phase: 'introduce' | 'prompt' | 'revealed'
  typed: string
  onType: (v: string) => void
  onReveal: () => void
  onGrade: (correct: boolean) => void
  onContinue: () => void
  matched: boolean
}

export function CardStage({
  card, phase, typed, onType, onReveal, onGrade, onContinue, matched,
}: Props) {
  const showText = phase !== 'prompt'

  return (
    <section>
      <p className="mb-3 text-center">
        <span className="sig-label text-[11px] text-[var(--color-muted)]">
          {phase === 'introduce' ? 'New stop' : phase === 'revealed' ? 'Now arriving' : 'Listen'}
        </span>
      </p>

      <button
        onClick={() => speak(card.jp)}
        aria-label="Play audio"
        className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent)] pl-1 text-3xl text-white shadow-[0_8px_24px_-8px_var(--color-accent)] active:scale-95"
      >
        ▶
      </button>

      <div className="mb-5 flex justify-center gap-2">
        <button
          onClick={() => speak(card.jp, { rate: 0.85 })}
          className="rounded-full border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-2 text-sm font-medium"
        >
          Normal
        </button>
        <button
          onClick={() => speak(card.jp, { rate: 0.5 })}
          className="rounded-full border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-2 text-sm font-medium"
        >
          Slow
        </button>
      </div>

      {showText ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)]">
          <div className="h-1.5 w-full bg-[var(--color-accent)]" aria-hidden />
          <div className="p-6 text-center">
            <p className="jp text-6xl font-bold leading-none">{card.jp}</p>
            <p className="mt-3 sig-label text-sm text-[var(--color-accent)]">{card.reading}</p>
            <p className="mt-3 text-lg">{card.meaning}</p>
            {card.exampleJp && (
              <div className="mt-5 border-t border-dashed border-[var(--color-line)] pt-4">
                <p className="jp flex items-center justify-center gap-2 text-[17px]">
                  {card.exampleJp}
                  <button
                    onClick={() => speak(card.exampleJp!, { rate: 0.8 })}
                    aria-label="Play example"
                    className="text-[var(--color-accent)]"
                  >
                    ♪
                  </button>
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{card.exampleEn}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-center text-sm text-[var(--color-muted)]">
            Say it aloud, then reveal. Typing is optional.
          </p>
          <input
            value={typed}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onReveal()}
            placeholder="reading in kana or romaji..."
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3 text-lg"
          />
        </div>
      )}

      {phase === 'introduce' && (
        <button
          onClick={onContinue}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] py-3.5 font-bold text-white active:scale-[0.99]"
        >
          Got it - quiz me on this later <span aria-hidden>▸</span>
        </button>
      )}

      {phase === 'prompt' && (
        <button
          onClick={onReveal}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ink)] py-3.5 font-bold text-white active:scale-[0.99]"
        >
          Reveal <span aria-hidden>▾</span>
        </button>
      )}

      {phase === 'revealed' && (
        <>
          {typed.trim() !== '' && (
            <p
              className={`mt-4 text-center text-sm font-bold ${
                matched ? 'text-[var(--color-green)]' : 'text-[var(--color-here)]'
              }`}
            >
              {matched ? '✓ Your answer matches' : `You typed: ${typed}`}
            </p>
          )}
          <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
            Say it aloud two or three times, then grade yourself honestly.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onGrade(false)}
              className="flex-1 rounded-xl border-2 border-[var(--color-here)] bg-[var(--color-card)] py-3 font-bold text-[var(--color-ink)] active:scale-[0.99]"
            >
              Missed it
            </button>
            <button
              onClick={() => onGrade(true)}
              className="flex-1 rounded-xl bg-[var(--color-accent)] py-3 font-bold text-white active:scale-[0.99]"
            >
              Got it
            </button>
          </div>
        </>
      )}
    </section>
  )
}
