/**
 * Timings for motion that JavaScript has to wait on.
 *
 * `globals.css` already collapses every CSS animation to .001ms under
 * prefers-reduced-motion, but a `setTimeout` knows nothing about that. Without
 * `motionDuration`, someone who has asked their system for less movement would
 * get the delay *and* no animation - strictly worse than either alone. So every
 * JS timer that exists only to let an animation finish must be routed through it.
 */

/** How long a graded card takes to leave. Matches the CSS animation. */
export const CARD_LEAVE_MS = 260

/** How long the station-arrival flourish runs before it is cleared. */
export const STATION_ARRIVE_MS = 900

const REDUCED = '(prefers-reduced-motion: reduce)'

/** The given duration, or 0 when the user has asked for reduced motion. */
export function motionDuration(ms: number): number {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return ms
  try {
    return window.matchMedia(REDUCED).matches ? 0 : ms
  } catch {
    // Some environments expose matchMedia but throw on unknown features.
    return ms
  }
}
