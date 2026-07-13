import { describe, it, expect } from 'vitest'
import { rectsOverlap } from '@/domain/parts/footprint'

describe('rectsOverlap', () => {
  it('returns true when one rectangle is fully inside another (full overlap)', () => {
    const a = { xLo: 0, xHi: 10, zLo: 0, zHi: 10 }
    const b = { xLo: 2, xHi: 8, zLo: 2, zHi: 8 }
    expect(rectsOverlap(a, b)).toBe(true)
    expect(rectsOverlap(b, a)).toBe(true)
  })

  it('returns true when rectangles intersect (partial overlap)', () => {
    const a = { xLo: 0, xHi: 10, zLo: 0, zHi: 10 }
    const b = { xLo: 5, xHi: 15, zLo: 5, zHi: 15 }
    expect(rectsOverlap(a, b)).toBe(true)
    expect(rectsOverlap(b, a)).toBe(true)
  })

  it('returns false when rectangles touch at adjacent edges but do not overlap', () => {
    const a = { xLo: 0, xHi: 10, zLo: 0, zHi: 10 }
    // b touches a at x = 10
    const b1 = { xLo: 10, xHi: 20, zLo: 0, zHi: 10 }
    // b touches a at z = 10
    const b2 = { xLo: 0, xHi: 10, zLo: 10, zHi: 20 }

    expect(rectsOverlap(a, b1)).toBe(false)
    expect(rectsOverlap(b1, a)).toBe(false)
    expect(rectsOverlap(a, b2)).toBe(false)
    expect(rectsOverlap(b2, a)).toBe(false)
  })

  it('returns false when rectangles are completely separate (no overlap)', () => {
    const a = { xLo: 0, xHi: 10, zLo: 0, zHi: 10 }
    const b = { xLo: 20, xHi: 30, zLo: 20, zHi: 30 }
    expect(rectsOverlap(a, b)).toBe(false)
    expect(rectsOverlap(b, a)).toBe(false)
  })
})
