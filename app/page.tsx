import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold">BJT Trainer</h1>
      <Link
        href="/study"
        className="mt-6 block rounded-lg bg-[var(--color-ink)] py-3 text-center font-bold text-[var(--color-card)]"
      >
        Start studying
      </Link>
    </main>
  )
}
