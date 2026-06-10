import { describe, expect, it } from 'vitest'

import { partDefSchema } from '@/domain/parts/types'

const validPartDef = {
  id: 'brick-2x4',
  label: 'Brick 2×4',
  category: 'brick' as const,
  widthX: 2,
  widthZ: 4,
  heightY: 3,
  hasTopStuds: true,
}

describe('partDefSchema', () => {
  it('accepts a valid PartDef object', () => {
    const result = partDefSchema.safeParse(validPartDef)
    expect(result.success).toBe(true)
  })

  it('rejects an object with missing required field (id)', () => {
    const missing = Object.fromEntries(
      Object.entries(validPartDef).filter(([key]) => key !== 'id')
    )
    const result = partDefSchema.safeParse(missing)
    expect(result.success).toBe(false)
  })

  it('rejects an object with wrong type on a required field (widthX)', () => {
    const result = partDefSchema.safeParse({ ...validPartDef, widthX: 'two' })
    expect(result.success).toBe(false)
  })

  it('rejects an object with an invalid category value', () => {
    const result = partDefSchema.safeParse({ ...validPartDef, category: 'blob' })
    expect(result.success).toBe(false)
  })

  it('accepts baseplate as a valid category', () => {
    const result = partDefSchema.safeParse({
      ...validPartDef,
      id: 'baseplate-32x32',
      label: 'Baseplate 32×32',
      category: 'baseplate',
      widthX: 32,
      widthZ: 32,
      heightY: 1,
      hasTopStuds: true,
    })
    expect(result.success).toBe(true)
  })
})
