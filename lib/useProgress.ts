'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { loadActiveCourseId, saveActiveCourseId, subscribeActiveCourse } from './activeCourse'
import { loadActivity, recordGrade, subscribeActivity, type ActivityLog } from './activity'
import { DEFAULT_COURSE_ID, getCourse, type Course } from './courses'
import { grade, type ProgressMap } from './leitner'
import { loadProgress, saveProgress, subscribeProgress } from './progress'
import { loadMuted, subscribeSound } from './sound'

const EMPTY_PROGRESS: ProgressMap = {}

let progressCache: ProgressMap | null = null

function getProgressSnapshot(): ProgressMap {
  // useSyncExternalStore compares snapshots by reference, so loadProgress cannot be
  // called directly - a fresh object every render would loop forever.
  if (progressCache === null) progressCache = loadProgress()
  return progressCache
}

/** localStorage does not exist during the server render. */
function getServerProgressSnapshot(): ProgressMap {
  return EMPTY_PROGRESS
}

export function useProgress() {
  const progress = useSyncExternalStore(
    (onChange) =>
      subscribeProgress(() => {
        progressCache = loadProgress()
        onChange()
      }),
    getProgressSnapshot,
    getServerProgressSnapshot,
  )

  const gradeCard = useCallback((cardId: string, correct: boolean) => {
    const now = Date.now()
    const current = progressCache ?? loadProgress()
    const next: ProgressMap = { ...current, [cardId]: grade(current[cardId], correct, now) }
    progressCache = next
    saveProgress(next)
    recordGrade(now)
  }, [])

  return { progress, gradeCard }
}

const EMPTY_ACTIVITY: ActivityLog = {}

let activityCache: ActivityLog | null = null

function getActivitySnapshot(): ActivityLog {
  if (activityCache === null) activityCache = loadActivity()
  return activityCache
}

function getServerActivitySnapshot(): ActivityLog {
  return EMPTY_ACTIVITY
}

/**
 * Separate from useProgress because it reads a different store, but a grade
 * recorded via useProgress().gradeCard writes both stores in the same tick -
 * recordGrade notifies subscribeActivity listeners synchronously (not just on
 * the cross-tab `storage` event), so a pace-projection component mounted in the
 * same tab as an active study session stays live without a remount.
 */
export function useActivity(): ActivityLog {
  return useSyncExternalStore(
    (onChange) =>
      subscribeActivity(() => {
        activityCache = loadActivity()
        onChange()
      }),
    getActivitySnapshot,
    getServerActivitySnapshot,
  )
}

/**
 * The active course, reactive to the picker. The snapshot is the course *id* (a
 * stable string, so useSyncExternalStore never loops), resolved to a Course
 * afterwards. Server/first-client render is always the default course, keeping
 * static export hydration-safe; if the stored course differs it settles after
 * mount, exactly like useProgress.
 */
export function useActiveCourse(): { course: Course; courseId: string; setCourse: (id: string) => void } {
  const courseId = useSyncExternalStore(
    subscribeActiveCourse,
    loadActiveCourseId,
    () => DEFAULT_COURSE_ID,
  )
  const course = getCourse(courseId) ?? getCourse(DEFAULT_COURSE_ID)!
  const setCourse = useCallback((id: string) => saveActiveCourseId(id), [])
  return { course, courseId: course.id, setCourse }
}

/**
 * Whether sound is muted, reactive to the toggle. Server/first-client snapshot is
 * `true` (muted) so the static export renders a stable icon before the store read
 * settles after mount - same hydration-safe shape as the other hooks here.
 */
export function useSfxMuted(): boolean {
  return useSyncExternalStore(subscribeSound, loadMuted, () => true)
}
