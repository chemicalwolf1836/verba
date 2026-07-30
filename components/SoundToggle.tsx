'use client'

import { setMuted } from '@/lib/sound'
import { useSfxMuted } from '@/lib/useProgress'

export function SoundToggle() {
  const muted = useSfxMuted()
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      className="text-base leading-none text-[var(--color-muted)]"
    >
      <span aria-hidden>{muted ? '🔇' : '🔊'}</span>
    </button>
  )
}
