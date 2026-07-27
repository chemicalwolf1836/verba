import Link from 'next/link'
import type { Unit } from '@/lib/courses'
import { lineColor } from '@/lib/lineColors'

export function UnitCard({
  unit,
  unitLabel,
  learned,
  total,
  locked,
}: {
  unit: Unit
  unitLabel: string
  learned: number
  total: number
  locked: boolean
}) {
  const color = locked ? 'var(--color-line)' : lineColor(unit.index)
  const done = !locked && total > 0 && learned >= total

  const body = (
    <div className="relative flex gap-3 pb-3">
      {/* The line spine runs behind every station roundel; rows sit flush so it
          reads as one continuous route down the page. */}
      <span
        aria-hidden
        className="absolute bottom-0 top-0 w-[3px] rounded"
        style={{ left: 13, background: color, opacity: locked ? 0.5 : 1 }}
      />
      <span
        aria-hidden
        className="roundel z-10 flex-none"
        style={{ ['--rd' as string]: color, opacity: locked ? 0.5 : 1 }}
      >
        {unit.index}
      </span>

      <div
        className={`flex-1 rounded-xl border p-4 ${
          locked
            ? 'border-[var(--color-line)] opacity-60'
            : 'border-[var(--color-line)] bg-[var(--color-card)]'
        }`}
      >
        <p className="flex items-center gap-2 text-sm font-bold">
          {unitLabel} {unit.index} - {unit.theme}
          {done && (
            <span
              className="sig-label rounded-full px-1.5 py-0.5 text-[9px] text-white"
              style={{ background: color }}
            >
              ✓
            </span>
          )}
        </p>
        {locked ? (
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Locked - finish the previous {unitLabel.toLowerCase()} first
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-[var(--color-muted)] tabular-nums">
              {learned} of {total} learned
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]" aria-hidden>
              <span
                className="block h-full rounded-full"
                style={{ width: `${total > 0 ? (learned / total) * 100 : 0}%`, background: color }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )

  return locked ? body : <Link href={`/units/${unit.id}`}>{body}</Link>
}
