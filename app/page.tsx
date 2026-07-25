import Link from 'next/link'
import { MasteryBar } from '@/components/MasteryBar'

export default function Home() {
  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 py-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          BJT - Target 400
        </p>
        <h1 className="text-3xl font-bold">Vocabulary Trainer</h1>
      </header>

      <MasteryBar />

      <Link
        href="/study"
        className="block rounded-lg bg-[var(--color-ink)] py-4 text-center font-bold text-[var(--color-card)]"
      >
        Start studying
      </Link>

      <Link
        href="/units"
        className="block rounded-lg border border-[var(--color-line)] py-3 text-center"
      >
        Browse weeks
      </Link>
    </main>
  )
}
