import { loadMuted } from './sound'

type SfxName = 'correct' | 'incorrect' | 'reveal' | 'unlock'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    try {
      ctx = new AC()
    } catch {
      return null
    }
  }
  return ctx
}

// One marimba-ish note: fast attack, short exponential decay. Triangle waves read
// as warm/wooden rather than the harsh buzz of a square wave.
function tone(c: AudioContext, freq: number, at: number, dur: number, gain: number): void {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'triangle'
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(g).connect(c.destination)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

// Warm, quiet, station-melody-flavoured. Frequencies/durations are tuning values -
// adjust after listening. correct = rising G5->C6; incorrect = low soft G3;
// reveal = a light high tick; unlock = a C-E-G arrival arpeggio.
const VOICES: Record<SfxName, (c: AudioContext, t: number) => void> = {
  correct: (c, t) => {
    tone(c, 784, t, 0.12, 0.14)
    tone(c, 1047, t + 0.09, 0.16, 0.14)
  },
  incorrect: (c, t) => {
    tone(c, 196, t, 0.22, 0.09)
  },
  reveal: (c, t) => {
    tone(c, 1175, t, 0.06, 0.06)
  },
  unlock: (c, t) => {
    tone(c, 523, t, 0.12, 0.13)
    tone(c, 659, t + 0.08, 0.12, 0.13)
    tone(c, 784, t + 0.16, 0.2, 0.13)
  },
}

/** Play a short synthesized effect. No-op when muted, unsupported, or server-side.
 *  Never throws - a study session must not break over a blip. */
export function playSfx(name: SfxName): void {
  if (loadMuted()) return
  const c = audio()
  if (!c) return
  try {
    // iOS starts the context suspended; resume it inside the triggering gesture.
    if (c.state === 'suspended') c.resume().catch(() => {})
    VOICES[name](c, c.currentTime)
  } catch {
    // Swallow any Web Audio failure.
  }
}
