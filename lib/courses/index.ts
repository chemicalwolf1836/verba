import { BJT_COURSE } from './bjt'
import type { Course } from './types'

export const COURSES: Course[] = [BJT_COURSE]

export const DEFAULT_COURSE_ID = 'bjt'

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id)
}

export * from './types'
