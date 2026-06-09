import { describe, expect, it } from 'vitest'

import {
  COLOR_PALETTE,
  PART_CATALOG,
  colorDefSchema,
  getColorDef,
  getPartDef,
  partDefSchema,
} from '@/domain/parts/index'

describe('public API re-exports', () => {
  it('exports PART_CATALOG array', () => {
    expect(Array.isArray(PART_CATALOG)).toBe(true)
    expect(PART_CATALOG.length).toBeGreaterThan(0)
  })

  it('exports COLOR_PALETTE array', () => {
    expect(Array.isArray(COLOR_PALETTE)).toBe(true)
    expect(COLOR_PALETTE.length).toBeGreaterThan(0)
  })

  it('exports partDefSchema', () => {
    expect(typeof partDefSchema.safeParse).toBe('function')
  })

  it('exports colorDefSchema', () => {
    expect(typeof colorDefSchema.safeParse).toBe('function')
  })
})

describe('getPartDef', () => {
  it('returns widthX=2, widthZ=4, heightY=3 for brick-2x4', () => {
    const def = getPartDef('brick-2x4')
    expect(def).toBeDefined()
    expect(def?.widthX).toBe(2)
    expect(def?.widthZ).toBe(4)
    expect(def?.heightY).toBe(3)
  })

  it('returns undefined for a non-existent id', () => {
    expect(getPartDef('nonexistent-part')).toBeUndefined()
  })

  it('all catalog ids resolve', () => {
    for (const part of PART_CATALOG) {
      expect(getPartDef(part.id), `${part.id} should resolve`).toBeDefined()
    }
  })
})

describe('getColorDef', () => {
  it('returns the Red color for id "red"', () => {
    const color = getColorDef('red')
    expect(color).toBeDefined()
    expect(color?.label).toBe('Red')
  })

  it('returns undefined for a non-existent id', () => {
    expect(getColorDef('nonexistent-color')).toBeUndefined()
  })

  it('all palette ids resolve', () => {
    for (const color of COLOR_PALETTE) {
      expect(getColorDef(color.id), `${color.id} should resolve`).toBeDefined()
    }
  })
})

describe('uniqueness', () => {
  it('all catalog ids are unique', () => {
    const ids = PART_CATALOG.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all palette ids are unique', () => {
    const ids = COLOR_PALETTE.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
