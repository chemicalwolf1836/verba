import { COURSES, DEFAULT_COURSE_ID } from './courses'

/** Which course the user is studying. Not course-prefixed - it names the course. */
export const COURSE_KEY = 'trainer.course'

const listeners = new Set<() => void>()

function isKnownCourse(id: string): boolean {
  return COURSES.some((c) => c.id === id)
}

/**
 * The stored course id, or the default. Falls back to the default if the stored
 * id names a course that no longer exists (e.g. a course was removed after the
 * user last picked it), so a stale value can never leave the app with no course.
 */
export function loadActiveCourseId(): string {
  if (typeof window === 'undefined') return DEFAULT_COURSE_ID
  try {
    const raw = window.localStorage.getItem(COURSE_KEY)
    if (raw && isKnownCourse(raw)) return raw
  } catch {
    // Ignore a read failure and fall through to the default.
  }
  return DEFAULT_COURSE_ID
}

export function saveActiveCourseId(id: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(COURSE_KEY, id)
    // Notify only after a successful write, matching the progress/activity stores.
    listeners.forEach((fn) => fn())
  } catch {
    // Quota or private-mode failure. The session continues on the current course.
  }
}

export function subscribeActiveCourse(fn: () => void): () => void {
  listeners.add(fn)
  if (typeof window !== 'undefined') window.addEventListener('storage', fn)
  return () => {
    listeners.delete(fn)
    if (typeof window !== 'undefined') window.removeEventListener('storage', fn)
  }
}
