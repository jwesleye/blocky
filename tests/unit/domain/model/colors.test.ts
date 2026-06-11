import { describe, expect, it } from 'vitest'

import {
  BRICK_COLORS,
  DEFAULT_COLOR_ID,
  getBrickColor,
  isValidColorId,
  resolveBrickColorHex,
} from '@/domain/model/colors'

describe('BRICK_COLORS', () => {
  it('contains all 14 palette colors defined in PRD §4.3', () => {
    const ids = BRICK_COLORS.map((c) => c.id)
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
    expect(BRICK_COLORS).toHaveLength(14)
  })

  it('exposes a non-empty label for every color (color labels not color-only)', () => {
    for (const color of BRICK_COLORS) {
      expect(color.label.length).toBeGreaterThan(0)
    }
  })

  it('exposes a valid hex color for every entry', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/
    for (const color of BRICK_COLORS) {
      expect(color.hex).toMatch(hexPattern)
    }
  })
})

describe('getBrickColor', () => {
  it('returns the color object for a known id', () => {
    const color = getBrickColor('red')
    expect(color).toBeDefined()
    expect(color?.label).toBe('Red')
  })

  it('returns undefined for an unknown id', () => {
    expect(getBrickColor('neon-pink')).toBeUndefined()
  })
})

describe('isValidColorId', () => {
  it('returns true for palette ids', () => {
    expect(isValidColorId('blue')).toBe(true)
  })

  it('returns false for unknown ids', () => {
    expect(isValidColorId('neon-pink')).toBe(false)
  })
})

describe('DEFAULT_COLOR_ID', () => {
  it('is a valid palette id', () => {
    expect(isValidColorId(DEFAULT_COLOR_ID)).toBe(true)
  })
})

describe('resolveBrickColorHex', () => {
  it('returns the palette hex for a known color id', () => {
    const expected = getBrickColor('blue')!.hex
    expect(resolveBrickColorHex('blue')).toBe(expected)
  })

  it('returns the default color hex for an unknown id', () => {
    const defaultHex = getBrickColor(DEFAULT_COLOR_ID)!.hex
    expect(resolveBrickColorHex('neon-pink')).toBe(defaultHex)
  })

  it('returns the default color hex for an arbitrarily long string (never passes through raw)', () => {
    const defaultHex = getBrickColor(DEFAULT_COLOR_ID)!.hex
    const longString = 'x'.repeat(1000)
    expect(resolveBrickColorHex(longString)).toBe(defaultHex)
    expect(resolveBrickColorHex(longString)).not.toBe(longString)
  })
})
