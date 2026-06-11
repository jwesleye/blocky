import { describe, expect, it } from 'vitest'
import { PART_CATALOG } from '@/domain/parts/catalog'
import { partDefSchema, PartCategory } from '@/domain/parts/types'

describe('partDefSchema', () => {
  it('accepts a valid PartDef', () => {
    const valid = {
      id: 'brick-2x4',
      category: PartCategory.brick,
      widthX: 2,
      widthZ: 4,
      heightY: 3,
      hasTopStuds: true,
    }
    const result = partDefSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(valid)
    }
  })

  it('rejects a PartDef with a missing required field', () => {
    const missing = {
      id: 'plate-2x4',
      category: PartCategory.plate,
      widthX: 2,
      widthZ: 4,
      heightY: 1,
      // hasTopStuds missing
    }
    const result = partDefSchema.safeParse(missing)
    expect(result.success).toBe(false)
  })

  it('rejects a PartDef with wrong field type', () => {
    const wrongType = {
      id: 42,
      category: PartCategory.tile,
      widthX: 1,
      widthZ: 2,
      heightY: 1,
      hasTopStuds: false,
    }
    const result = partDefSchema.safeParse(wrongType)
    expect(result.success).toBe(false)
  })

  it('rejects an invalid category value', () => {
    const badCategory = {
      id: 'unknown-1x1',
      category: 'unknown',
      widthX: 1,
      widthZ: 1,
      heightY: 3,
      hasTopStuds: true,
    }
    const result = partDefSchema.safeParse(badCategory)
    expect(result.success).toBe(false)
  })

  it('matches the shared part catalog contract', () => {
    expect(PART_CATALOG['brick-2x4']).toEqual({
      id: 'brick-2x4',
      category: PartCategory.brick,
      widthX: 2,
      widthZ: 4,
      heightY: 3,
      hasTopStuds: true,
    })
    expect(partDefSchema.safeParse(PART_CATALOG['tile-2x4']).success).toBe(true)
  })
})
