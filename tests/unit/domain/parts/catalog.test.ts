import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PART_ID,
  PARTS_CATALOG,
  getPart,
  getPartsByType,
  isValidPartId,
} from '@/domain/parts/catalog'

describe('PARTS_CATALOG', () => {
  it('contains all 11 brick variants from PRD §4.2', () => {
    const bricks = PARTS_CATALOG.filter((p) => p.type === 'brick')
    const brickIds = bricks.map((p) => p.id)
    expect(brickIds).toContain('brick-1x1')
    expect(brickIds).toContain('brick-1x2')
    expect(brickIds).toContain('brick-1x3')
    expect(brickIds).toContain('brick-1x4')
    expect(brickIds).toContain('brick-1x6')
    expect(brickIds).toContain('brick-1x8')
    expect(brickIds).toContain('brick-2x2')
    expect(brickIds).toContain('brick-2x3')
    expect(brickIds).toContain('brick-2x4')
    expect(brickIds).toContain('brick-2x6')
    expect(brickIds).toContain('brick-2x8')
    expect(bricks).toHaveLength(11)
  })

  it('contains all 7 plate variants from PRD §4.2', () => {
    const plates = PARTS_CATALOG.filter((p) => p.type === 'plate')
    expect(plates).toHaveLength(7)
  })

  it('contains all 4 tile variants from PRD §4.2', () => {
    const tiles = PARTS_CATALOG.filter((p) => p.type === 'tile')
    expect(tiles).toHaveLength(4)
  })

  it('contains 4 slope variants from PRD §4.2', () => {
    const slopes = PARTS_CATALOG.filter((p) => p.type === 'slope')
    expect(slopes).toHaveLength(4)
  })

  it('contains 3 round/special variants from PRD §4.2', () => {
    const rounds = PARTS_CATALOG.filter((p) => p.type === 'round')
    expect(rounds).toHaveLength(3)
  })

  it('has a non-empty name for every part', () => {
    for (const part of PARTS_CATALOG) {
      expect(part.name.length).toBeGreaterThan(0)
    }
  })

  it('assigns height 3 to bricks and slopes, height 1 to plates and tiles', () => {
    for (const part of PARTS_CATALOG) {
      if (part.type === 'brick' || part.type === 'slope') {
        expect(part.height).toBe(3)
      } else if (part.type === 'plate' || part.type === 'tile') {
        expect(part.height).toBe(1)
      }
    }
  })

  it('generates correct footprint cell count for rectangular bricks', () => {
    const brick2x4 = getPart('brick-2x4')
    expect(brick2x4?.footprint).toHaveLength(8)

    const plate1x2 = getPart('plate-1x2')
    expect(plate1x2?.footprint).toHaveLength(2)
  })
})

describe('getPart', () => {
  it('returns the part definition for a known id', () => {
    const part = getPart('brick-2x4')
    expect(part).toBeDefined()
    expect(part?.name).toBe('Brick 2×4')
  })

  it('returns undefined for an unknown id', () => {
    expect(getPart('mystery-brick')).toBeUndefined()
  })
})

describe('getPartsByType', () => {
  it('returns only parts of the requested type', () => {
    const tiles = getPartsByType('tile')
    expect(tiles.every((p) => p.type === 'tile')).toBe(true)
    expect(tiles.length).toBeGreaterThan(0)
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
