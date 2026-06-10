import { describe, expect, it } from 'vitest'

import { COLOR_PALETTE, colorDefSchema } from '@/domain/parts/colors'

describe('COLOR_PALETTE', () => {
  it('contains exactly 14 PRD §4.3 colors', () => {
    expect(COLOR_PALETTE).toHaveLength(14)
  })

  it('contains all 14 expected color ids', () => {
    const ids = COLOR_PALETTE.map((c) => c.id)
    expect(ids).toContain('red')
    expect(ids).toContain('blue')
    expect(ids).toContain('yellow')
    expect(ids).toContain('green')
    expect(ids).toContain('white')
    expect(ids).toContain('black')
    expect(ids).toContain('light-gray')
    expect(ids).toContain('dark-gray')
    expect(ids).toContain('brown')
    expect(ids).toContain('orange')
    expect(ids).toContain('tan')
    expect(ids).toContain('lime')
    expect(ids).toContain('azure')
    expect(ids).toContain('magenta')
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
      hex: '#C4282B',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a missing id', () => {
    const result = colorDefSchema.safeParse({ label: 'Red', hex: '#C4282B' })
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
