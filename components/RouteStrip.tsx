'use client'

import { useEffect, useState } from 'react'
import { currentUnitGoal } from '@/lib/goals'
import { unlockedUnits } from '@/lib/leitner'
import { useActiveCourse, useProgress } from '@/lib/useProgress'

export function RouteStrip() {
  const { course } = useActiveCourse()
  const { progress } = useProgress()
  const [state, setState] = useState<{ openCount: number; hereIndex: number } | null>(null)

  useEffect(() => {
    const open = unlockedUnits(course, progress)
    const here = currentUnitGoal(course, progress)?.unit.index ?? open.length
    setState({ openCount: open.length, hereIndex: here })
  }, [course, progress])

  const units = [...course.units].sort((a, b) => a.index - b.index)
  const here = state?.hereIndex ?? 0
  const open = state?.openCount ?? 0

  return (
    <div className="mt-2 flex items-center gap-[3px]" aria-hidden="true">
      {units.map((u, i) => {
        const dot =
          u.index === here
            ? 'bg-[var(--color-here)]'
            : u.index < here
              ? 'bg-[var(--color-accent)]'
              : 'bg-[var(--color-line)]'
        return (
          <span key={u.id} className="flex flex-1 items-center gap-[3px]">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            {i < units.length - 1 && (
              <span
                className={`seg flex-1 ${u.index < open ? '' : 'pending'}`}
              />
            )}
          </span>
        )
      })}
    </div>
  )
}
