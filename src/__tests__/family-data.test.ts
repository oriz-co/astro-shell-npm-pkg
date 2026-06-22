import { describe, expect, it } from 'vitest'
import {
  FAMILY_APPS,
  FAMILY_PACKAGES,
  FAMILY_APIS,
  FAMILY_BOOKS,
  FAMILY_EXTENSIONS,
  FAMILY_SKILLS,
  familyDataSummary,
} from '../family-data'

describe('family-data registry', () => {
  it('exports populated arrays', () => {
    expect(FAMILY_APPS.length).toBeGreaterThan(20)
    expect(FAMILY_PACKAGES.length).toBeGreaterThan(20)
    expect(FAMILY_APIS.length).toBeGreaterThan(10)
    expect(FAMILY_BOOKS.length).toBeGreaterThan(0)
    expect(FAMILY_EXTENSIONS.length).toBe(0)
    expect(FAMILY_SKILLS.length).toBeGreaterThan(0)
  })

  it('every app has slug/name/url/category/status', () => {
    for (const a of FAMILY_APPS) {
      expect(a.slug).toBeTruthy()
      expect(a.name).toBeTruthy()
      expect(a.url).toMatch(/^https?:\/\//)
      expect(['hub', 'personal', 'content', 'tools']).toContain(a.category)
      expect(['live', 'beta', 'planned']).toContain(a.status)
    }
  })

  it('every package has matching npm + ghRepo', () => {
    for (const p of FAMILY_PACKAGES) {
      expect(p.npm).toBe(`@chirag127/${p.slug}`)
      expect(p.ghRepo).toBe(`chirag127/${p.slug}-npm-pkg`)
      expect(['astro', 'auth', 'oriz', 'omni']).toContain(p.category)
    }
  })

  it('familyDataSummary returns valid totals', () => {
    const s = familyDataSummary()
    expect(s.apps).toBe(FAMILY_APPS.length)
    expect(s.packages).toBe(FAMILY_PACKAGES.length)
    expect(s.total).toBe(
      FAMILY_APPS.length +
        FAMILY_PACKAGES.length +
        FAMILY_APIS.length +
        FAMILY_BOOKS.length +
        FAMILY_EXTENSIONS.length +
        FAMILY_SKILLS.length,
    )
  })
})
