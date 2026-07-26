/**
 * Rough speaking time in ms. SpeechSynthesis exposes no duration before speaking,
 * so the beat timer estimates from character count - about 165ms per character at
 * rate 1.0, with a floor so very short lines still get a usable beat.
 */
export function estimateDuration(text: string, rate: number): number {
  return Math.max(1400, (text.length * 165) / rate)
}

/** The speak phase gets more time than the listen phase - repeating is slower. */
export const SPEAK_MULTIPLIER = 1.45
