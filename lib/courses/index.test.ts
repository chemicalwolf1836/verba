import { describe, it, expect } from 'vitest'
import { allUnits, boardName, findUnit, getCourse, COURSES, DEFAULT_COURSE_ID } from './index'

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

describe('boardName', () => {
  it('drops a leading course code, which the roundel beside it already shows', () => {
    expect(boardName({ code: 'BJT', name: 'BJT - Business Japanese' })).toBe('Business Japanese')
  })

  it('accepts the separators a course file might plausibly use', () => {
    for (const sep of ['-', '–', '—', ':', '·']) {
      expect(boardName({ code: 'N2', name: `N2 ${sep} JLPT Level 2` })).toBe('JLPT Level 2')
    }
  })

  it('ignores case and tolerates missing spaces', () => {
    expect(boardName({ code: 'BJT', name: 'bjt-Business Japanese' })).toBe('Business Japanese')
  })

  it('leaves a name alone when the prefix is not this course’s code', () => {
    // Only the course's own code is stripped - a name that merely starts with a
    // word must survive intact.
    expect(boardName({ code: 'N2', name: 'BJT - Business Japanese' })).toBe(
      'BJT - Business Japanese',
    )
    expect(boardName({ code: 'BJT', name: 'Business Japanese' })).toBe('Business Japanese')
  })

  it('does not strip a code that is only part of a longer first word', () => {
    expect(boardName({ code: 'N2', name: 'N2000 - Something' })).toBe('N2000 - Something')
  })

  it('never returns an empty label', () => {
    // A name that is only the code has nothing to strip down to.
    expect(boardName({ code: 'BJT', name: 'BJT' })).toBe('BJT')
  })
})
