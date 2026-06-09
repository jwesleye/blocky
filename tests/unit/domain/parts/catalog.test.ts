import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PART_ID,
  PART_CATALOG,
  getPart,
  isValidPartId,
} from '@/domain/parts/catalog'
import { partDefSchema } from '@/domain/parts/types'

describe('PART_CATALOG', () => {
  it('is a readonly array', () => {
    expect(Array.isArray(PART_CATALOG)).toBe(true)
  })

  it('contains exactly 30 entries (11 bricks + 7 plates + 4 tiles + 4 slopes + 3 rounds + 1 baseplate)', () => {
    expect(PART_CATALOG).toHaveLength(30)
  })

  it('contains all 11 brick variants from PRD §4.2', () => {
    const bricks = PART_CATALOG.filter((p) => p.category === 'brick')
    const ids = bricks.map((p) => p.id)
    expect(ids).toContain('brick-1x1')
    expect(ids).toContain('brick-1x2')
    expect(ids).toContain('brick-1x3')
    expect(ids).toContain('brick-1x4')
    expect(ids).toContain('brick-1x6')
    expect(ids).toContain('brick-1x8')
    expect(ids).toContain('brick-2x2')
    expect(ids).toContain('brick-2x3')
    expect(ids).toContain('brick-2x4')
    expect(ids).toContain('brick-2x6')
    expect(ids).toContain('brick-2x8')
    expect(bricks).toHaveLength(11)
  })

  it('contains all 7 plate variants from PRD §4.2', () => {
    const plates = PART_CATALOG.filter((p) => p.category === 'plate')
    expect(plates).toHaveLength(7)
  })

  it('contains all 4 tile variants from PRD §4.2', () => {
    const tiles = PART_CATALOG.filter((p) => p.category === 'tile')
    expect(tiles).toHaveLength(4)
  })

  it('contains 4 slope variants from PRD §4.2', () => {
    const slopes = PART_CATALOG.filter((p) => p.category === 'slope')
    expect(slopes).toHaveLength(4)
  })

  it('contains 3 round/special variants from PRD §4.2', () => {
    const rounds = PART_CATALOG.filter((p) => p.category === 'round')
    expect(rounds).toHaveLength(3)
  })

  it('includes the 32x32 baseplate', () => {
    const baseplate = PART_CATALOG.find((p) => p.category === 'baseplate')
    expect(baseplate).toBeDefined()
    expect(baseplate?.id).toBe('baseplate-32x32')
    expect(baseplate?.widthX).toBe(32)
    expect(baseplate?.widthZ).toBe(32)
  })

  it('every entry validates against partDefSchema', () => {
    for (const part of PART_CATALOG) {
      const result = partDefSchema.safeParse(part)
      expect(result.success, `${part.id} failed schema validation`).toBe(true)
    }
  })

  it('all ids are unique kebab-case strings', () => {
    const ids = PART_CATALOG.map((p) => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('has a non-empty label for every part', () => {
    for (const part of PART_CATALOG) {
      expect(part.label.length, `${part.id} has empty label`).toBeGreaterThan(0)
    }
  })

  it('assigns heightY 3 to bricks and slopes, heightY 1 to plates and tiles', () => {
    for (const part of PART_CATALOG) {
      if (part.category === 'brick' || part.category === 'slope') {
        expect(part.heightY, part.id).toBe(3)
      } else if (part.category === 'plate' || part.category === 'tile') {
        expect(part.heightY, part.id).toBe(1)
      }
    }
  })

  it('spot-checks brick-2x4 dimensions', () => {
    const brick = PART_CATALOG.find((p) => p.id === 'brick-2x4')
    expect(brick).toBeDefined()
    expect(brick?.widthX).toBe(2)
    expect(brick?.widthZ).toBe(4)
    expect(brick?.heightY).toBe(3)
    expect(brick?.hasTopStuds).toBe(true)
  })

  it('tiles have hasTopStuds false', () => {
    for (const part of PART_CATALOG.filter((p) => p.category === 'tile')) {
      expect(part.hasTopStuds, part.id).toBe(false)
    }
  })
})

describe('getPart', () => {
  it('returns the part definition for a known id', () => {
    const part = getPart('brick-2x4')
    expect(part).toBeDefined()
    expect(part?.label).toBe('Brick 2×4')
  })

  it('returns undefined for an unknown id', () => {
    expect(getPart('mystery-brick')).toBeUndefined()
  })
})

describe('isValidPartId', () => {
  it('returns true for catalog ids', () => {
    expect(isValidPartId('brick-2x4')).toBe(true)
  })

  it('returns false for unknown ids', () => {
    expect(isValidPartId('mystery-brick')).toBe(false)
  })
})

describe('DEFAULT_PART_ID', () => {
  it('is a valid catalog id', () => {
    expect(isValidPartId(DEFAULT_PART_ID)).toBe(true)
  })
})
