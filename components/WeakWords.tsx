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
        <ul className="mt-2 space-y-1">
          {(cards ?? []).map((c) => (
            <li key={c.id} className="flex items-baseline gap-2 text-sm">
              <span className="jp min-w-6 font-bold">{c.jp}</span>
              <span className="text-[var(--color-muted)]">{c.reading}</span>
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
