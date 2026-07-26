'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { loadActivity, recordGrade, subscribeActivity, type ActivityLog } from './activity'
import { grade, type ProgressMap } from './leitner'
import { loadProgress, saveProgress, subscribeProgress } from './progress'

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
