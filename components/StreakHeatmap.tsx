'use client'

import { useEffect, useState } from 'react'
import { heatmapCells, studyStreak, totalStudyDays, type HeatCell } from '@/lib/activity'
import { useActivity } from '@/lib/useProgress'

const WEEKS = 13

// Stable server/first-client render: 91 empty cells, no clock read. The real
// view is computed post-mount so static-export hydration never mismatches.
const EMPTY_CELLS: HeatCell[] = Array.from({ length: WEEKS * 7 }, () => ({
  date: '',
  count: 0,
  level: 0,
}))

const FILL = ['bg-[var(--color-line)]', 'bg-[#bfe4e8]', 'bg-[#6cc3cc]', 'bg-[var(--color-accent)]']

export function StreakHeatmap() {
  const log = useActivity()
  const [view, setView] = useState<{ streak: number; total: number; cells: HeatCell[] } | null>(
    null,
  )

  useEffect(() => {
    const now = Date.now()
    setView({
      streak: studyStreak(log, now),
      total: totalStudyDays(log),
      cells: heatmapCells(log, now, WEEKS),
    })
  }, [log])

  const cells = view?.cells ?? EMPTY_CELLS

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-4">
      <div className="flex items-baseline justify-between">
        <span className="sig-label text-xs text-[var(--color-muted)]">Streak</span>
        <span className="text-sm text-[var(--color-muted)]">
          {view ? `${view.total} days studied` : ''}
        </span>
      </div>
      <p className="mt-1 text-lg font-bold">
        {view && view.streak > 0 ? `${view.streak}-day streak` : 'Study today to start a streak'}
      </p>
      <div
        className="mt-3 grid grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: 'repeat(7, 12px)' }}
      >
        {cells.map((c, i) => (
          <span
            key={c.date || i}
            data-cell
            title={c.date ? `${c.date}: ${c.count}` : undefined}
            className={`w-3 rounded-[2px] ${FILL[c.level]}`}
          />
        ))}
      </div>
    </div>
  )
}
