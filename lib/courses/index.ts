import { BJT_COURSE } from './bjt'
import type { Course, Unit } from './types'

export const COURSES: Course[] = [BJT_COURSE]

export const DEFAULT_COURSE_ID = 'bjt'

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id)
}

/** Every unit across every registered course - what the static route enumerates. */
export function allUnits(): { courseId: string; unitId: string }[] {
  return COURSES.flatMap((c) => c.units.map((u) => ({ courseId: c.id, unitId: u.id })))
}

/**
 * Resolve a globally-unique unit id back to its course and unit. The drill route
 * is keyed by the URL, not by the active course, so a link to another course's
 * unit still resolves correctly.
 */
export function findUnit(unitId: string): { course: Course; unit: Unit } | undefined {
  for (const course of COURSES) {
    const unit = course.units.find((u) => u.id === unitId)
    if (unit) return { course, unit }
  }
  return undefined
}

export * from './types'
