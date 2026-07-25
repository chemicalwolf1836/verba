import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'
import { UnitDrill } from '@/components/UnitDrill'

// Static export requires every dynamic route to be enumerated at build time.
// This runs on the server at build time - it has no access to progress
// (which lives only in localStorage), so it can only enumerate ids, never
// decide what's locked. Keep that concern in the client child below.
export function generateStaticParams() {
  const course = getCourse(DEFAULT_COURSE_ID)!
  return course.units.map((u) => ({ unit: u.id }))
}

export default async function UnitPage({ params }: { params: Promise<{ unit: string }> }) {
  const { unit: unitId } = await params
  return <UnitDrill unitId={unitId} />
}
