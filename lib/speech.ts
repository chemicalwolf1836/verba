export type SpeechStatus = 'ready' | 'no-japanese-voice' | 'unsupported'

const isJapanese = (v: SpeechSynthesisVoice) =>
  typeof v.lang === 'string' && v.lang.toLowerCase().replace('_', '-').startsWith('ja')

function japaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  return window.speechSynthesis.getVoices().find(isJapanese) ?? null
}

export function speechStatus(): SpeechStatus {
  if (typeof window === 'undefined' || !window.speechSynthesis) return 'unsupported'
  // getVoices() returns [] on first call in Chrome - voices load asynchronously.
  // Callers must re-check after onVoicesChanged fires before trusting this.
  return japaneseVoice() ? 'ready' : 'no-japanese-voice'
}

export function onVoicesChanged(fn: () => void): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return () => {}
  const synth = window.speechSynthesis
  synth.addEventListener('voiceschanged', fn)
  return () => synth.removeEventListener('voiceschanged', fn)
}

export function cancel(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}

export function speak(text: string, opts?: { rate?: number }): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  // Cancel first, or rapid taps queue utterances and the user hears several cards
  // in sequence.
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = opts?.rate ?? 0.85
  const voice = japaneseVoice()
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}
