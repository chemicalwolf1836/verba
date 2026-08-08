'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { type Card } from '@/lib/courses'
import { WEAK_COUNT, weakestCards } from '@/lib/goals'
import { unlockedCards, type ProgressMap } from '@/lib/leitner'
import { useActiveCourse, useProgress } from '@/lib/useProgress'

/** How many rows the dashboard shows before deferring to the drill itself. */
const VISIBLE = 5

/**
 * Five segments, one per Leitner box, filled up to where the card currently sits.
 * Amber below the learned line and teal above it, so a glance separates "not
 * landed yet" from "solid but not finished".
 */
export function BoxBars({ box }: { box: number }) {
  return (
    <span aria-label={`Box ${box} of 5`} className="flex shrink-0 gap-[3px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-1 w-[17px] rounded-sm ${
            i > box
              ? 'bg-[var(--color-line)]'
              : box < 2
                ? 'bg-[var(--color-here)]'
                : 'bg-[var(--color-accent)]'
          }`}
        />
      ))}
    </span>
  )
}

export function WeakWords() {
  const { course } = useActiveCourse()
  const { progress } = useProgress()
  const [cards, setCards] = useState<Card[] | null>(null)

  useEffect(() => {
    setCards(weakestCards(unlockedCards(course, progress), progress, WEAK_COUNT))
  }, [course, progress])

  const empty = cards !== null && cards.length === 0

  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-sm font-bold">Slipping</h2>
        {!empty && (
          <Link
            href="/study?mode=weak"
            className="ml-auto text-sm font-bold text-[var(--color-accent)]"
          >
            Drill all ▸
          </Link>
        )}
      </div>

      {empty ? (
        <p className="text-sm text-[var(--color-muted)]">
          Nothing is slipping right now - keep studying.
        </p>
      ) : (
        // A shared grid rather than a flex row per line, so the hairline rules land
        // on the same two axes down the whole list - a timetable column, not a mark
        // that drifts with each word's length.
        <ul className="grid grid-cols-[auto_1px_auto_1px_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5 text-sm">
          {(cards ?? []).slice(0, VISIBLE).map((c) => (
            <li key={c.id} className="contents">
              <span className="jp font-bold">{c.jp}</span>
              <span aria-hidden className="h-3.5 w-px self-center bg-[var(--color-line)]" />
              <span className="text-[var(--color-muted)]">{c.reading}</span>
              <span aria-hidden className="h-3.5 w-px self-center bg-[var(--color-line)]" />
              <span className="truncate">{c.meaning}</span>
              <BoxBars box={boxOf(progress, c.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const boxOf = (progress: ProgressMap, id: string) => progress[id]?.box ?? 1
