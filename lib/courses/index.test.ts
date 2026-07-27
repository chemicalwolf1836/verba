import { describe, it, expect } from 'vitest'
import { allUnits, findUnit, getCourse, COURSES, DEFAULT_COURSE_ID } from './index'

describe('unit ids are course-prefixed', () => {
  it('every BJT unit id starts with the course id, so two courses cannot collide', () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    for (const unit of course.units) {
      expect(unit.id.startsWith(`${course.id}-`)).toBe(true)
    }
  })

  it('every card points at a unit id that actually exists on its course (or is a phrase)', () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    const unitIds = new Set(course.units.map((u) => u.id))
    for (const card of course.cards) {
      if (card.unitId === '') continue
      expect(unitIds.has(card.unitId)).toBe(true)
    }
  })
})

describe('allUnits', () => {
  it('enumerates every unit across every registered course', () => {
    const total = COURSES.reduce((n, c) => n + c.units.length, 0)
    expect(allUnits()).toHaveLength(total)
    expect(allUnits().every((u) => typeof u.unitId === 'string' && typeof u.courseId === 'string')).toBe(
      true,
    )
  })
})

describe('findUnit', () => {
  it('resolves a unit id back to its course and unit', () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    const first = course.units[0]
    const found = findUnit(first.id)
    expect(found?.course.id).toBe(course.id)
    expect(found?.unit.id).toBe(first.id)
  })

  it('returns undefined for an id no course owns', () => {
    expect(findUnit('no-such-unit')).toBeUndefined()
  })
})
