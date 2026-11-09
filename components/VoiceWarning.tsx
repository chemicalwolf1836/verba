'use client'

import { useEffect, useState } from 'react'
import { onVoicesChanged, speechStatus, type SpeechStatus } from '@/lib/speech'

/**
 * Remembered for the browser session, not for good. Once is enough to read it
 * on the way in, but a learner who never adds a voice should hear about it again
 * next time rather than drill on wrong audio indefinitely.
 */
const DISMISS_KEY = 'trainer.voiceWarning.dismissed'

export function VoiceWarning() {
  const [status, setStatus] = useState<SpeechStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      // Storage can be blocked (private mode); the notice just stays dismissible.
    }
    setStatus(speechStatus())
    return onVoicesChanged(() => setStatus(speechStatus()))
  }, [])

  if (status === null || status === 'ready' || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {}
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 rounded-xl border-l-4 border-[var(--color-here)] bg-[var(--color-card)] py-2.5 pl-3 pr-1.5 text-sm"
    >
      <p className="min-w-0 flex-1 leading-snug">
        {status === 'unsupported' ? (
          'This browser has no speech support, so cards are text only.'
        ) : (
          <>
            <b>No Japanese voice on this device</b>, so audio will sound wrong.{' '}
            <span className="text-[var(--color-muted)]">
              Add one in your device&rsquo;s language or speech settings.
            </span>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-my-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg leading-none text-[var(--color-muted)] hover:text-[var(--color-ink)]"
      >
        ×
      </button>
    </div>
  )
}
