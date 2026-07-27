'use client'

import { COURSES } from '@/lib/courses'
import { useActiveCourse } from '@/lib/useProgress'

/**
 * Lets the user switch courses. Renders nothing while only one course is
 * registered - there is nothing to pick - so it stays invisible until a second
 * language or test is added, then appears with no other change.
 */
export function CoursePicker() {
  const { courseId, setCourse } = useActiveCourse()

  if (COURSES.length <= 1) return null

  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3">
      <span className="sig-label text-xs text-[var(--color-muted)]">Line</span>
      <select
        value={courseId}
        onChange={(e) => setCourse(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-right font-semibold outline-none"
        aria-label="Choose course"
      >
        {COURSES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  )
}
