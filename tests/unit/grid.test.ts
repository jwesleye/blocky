import {
  BASEPLATE_BOUNDS,
  BASEPLATE_SIZE_STUDS,
  BRICK_HEIGHT_PLATES,
  GRAVITY_VECTOR,
  PLATE_HEIGHT_MM,
  STUD_PITCH_MM,
  bricksToPlateUnits,
  isGridPosition,
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
