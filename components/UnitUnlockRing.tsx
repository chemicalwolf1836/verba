import type { UnitGoal } from '@/lib/goals'

export function UnitUnlockRing({
  goal,
  unitLabel,
}: {
  goal: UnitGoal
  unitLabel: string
}) {
  const pips = Array.from({ length: goal.total }, (_, i) => i < goal.learned)

  // Counted against the unlock point, never the unit total. At 5 of 8 with a
  // threshold of 6 this reads "1 more", not "3 more" - otherwise the goal looks
  // further away than it is, which defeats the purpose of showing it.
  const caption =
    goal.toUnlock > 0 && goal.nextUnit
      ? `${goal.toUnlock} more to unlock ${unitLabel} ${goal.nextUnit.index}`
      : `${goal.total - goal.learned} words left in ${unitLabel} ${goal.unit.index}`

  return (
    <div className="mb-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-4">
      <p className="text-sm font-bold">
        {unitLabel} {goal.unit.index} - {goal.unit.theme}
      </p>
      <div className="mt-2 flex items-center gap-1" aria-hidden>
        {pips.map((filled, i) => (
          <span
            key={i}
            className={`h-2 w-full rounded-full ${
              filled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-line)]'
            } ${i + 1 === goal.unlockAt ? 'ring-2 ring-[var(--color-ink)]' : ''}`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {goal.learned} of {goal.total} learned · {caption}
      </p>
    </div>
  )
}
