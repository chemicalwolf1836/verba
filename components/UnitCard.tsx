import Link from 'next/link'
import type { Unit } from '@/lib/courses'

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
  const body = (
    <div
      className={`rounded-xl border border-[var(--color-line)] p-4 ${
        locked ? 'opacity-50' : 'bg-[var(--color-card)]'
      }`}
    >
      <p className="text-sm font-bold">
        {unitLabel} {unit.index} - {unit.theme}
      </p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        {locked ? 'Locked - finish the previous week first' : `${learned} of ${total} learned`}
      </p>
    </div>
  )

  return locked ? body : <Link href={`/units/${unit.id}`}>{body}</Link>
}
