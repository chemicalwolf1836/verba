import { BJT_COURSE } from './bjt'
import type { Course, Unit } from './types'

export const COURSES: Course[] = [BJT_COURSE]

export const DEFAULT_COURSE_ID = 'bjt'

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id)
}

/**
 * The course name as the station board should show it, with a leading course
 * code dropped.
 *
 * The board puts the code in the roundel and the name beside it, so
 * "BJT - Business Japanese" renders as "BJT | BJT - BUSINESS JAPANESE". On a
 * phone that repetition is not just noise - it is 44px of the 343 available,
 * which is what pushed the real name into an ellipsis.
 *
 * Only strips a prefix that actually matches this course's own code, so a name
 * that happens to begin with other words is left alone.
 */
export function boardName(course: Pick<Course, 'code' | 'name'>): string {
  const code = course.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return course.name.replace(new RegExp(`^${code}\\s*[-–—:·]\\s*`, 'i'), '')
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
