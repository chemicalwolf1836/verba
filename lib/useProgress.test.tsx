import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/**
 * Minimal renderHook harness (no @testing-library/react available offline).
 * Mounts a real component into jsdom via createRoot so useSyncExternalStore's
 * subscribe/unsubscribe effects actually run, exercising the real subscribe path
 * rather than hand-firing events.
 */
function renderHook<T>(useHook: () => T) {
  const container = document.createElement('div')
  const root = createRoot(container)
  const result = { current: undefined as unknown as T }

  function TestComponent() {
    result.current = useHook()
    return null
  }

  act(() => {
    root.render(<TestComponent />)
  })

  return {
    result,
    rerender: () => act(() => root.render(<TestComponent />)),
    unmount: () => act(() => root.unmount()),
  }
}

beforeEach(() => {
  localStorage.clear()
  // useProgress.ts keeps its snapshot cache at module scope (matching the brief's
  // design), which is correct in a real page load but leaks across test cases
  // sharing one module registry. Reset the registry so each test gets a fresh
  // cache, same as a fresh page load would.
  vi.resetModules()
})

describe('useProgress', () => {
  it('starts empty when nothing is stored', async () => {
    const { useProgress } = await import('./useProgress')
    const { result, unmount } = renderHook(() => useProgress())
    expect(result.current.progress).toEqual({})
    unmount()
  })

  it('does not return a new empty reference on every render (stable snapshot)', async () => {
    const { useProgress } = await import('./useProgress')
    const { result, rerender, unmount } = renderHook(() => useProgress())
    const first = result.current.progress
    rerender()
    rerender()
    expect(result.current.progress).toBe(first)
    unmount()
  })

  it('updates progress reactively after gradeCard, without a manual reload', async () => {
    const { useProgress } = await import('./useProgress')
    const { result, unmount } = renderHook(() => useProgress())
    act(() => {
      result.current.gradeCard('card-1', true)
    })
    expect(result.current.progress['card-1']).toMatchObject({ box: 2, seen: 1, correct: 1 })
    unmount()
  })

  it('persists the grade to localStorage, not just in-memory state', async () => {
    const { useProgress } = await import('./useProgress')
    const { result, unmount } = renderHook(() => useProgress())
    act(() => {
      result.current.gradeCard('card-1', true)
    })
    unmount()

    vi.resetModules()
    const { loadProgress } = await import('./progress')
    expect(loadProgress()['card-1']).toMatchObject({ box: 2 })
  })

  it('notifies a second same-tab consumer when the first grades a card', async () => {
    const { useProgress } = await import('./useProgress')
    const a = renderHook(() => useProgress())
    const b = renderHook(() => useProgress())
    act(() => {
      a.result.current.gradeCard('card-1', true)
    })
    expect(b.result.current.progress['card-1']).toMatchObject({ box: 2 })
    a.unmount()
    b.unmount()
  })
})

describe('useActivity', () => {
  it('starts empty when nothing is stored', async () => {
    const { useActivity } = await import('./useProgress')
    const { result, unmount } = renderHook(() => useActivity())
    expect(result.current).toEqual({})
    unmount()
  })

  it('updates same-tab the moment a grade is recorded elsewhere in the tab (the storage event alone would not fire here)', async () => {
    const { useProgress, useActivity } = await import('./useProgress')
    const progressHook = renderHook(() => useProgress())
    const activityHook = renderHook(() => useActivity())

    act(() => {
      progressHook.result.current.gradeCard('card-1', true)
    })

    const today = new Date().toISOString().slice(0, 10)
    expect(activityHook.result.current[today]).toBe(1)

    progressHook.unmount()
    activityHook.unmount()
  })
})
