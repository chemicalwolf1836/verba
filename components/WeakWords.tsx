'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { type Card } from '@/lib/courses'
import { WEAK_COUNT, weakestCards } from '@/lib/goals'
import { unlockedCards } from '@/lib/leitner'
import { useActiveCourse, useProgress } from '@/lib/useProgress'

export function WeakWords() {
  const { course } = useActiveCourse()
  const { progress } = useProgress()
  const [cards, setCards] = useState<Card[] | null>(null)

  useEffect(() => {
    setCards(weakestCards(unlockedCards(course, progress), progress, WEAK_COUNT))
  }, [course, progress])

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-4">
      <div className="sig-label text-xs text-[var(--color-muted)]">Words to shore up</div>
      {cards && cards.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Nothing to shore up right now - keep studying.
        </p>
      ) : (
        // A shared grid rather than a flex row per line, so the hairline rules land
        // on the same two axes down the whole list - a timetable column, not a mark
        // that drifts with each word's length.
        <ul className="mt-2 grid grid-cols-[auto_1px_auto_1px_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1 text-sm">
          {(cards ?? []).map((c) => (
            <li key={c.id} className="contents">
              <span className="jp font-bold">{c.jp}</span>
              <span aria-hidden className="h-3.5 w-px self-center bg-[var(--color-line)]" />
              <span className="text-[var(--color-muted)]">{c.reading}</span>
              <span aria-hidden className="h-3.5 w-px self-center bg-[var(--color-line)]" />
              <span className="truncate">{c.meaning}</span>
            </li>
          ))}
        </ul>
      )}
      {(!cards || cards.length > 0) && (
        <Link
          href="/study?mode=weak"
          className="mt-3 block rounded-lg bg-[var(--color-accent-deep)] py-2 text-center text-sm font-bold text-white"
        >
          Drill these ▸
        </Link>
      )}
    </div>
  )
}
