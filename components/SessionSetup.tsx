'use client'

import Link from 'next/link'
import { LENGTHS, cardsFor, type SessionConfig, type SessionLength } from '@/lib/session'

type Props = {
  config: SessionConfig
  onChange: (next: SessionConfig) => void
  onStart: () => void
  /** Counts from the *unfiltered* pool, so the toggles show what they would add. */
  newCount: number
  reviewCount: number
  /** Where the new cards would come from, e.g. "Week 5 - Kanji: work". */
  unitTitle: string
}

const ORDER: SessionLength[] = ['short', 'mid', 'long']

const rule = <div aria-hidden className="h-px bg-[var(--color-line)]" />

const sectionLabel = 'sig-label text-[11px] text-[var(--color-muted)]'

export function SessionSetup({
  config, onChange, onStart, newCount, reviewCount, unitTitle,
}: Props) {
  const set = (patch: Partial<SessionConfig>) => onChange({ ...config, ...patch })

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6">
      <Link href="/" className="text-sm font-semibold text-[var(--color-muted)]">
        ‹ Back
      </Link>

      <div className="space-y-1.5">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          How long have you got?
        </h1>
        <p className="text-[var(--color-muted)]">You can stop any time - nothing is lost.</p>
      </div>

      <div className="space-y-2.5">
        <div className="flex gap-2.5">
          {ORDER.map((length) => {
            const on = config.length === length
            return (
              <button
                key={length}
                onClick={() => set({ length })}
                aria-pressed={on}
                className={`flex-1 rounded-xl bg-[var(--color-card)] py-3.5 text-center font-extrabold ${
                  on
                    ? 'border-2 border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'border border-[var(--color-line)]'
                }`}
              >
                {LENGTHS[length].minutes} min
              </button>
            )
          })}
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          About {cardsFor(config.length)} words at your usual pace.
        </p>
      </div>

      {rule}

      <div className="space-y-4">
        <p className={sectionLabel}>What&rsquo;s in the queue</p>
        <QueueToggle
          count={newCount}
          title="New words"
          sub={unitTitle}
          on={config.includeNew}
          onToggle={() => set({ includeNew: !config.includeNew })}
        />
        <QueueToggle
          count={reviewCount}
          title="Reviews"
          sub="Weakest first"
          on={config.includeReviews}
          onToggle={() => set({ includeReviews: !config.includeReviews })}
        />
        {!config.includeNew && !config.includeReviews && (
          // Both off has to mean *something*. lib/session falls back to the full
          // pool rather than serving an empty session; say so instead of letting
          // the learner discover it.
          <p className="text-sm text-[var(--color-here)]">
            With both off there is nothing to draw from, so the session falls back to
            everything unlocked.
          </p>
        )}
      </div>

      {rule}

      <div className="space-y-3">
        <p className={sectionLabel}>Answer with</p>
        <div className="flex gap-2.5">
          {([
            ['voice', 'Voice only'],
            ['typing', 'Voice + typing'],
          ] as const).map(([mode, label]) => {
            const on = config.answerMode === mode
            return (
              <button
                key={mode}
                onClick={() => set({ answerMode: mode })}
                aria-pressed={on}
                className={`flex-1 rounded-xl bg-[var(--color-card)] py-3 text-center text-sm font-extrabold ${
                  on
                    ? 'border-2 border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'border border-[var(--color-line)]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <button
          onClick={onStart}
          className="w-full rounded-2xl bg-[var(--color-accent)] py-4 text-center text-lg font-extrabold text-white active:scale-[0.99]"
        >
          Start
        </button>
        <p className="text-center text-xs text-[var(--color-muted)]">
          Remembers your choice next time
        </p>
      </div>
    </main>
  )
}

function QueueToggle({
  count, title, sub, on, onToggle,
}: {
  count: number
  title: string
  sub: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className="flex w-full items-center gap-3 text-left"
    >
      <span className="w-11 shrink-0 text-xl font-extrabold tabular-nums">{count}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block truncate text-sm text-[var(--color-muted)]">{sub}</span>
      </span>
      <span
        aria-hidden
        className={`flex h-[26px] w-[46px] shrink-0 items-center rounded-full p-[3px] transition-colors ${
          on
            ? 'justify-end bg-[var(--color-accent)]'
            : 'justify-start bg-[var(--color-line)]'
        }`}
      >
        <span className="h-5 w-5 rounded-full bg-white" />
      </span>
    </button>
  )
}
