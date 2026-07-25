import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { UnitCard } from './UnitCard'
import type { Unit } from '@/lib/courses'

/**
 * Minimal render harness (no @testing-library/react available offline), matching
 * the pattern used by components/UnitUnlockRing.test.tsx.
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

const unit: Unit = { id: 'w02', index: 2, theme: 'Verb forms' }

describe('UnitCard', () => {
  it('uses the passed unitLabel rather than a hardcoded "Week"', () => {
    const { container, unmount } = render(
      <UnitCard unit={unit} unitLabel="Set" learned={0} total={8} locked={false} />,
    )
    expect(container.textContent).toContain('Set 2 - Verb forms')
    expect(container.textContent).not.toContain('Week')
    unmount()
  })

  it('renders an unlocked unit as a real link to /units/[id], with its learned count', () => {
    const { container, unmount } = render(
      <UnitCard unit={unit} unitLabel="Week" learned={3} total={8} locked={false} />,
    )
    const link = container.querySelector('a')
    expect(link).not.toBeNull()
    expect(link!.getAttribute('href')).toBe('/units/w02')
    expect(container.textContent).toContain('3 of 8 learned')
    unmount()
  })

  it('renders a locked unit with no link at all - not just a disabled-looking one', () => {
    const { container, unmount } = render(
      <UnitCard unit={unit} unitLabel="Week" learned={0} total={8} locked={true} />,
    )
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toContain('Locked - finish the previous week first')
    expect(container.textContent).not.toContain('learned')
    unmount()
  })
})
