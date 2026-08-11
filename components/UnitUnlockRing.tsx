import type { UnitGoal } from '@/lib/goals'
import { lineColor } from '@/lib/lineColors'

export function UnitUnlockRing({
  goal,
  unitLabel,
  arriving = false,
}: {
  goal: UnitGoal
  unitLabel: string
  /** True briefly after a station opens. Draws the line into the new stop and
   *  rings its roundel, so the unlock chime has something to land on. */
  arriving?: boolean
}) {
  // Counted against the unlock point, never the unit total. At 5 of 8 with a
  // threshold of 6 this reads "1 more", not "3 more" - otherwise the goal looks
  // further away than it is, which defeats the purpose of showing it.
  const caption =
    goal.toUnlock > 0 && goal.nextUnit
      ? `${goal.toUnlock} more to unlock ${unitLabel} ${goal.nextUnit.index}`
      : `${goal.total - goal.learned} words left in ${unitLabel} ${goal.unit.index}`

  const color = lineColor(goal.unit.index)
  const stations = Array.from({ length: goal.total }, (_, i) => i)

  return (
    <div
      className={`mb-4 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] ${
        arriving ? 'station-arrive' : ''
      }`}
    >
      <div className="board rounded-none">
        <span className="roundel on-board" style={{ ['--rd' as string]: color }}>
          {goal.unit.index}
        </span>
        <span className="lab truncate">
          {unitLabel} {goal.unit.index} - {goal.unit.theme}
        </span>
      </div>

      {/* This unit is a short line; each card is a station. You have reached the
          amber marker; the flagged station is the unlock point for the next line. */}
      <div className="station-line flex items-center px-4 pt-4" aria-hidden>
        {stations.map((i) => {
          const done = i < goal.learned
          const here = i === goal.learned - 1
          const unlock = i + 1 === goal.unlockAt
          return (
            <div key={i} className="flex flex-1 items-center last:flex-none">
              <span
                className="relative grid h-3.5 w-3.5 place-items-center rounded-full"
                style={{
                  background: done ? color : 'var(--color-line)',
                  boxShadow: here ? '0 0 0 3px var(--color-here)' : 'none',
                }}
              >
                {unlock && (
                  <span
                    className="absolute -top-3 text-[10px]"
                    style={{ color: 'var(--color-here)' }}
                  >
                    ▾
                  </span>
                )}
              </span>
              {i < goal.total - 1 && (
                <span
                  className="h-1 flex-1 rounded"
                  style={{ background: i < goal.learned - 1 ? color : 'var(--color-line)' }}
                />
              )}
            </div>
          )
        })}
      </div>

      <p className="px-4 pb-4 pt-3 text-xs text-[var(--color-muted)]">
        {goal.learned} of {goal.total} learned · {caption}
      </p>
    </div>
  )
}
