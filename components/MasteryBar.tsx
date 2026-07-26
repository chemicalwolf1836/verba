'use client'

import { dailyRate, projectDays } from '@/lib/activity'
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'
import { boxDistribution, masteredCount, notLearnedCount } from '@/lib/goals'
import { useActivity, useProgress } from '@/lib/useProgress'

const SHADES = [
  'bg-[var(--color-line)]',
  'bg-amber-300',
  'bg-amber-500',
  'bg-[var(--color-accent)]',
  'bg-[var(--color-green)]',
]

export function MasteryBar() {
  const course = getCourse(DEFAULT_COURSE_ID)!
  const { progress } = useProgress()
  const activity = useActivity()

  const dist = boxDistribution(course.cards, progress)
  const mastered = masteredCount(course.cards, progress)
  const total = course.cards.length
  const pct = Math.round((mastered / total) * 100)

  // useActivity's server snapshot is empty, same as useProgress's, so this is
  // null on the server and on the first client render regardless of Date.now -
  // only after useSyncExternalStore swaps in the real client snapshot (post
  // hydration) can activity be non-empty and a projection appear. No manual
  // useEffect needed to dodge a hydration mismatch.
  const remaining = notLearnedCount(course.cards, progress)
  const projection = projectDays(remaining, dailyRate(activity, Date.now()))

  return (
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-4">
      <p className="text-sm font-bold">Course progress - {course.name}</p>

      <div className="mt-3 flex h-3 overflow-hidden rounded-full" aria-hidden>
        {[4, 3, 2, 1, 0].map((box) => (
          <span
            key={box}
            className={SHADES[box]}
            style={{ width: `${(dist[box] / total) * 100}%` }}
          />
        ))}
      </div>

      <p className="mt-3 text-sm">
        {mastered} of {total} words mastered - {pct}%
      </p>
      {projection !== null && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          About {Math.ceil(projection / 7)} weeks at your recent pace
        </p>
      )}
    </section>
  )
}
