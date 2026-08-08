'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RouteStrip } from '@/components/RouteStrip'
import type { Card } from '@/lib/courses'
import type { UnitGoal } from '@/lib/goals'

type Props = {
  tally: { studied: number; got: number; missed: number }
  /** Cards graded wrong this session, in the order they were missed. */
  shaky: Card[]
  /** Epoch ms the sitting began. 0 means it was never started. */
  startedAt: number
  goal: UnitGoal | null
  unitLabel: string
  /** False when the queue itself ran dry - there is nothing to resume into. */
  canResume: boolean
  onResume: () => void
  onAgain: () => void
}

const pct = (n: number, d: number) => `${d > 0 ? Math.round((n / d) * 100) : 0}%`

/** Rounded up to a whole minute, floored at one - "0 minutes" reads as a bug
 *  even when the sitting genuinely was that quick. */
const minutes = (ms: number) => Math.max(1, Math.round(ms / 60000))

export function SessionSummary({
  tally, shaky, startedAt, goal, unitLabel, canResume, onResume, onAgain,
}: Props) {
  const { studied, got, missed } = tally
  // Stamped once, on mount. Reading the clock during render would let the
  // reported duration creep upward every time this screen re-rendered.
  const [endedAt] = useState(() => Date.now())
  const mins = minutes(startedAt === 0 ? 0 : endedAt - startedAt)

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <div className="space-y-2">
        <p className="sig-label text-xs text-[var(--color-muted)]">
          {mins} {mins === 1 ? 'minute' : 'minutes'}
        </p>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          You got {got} of {studied}.
        </h1>
        <p className="leading-relaxed text-[var(--color-muted)]">
          {missed === 0
            ? 'Clean run. Everything moved up a box.'
            : `${missed} ${missed === 1 ? 'word came' : 'words came'} back shaky - they go first next time.`}
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="flex h-2 overflow-hidden rounded-full bg-[var(--color-line)]">
          <span style={{ width: pct(got, studied) }} className="bg-[var(--color-green)]" />
          <span style={{ width: pct(missed, studied) }} className="bg-[var(--color-here)]" />
        </div>
        <div className="flex gap-4 text-sm text-[var(--color-muted)]">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-[var(--color-green)]" />
            {got} recalled
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-[var(--color-here)]" />
            {missed} to revisit
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="sig-label text-[11px] text-[var(--color-muted)]">
          {shaky.length > 0 ? 'Shaky' : 'Nothing shaky'}
        </p>
        {shaky.length > 0 && (
          <ul className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1.5">
            {shaky.map((card) => (
              <li key={card.id} className="contents">
                <span className="jp text-xl font-bold">{card.jp}</span>
                <span className="text-sm text-[var(--color-muted)]">{card.meaning}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div aria-hidden className="h-px bg-[var(--color-line)]" />

      <div className="space-y-2.5">
        <RouteStrip />
        <p className="text-[var(--color-muted)]">
          {goal === null
            ? 'Every station on the line is open.'
            : goal.toUnlock > 0
              ? `${goal.toUnlock} more and ${unitLabel} ${goal.nextUnit?.index ?? goal.unit.index + 1}${
                  goal.nextUnit ? ` - ${goal.nextUnit.theme}` : ''
                } opens.`
              : `${unitLabel} ${goal.unit.index} - ${goal.unit.theme} is open.`}
        </p>
      </div>

      <div className="mt-2 space-y-2.5">
        <button
          onClick={canResume ? onResume : onAgain}
          className="w-full rounded-2xl bg-[var(--color-accent)] py-4 text-lg font-extrabold text-white active:scale-[0.99]"
        >
          {canResume ? 'Keep going' : 'Another round'}
        </button>
        <Link
          href="/"
          className="block w-full py-1.5 text-center font-bold text-[var(--color-muted)]"
        >
          That&rsquo;s enough for today
        </Link>
      </div>
    </main>
  )
}
