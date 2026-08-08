'use client'

type Props = {
  /** 1-based position of the card on screen. */
  position: number
  total: number
  got: number
  missed: number
  onEnd: () => void
}

const pct = (n: number, d: number) => `${d > 0 ? Math.round((n / d) * 100) : 0}%`

/**
 * Where this sitting has got to. The bar is three segments rather than one:
 * settled-correct, came-back-shaky, and the card being answered right now. A
 * single fill would say only "how far through", which is the least interesting
 * of the three.
 */
export function StudyProgress({ position, total, got, missed, onEnd }: Props) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline gap-2.5">
        <span className="text-sm font-extrabold tabular-nums">
          {position} <span className="font-semibold text-[var(--color-muted)]">of {total}</span>
        </span>
        <span className="text-sm text-[var(--color-muted)]">· {got} right</span>
        <button
          onClick={onEnd}
          className="ml-auto text-sm font-bold text-[var(--color-muted)]"
        >
          End
        </button>
      </div>
      <div
        className="flex h-[5px] overflow-hidden rounded-sm bg-[var(--color-line)]"
        role="progressbar"
        aria-label="Session progress"
        aria-valuenow={got + missed}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <span style={{ width: pct(got, total) }} className="bg-[var(--color-green)]" />
        <span style={{ width: pct(missed, total) }} className="bg-[var(--color-here)]" />
        <span style={{ width: pct(1, total) }} className="bg-[var(--color-ink)]" />
      </div>
    </div>
  )
}
