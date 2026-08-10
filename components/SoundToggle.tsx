'use client'

import { setMuted } from '@/lib/sound'
import { useSfxMuted } from '@/lib/useProgress'

/**
 * A segmented pair rather than one button that swaps icon.
 *
 * A single speaker glyph cannot say which state it is in: a crossed-out speaker
 * reads equally as "sound is off" and "press to turn sound off". Showing both
 * options and lighting the active one removes the guess - the same reason the
 * session setup shows 3 / 7 / 15 together instead of cycling one number.
 *
 * Borrowed wholesale from those controls, so this is not a new pattern.
 */
export function SoundToggle() {
  const muted = useSfxMuted()

  return (
    // Named for screen readers, because "sounds" alone overstates the scope:
    // this silences the grading chimes, never the Japanese audio.
    <span
      role="group"
      aria-label="Sound effects"
      className="inline-flex gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-card)] p-[3px]"
    >
      <Segment on selected={!muted} onSelect={() => setMuted(false)} />
      <Segment on={false} selected={muted} onSelect={() => setMuted(true)} />
    </span>
  )
}

function Segment({
  on, selected, onSelect,
}: {
  on: boolean
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={on ? 'Sound effects on' : 'Sound effects off'}
      // The drawn segment is 40x28, which is fine to look at and too small to
      // hit: a thumb that misses does not do nothing here, it silently flips a
      // setting. The pseudo-element grows the touch area to 44 tall without
      // changing the layout. Vertical only - the two segments are contiguous, so
      // widening them would just overlap each other's targets.
      className={`relative rounded-full px-[11px] py-[5px] leading-none after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] ${
        selected
          ? 'bg-[var(--color-ink)] text-[var(--color-card)]'
          : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
      }`}
    >
      <Speaker on={on} />
    </button>
  )
}

/** One stroke weight in currentColor, so it inherits whatever it sits in. The
 *  body never moves between states - only the sound leaving it changes. */
function Speaker({ on }: { on: boolean }) {
  return (
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
      <path d="M4 9.5v5h3.3L12 18.6V5.4L7.3 9.5H4Z" />
      {on ? (
        <>
          <path d="M15.6 9.9a3.1 3.1 0 0 1 0 4.2" />
          <path d="M18.1 7.6a6.5 6.5 0 0 1 0 8.8" opacity="0.45" />
        </>
      ) : (
        <path d="M16.2 9.8 20.4 14M20.4 9.8 16.2 14" />
      )}
    </svg>
  )
}
