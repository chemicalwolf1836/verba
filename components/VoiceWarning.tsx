'use client'

import { useEffect, useState } from 'react'
import { onVoicesChanged, speechStatus, type SpeechStatus } from '@/lib/speech'

export function VoiceWarning() {
  const [status, setStatus] = useState<SpeechStatus | null>(null)

  useEffect(() => {
    setStatus(speechStatus())
    return onVoicesChanged(() => setStatus(speechStatus()))
  }, [])

  if (status === null || status === 'ready') return null

  return (
    <p
      role="alert"
      aria-live="assertive"
      className="mb-4 rounded-lg bg-orange-100 p-3 text-sm text-orange-900"
    >
      {status === 'unsupported'
        ? 'This browser has no speech support, so cards are text only.'
        : 'No Japanese voice is installed, so audio uses an English voice and will sound wrong. Add a Japanese voice in your device settings.'}
    </p>
  )
}
