'use client'

type Props = {
  /** 1-based position of the card on screen. */
  position: number
  total: number
  got: number
  missed: number
  onEnd: () => void
  /** Sits beside End, which is the other control that acts on the sitting rather
   *  than on the card in front of you. The row is two thirds empty, so anything
   *  put here costs no vertical space. */
  trailing?: React.ReactNode
}

/**
 * The way out of a sitting. A real button shape rather than grey text, which
 * read as a caption and was easy to miss; the pseudo-element grows the touch
 * target to 44px tall without changing the drawn size. Shared with shadowing so
 * both sessions leave the same way.
 */
export const END_BUTTON =
  "relative rounded-full border border-[var(--color-line)] bg-[var(--color-card)] px-3.5 py-1.5 text-sm font-bold after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']"

const pct = (n: number, d: number) => `${d > 0 ? Math.round((n / d) * 100) : 0}%`

/**
 * Where this sitting has got to. The bar is three segments rather than one:
 * settled-correct, came-back-shaky, and the card being answered right now. A
 * single fill would say only "how far through", which is the least interesting
 * of the three.
 */
export function StudyProgress({ position, total, got, missed, onEnd, trailing }: Props) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-extrabold tabular-nums">
          {position} <span className="font-semibold text-[var(--color-muted)]">of {total}</span>
        </span>
        <span className="text-sm text-[var(--color-muted)]">· {got} right</span>
        {trailing && <span className="ml-auto">{trailing}</span>}
        <button onClick={onEnd} className={`${END_BUTTON} ${trailing ? '' : 'ml-auto'}`}>
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
