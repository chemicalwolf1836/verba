'use client'

import { useEffect, useState } from 'react'
import { speak, speechStatus, onVoicesChanged, type SpeechStatus } from '@/lib/speech'

const CARD = {
  jp: '会議',
  reading: 'かいぎ',
  meaning: 'meeting',
  exampleJp: '会議は十時に始まります',
  exampleEn: 'The meeting begins at ten',
}

export default function StudyPage() {
  const [status, setStatus] = useState<SpeechStatus>('unsupported')
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setStatus(speechStatus())
    return onVoicesChanged(() => setStatus(speechStatus()))
  }, [])

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      {status === 'no-japanese-voice' && (
        <p className="mb-4 rounded-lg bg-orange-100 p-3 text-sm text-orange-900">
          No Japanese voice is installed on this device, so audio will be read with an
          English voice. Add a Japanese voice in your system settings.
        </p>
      )}

      <button
        onClick={() => speak(CARD.jp)}
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent)] text-3xl text-white"
        aria-label="Play audio"
      >
        ▶
      </button>

      {revealed ? (
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-6 text-center">
          <p className="text-4xl font-bold">{CARD.jp}</p>
          <p className="mt-1 text-[var(--color-muted)]">{CARD.reading}</p>
          <p className="mt-2 text-lg">{CARD.meaning}</p>
          <p className="mt-4 border-t border-dashed border-[var(--color-line)] pt-4">
            {CARD.exampleJp}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{CARD.exampleEn}</p>
        </div>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="w-full rounded-lg bg-[var(--color-ink)] py-3 font-bold text-[var(--color-card)]"
        >
          Reveal
        </button>
      )}
    </main>
  )
}
