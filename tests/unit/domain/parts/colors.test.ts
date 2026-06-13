import { describe, expect, it } from 'vitest'

import { COLOR_PALETTE, colorDefSchema } from '@/domain/parts/colors'

const guidePalette = [
  { id: 'red', label: 'Red', hex: '#c4281b' },
  { id: 'blue', label: 'Blue', hex: '#0d5ec4' },
  { id: 'yellow', label: 'Yellow', hex: '#f5c518' },
  { id: 'green', label: 'Green', hex: '#237841' },
  { id: 'white', label: 'White', hex: '#f4f4f4' },
  { id: 'black', label: 'Black', hex: '#1b1b1b' },
  { id: 'light-gray', label: 'Light Gray', hex: '#a0a5a9' },
  { id: 'dark-gray', label: 'Dark Gray', hex: '#6c6e68' },
  { id: 'brown', label: 'Brown', hex: '#694228' },
  { id: 'orange', label: 'Orange', hex: '#fe8a18' },
  { id: 'tan', label: 'Tan', hex: '#e4cd9e' },
  { id: 'lime', label: 'Lime', hex: '#bbe90b' },
  { id: 'azure', label: 'Azure', hex: '#1e90c4' },
  { id: 'magenta', label: 'Magenta', hex: '#c8308a' },
] as const

describe('COLOR_PALETTE', () => {
  it('contains exactly 14 PRD §4.3 colors', () => {
    expect(COLOR_PALETTE).toHaveLength(14)
  })

  it('matches the style guide brick palette exactly', () => {
    expect(COLOR_PALETTE).toEqual(guidePalette)
  })

  it('every entry validates against colorDefSchema', () => {
    for (const color of COLOR_PALETTE) {
      const result = colorDefSchema.safeParse(color)
      expect(result.success, `${color.id} failed schema validation`).toBe(true)
    }
  })

  it('all ids are unique', () => {
    const ids = COLOR_PALETTE.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every entry has a non-empty label', () => {
    for (const color of COLOR_PALETTE) {
      expect(color.label.length, `${color.id} has empty label`).toBeGreaterThan(
        0,
      )
    }
  })

  it('every hex value is a 6-character hex string', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/
    for (const color of COLOR_PALETTE) {
      expect(color.hex, `${color.id} has invalid hex`).toMatch(hexPattern)
    }
  })
})

describe('colorDefSchema', () => {
  it('accepts a valid ColorDef', () => {
    const result = colorDefSchema.safeParse({
      id: 'red',
      label: 'Red',
      hex: '#c4281b',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a missing id', () => {
    const result = colorDefSchema.safeParse({ label: 'Red', hex: '#c4281b' })
    expect(result.success).toBe(false)
  })

  it('rejects a hex value that is not 6 characters', () => {
    const result = colorDefSchema.safeParse({
      id: 'red',
      label: 'Red',
      hex: '#C42',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a hex value without the # prefix', () => {
    const result = colorDefSchema.safeParse({
      id: 'red',
      label: 'Red',
      hex: 'C4282B',
    })
    expect(result.success).toBe(false)
  })
})
