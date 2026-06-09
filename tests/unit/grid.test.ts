import {
  BASEPLATE_BOUNDS,
  BASEPLATE_SIZE_STUDS,
  BRICK_HEIGHT_PLATES,
  DEFAULT_BASEPLATE_SIZE,
  GRAVITY_VECTOR,
  PLATE_HEIGHT_MM,
  STUD_PITCH_MM,
  SUPPORTED_BASEPLATE_SIZES,
  assertSupportedBaseplateSize,
  boundsForSize,
  bricksToPlateUnits,
  isGridPosition,
  isSupportedBaseplateSize,
  isWithinBaseplate,
  normalizeRotationY,
  plateUnitsToMillimeters,
  studsToMillimeters,
} from '@/domain/grid'

describe('grid coordinate system', () => {
  it('uses stud and plate measurements from the PRD', () => {
    expect(STUD_PITCH_MM).toBe(8)
    expect(PLATE_HEIGHT_MM).toBe(3.2)
    expect(BRICK_HEIGHT_PLATES).toBe(3)
    expect(BASEPLATE_SIZE_STUDS).toBe(32)
    expect(GRAVITY_VECTOR).toEqual({ x: 0, y: -1, z: 0 })
    expect(BASEPLATE_BOUNDS).toEqual({
      minX: 0,
      maxX: 31,
      minZ: 0,
      maxZ: 31,
    })
  })

  it('converts between brick/grid units and validates in-bounds positions', () => {
    expect(studsToMillimeters(2)).toBe(16)
    expect(plateUnitsToMillimeters(3)).toBeCloseTo(9.6)
    expect(bricksToPlateUnits(2)).toBe(6)

    expect(isWithinBaseplate({ x: 0, z: 0 })).toBe(true)
    expect(isWithinBaseplate({ x: 31, z: 31 })).toBe(true)
    expect(isGridPosition({ x: 12, y: 3, z: 20 })).toBe(true)
  })

  it('rejects out-of-bounds or non-grid-aligned positions and normalizes rotation', () => {
    expect(isWithinBaseplate({ x: -1, z: 0 })).toBe(false)
    expect(isWithinBaseplate({ x: 32, z: 31 })).toBe(false)
    expect(isGridPosition({ x: 1.5, y: 3, z: 2 })).toBe(false)
    expect(isGridPosition({ x: 1, y: -1, z: 2 })).toBe(false)

    expect(normalizeRotationY(0)).toBe(0)
    expect(normalizeRotationY(5)).toBe(1)
    expect(normalizeRotationY(-1)).toBe(3)
  })
})

describe('size-aware baseplate bounds', () => {
  it('exports supported sizes and default', () => {
    expect(SUPPORTED_BASEPLATE_SIZES).toEqual([16, 32, 48, 64])
    expect(DEFAULT_BASEPLATE_SIZE).toBe(32)
  })

  it('computes bounds for any supported size', () => {
    expect(boundsForSize(48)).toEqual({ minX: 0, maxX: 47, minZ: 0, maxZ: 47 })
    expect(boundsForSize(16)).toEqual({ minX: 0, maxX: 15, minZ: 0, maxZ: 15 })
    expect(boundsForSize(64)).toEqual({ minX: 0, maxX: 63, minZ: 0, maxZ: 63 })
  })

  it('validates edge cells for a non-default size', () => {
    expect(isWithinBaseplate({ x: 47, z: 47 }, 48)).toBe(true)
    expect(isWithinBaseplate({ x: 32, z: 0 }, 32)).toBe(false)
  })

  it('keeps default-arg behavior identical to before', () => {
    expect(isWithinBaseplate({ x: 0, z: 0 })).toBe(true)
    expect(isWithinBaseplate({ x: 31, z: 31 })).toBe(true)
    expect(isWithinBaseplate({ x: 32, z: 31 })).toBe(false)
    expect(isGridPosition({ x: 12, y: 3, z: 20 })).toBe(true)
    expect(isGridPosition({ x: 32, y: 0, z: 0 })).toBe(false)
  })

  it('identifies supported and unsupported sizes', () => {
    for (const size of SUPPORTED_BASEPLATE_SIZES) {
      expect(isSupportedBaseplateSize(size)).toBe(true)
    }
    expect(isSupportedBaseplateSize(0)).toBe(false)
    expect(isSupportedBaseplateSize(17)).toBe(false)
    expect(isSupportedBaseplateSize(-16)).toBe(false)
    expect(isSupportedBaseplateSize(64.5)).toBe(false)
    expect(isSupportedBaseplateSize(999)).toBe(false)
  })

  it('rejects unsupported and degenerate sizes at the canonical guard', () => {
    expect(() => boundsForSize(0)).toThrow(RangeError)
    expect(() => boundsForSize(17)).toThrow(RangeError)
    expect(() => boundsForSize(-16)).toThrow(RangeError)
    expect(() => boundsForSize(999)).toThrow(RangeError)
    expect(() => assertSupportedBaseplateSize(17)).toThrow(RangeError)
    expect(() => isWithinBaseplate({ x: 0, z: 0 }, 17)).toThrow(RangeError)
    expect(() => isGridPosition({ x: 0, y: 0, z: 0 }, 17)).toThrow(RangeError)
  })
})
