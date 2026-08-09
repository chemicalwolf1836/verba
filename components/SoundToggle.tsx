'use client'

import { setMuted } from '@/lib/sound'
import { useSfxMuted } from '@/lib/useProgress'

/**
 * Drawn rather than an emoji. 🔊 renders as a different picture on every
 * platform - full-colour and cartoonish on most - which put the one saturated
 * object on the screen next to hairlines and a single accent. This is one
 * stroke weight in currentColor, so it sits in the same family as the rest of
 * the signage and inherits whatever colour it is placed in.
 *
 * The two states differ in the same way the real thing does: the speaker never
 * moves, the sound leaving it does. Muted keeps the body and crosses out the
 * waves, so the control reads as one object in two states rather than two icons.
 */
export function SoundToggle() {
  const muted = useSfxMuted()

  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* The speaker body, identical in both states. */}
        <path d="M4 9.5v5h3.3L12 18.6V5.4L7.3 9.5H4Z" />
        {muted ? (
          // Crossed out, at the same angle as the body's leading edge.
          <path d="M16.2 9.8 20.4 14M20.4 9.8 16.2 14" />
        ) : (
          // Two arcs, the second lighter - sound falling off with distance.
          <>
            <path d="M15.6 9.9a3.1 3.1 0 0 1 0 4.2" />
            <path d="M18.1 7.6a6.5 6.5 0 0 1 0 8.8" opacity="0.45" />
          </>
        )}
      </svg>
    </button>
  )
}
