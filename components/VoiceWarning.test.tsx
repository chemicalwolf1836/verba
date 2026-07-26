import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { VoiceWarning } from './VoiceWarning'

/**
 * Minimal render harness (no @testing-library/react available offline), matching
 * the pattern used by MasteryBar.test.tsx / UnitUnlockRing.test.tsx.
 */
function render(node: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(node)
  })
  return {
    container,
    unmount: () => act(() => root.unmount()),
  }
}

describe('VoiceWarning', () => {
  it('announces the banner to assistive tech via role="alert" (jsdom has no speechSynthesis, so status is "unsupported")', () => {
    const { container, unmount } = render(<VoiceWarning />)

    const alert = container.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert!.getAttribute('aria-live')).toBe('assertive')
    expect(alert!.textContent).toContain('no speech support')

    unmount()
  })
})
