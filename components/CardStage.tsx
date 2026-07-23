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
      {phase === 'introduce' && (
        <p className="mb-3 text-center text-xs uppercase tracking-widest text-[var(--color-muted)]">
          New word
        </p>
      )}

      <button
        onClick={() => speak(card.jp)}
        aria-label="Play audio"
        className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent)] text-3xl text-white active:scale-95"
      >
        ▶
      </button>

      <div className="mb-5 flex justify-center gap-2">
        <button
          onClick={() => speak(card.jp, { rate: 0.85 })}
          className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm"
        >
          Normal
        </button>
        <button
          onClick={() => speak(card.jp, { rate: 0.5 })}
          className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm"
        >
          Slow
        </button>
      </div>

      {showText ? (
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-6 text-center">
          <p className="text-4xl font-bold">{card.jp}</p>
          <p className="mt-1 text-[var(--color-muted)]">{card.reading}</p>
          <p className="mt-2 text-lg">{card.meaning}</p>
          {card.exampleJp && (
            <div className="mt-4 border-t border-dashed border-[var(--color-line)] pt-4">
              <p className="flex items-center justify-center gap-2">
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
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 text-lg"
          />
        </div>
      )}

      {phase === 'introduce' && (
        <button
          onClick={onContinue}
          className="mt-4 w-full rounded-lg bg-[var(--color-ink)] py-3 font-bold text-[var(--color-card)]"
        >
          Got it - quiz me on this later
        </button>
      )}

      {phase === 'prompt' && (
        <button
          onClick={onReveal}
          className="mt-4 w-full rounded-lg bg-[var(--color-ink)] py-3 font-bold text-[var(--color-card)]"
        >
          Reveal
        </button>
      )}

      {phase === 'revealed' && (
        <>
          {typed.trim() !== '' && (
            <p
              className={`mt-4 text-center text-sm font-bold ${
                matched ? 'text-[var(--color-green)]' : 'text-[var(--color-accent)]'
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
              className="flex-1 rounded-lg bg-orange-100 py-3 font-bold text-orange-900"
            >
              Missed it
            </button>
            <button
              onClick={() => onGrade(true)}
              className="flex-1 rounded-lg bg-green-100 py-3 font-bold text-green-900"
            >
              Got it
            </button>
          </div>
        </>
      )}
    </section>
  )
}
