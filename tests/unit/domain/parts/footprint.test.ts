import { describe, expect, it, vi } from 'vitest'
import {
  getFootprintRect,
  rectsOverlap,
  getOccupiedHalfStudCells,
  getOccupiedCells,
  forEachOccupiedCell,
  getMountedBrickVolumeBounds,
  toBrickFootprint,
  type FootprintRect,
} from '@/domain/parts/footprint'
import type { PlacedBrick } from '@/domain/model/types'
import type { PhysicsPartDef as PartDef } from '@/domain/parts/catalog'

const mockDef: PartDef = {
  width: 2,
  length: 4,
  height: 3,
  hasTopStuds: true,
}

const createMockBrick = (
  overrides: Partial<PlacedBrick> = {},
): PlacedBrick => ({
  id: 'test-brick',
  partId: 'brick-2x4',
  color: 'red',
  x: 0,
  y: 0,
  z: 0,
  rot: 0,
  ...overrides,
})

describe('getFootprintRect', () => {
  it('computes basic unrotated footprint', () => {
    const brick = createMockBrick({ x: 10, z: 20 })
    const rect = getFootprintRect(brick, mockDef)
    expect(rect).toEqual({ xLo: 10, xHi: 12, zLo: 20, zHi: 24 })
  })

  it('computes 90-degree rotated footprint', () => {
    const brick = createMockBrick({ x: 10, z: 20, rot: 1 })
    const rect = getFootprintRect(brick, mockDef)

    expect(rect).toEqual({ xLo: 10, xHi: 14, zLo: 20, zHi: 22 })
  })

  it('handles half-stud offsets', () => {
    const brick = createMockBrick({
      x: 10,
      z: 20,
      offset: { x: 1, z: 1 },
    })
    const rect = getFootprintRect(brick, mockDef)
    expect(rect).toEqual({ xLo: 10.5, xHi: 12.5, zLo: 20.5, zHi: 24.5 })
  })
})

describe('rectsOverlap', () => {
  const r1: FootprintRect = { xLo: 0, xHi: 2, zLo: 0, zHi: 4 }

  it('detects intersecting rects', () => {
    const r2: FootprintRect = { xLo: 1, xHi: 3, zLo: 1, zHi: 5 }
    expect(rectsOverlap(r1, r2)).toBe(true)
    expect(rectsOverlap(r2, r1)).toBe(true)
  })

  it('returns false for disjoint rects', () => {
    const r2: FootprintRect = { xLo: 3, xHi: 5, zLo: 0, zHi: 4 }
    expect(rectsOverlap(r1, r2)).toBe(false)
  })

  it('returns false for rects just touching at an edge', () => {
    const r2: FootprintRect = { xLo: 2, xHi: 4, zLo: 0, zHi: 4 }
    expect(rectsOverlap(r1, r2)).toBe(false)
  })

  it('returns false for rects just touching at a corner', () => {
    const r2: FootprintRect = { xLo: 2, xHi: 4, zLo: 4, zHi: 6 }
    expect(rectsOverlap(r1, r2)).toBe(false)
  })

  it('returns true for identically positioned rects', () => {
    expect(rectsOverlap(r1, r1)).toBe(true)
  })

  it('returns true when one rectangle is fully inside another', () => {
    const outer: FootprintRect = { xLo: 0, xHi: 10, zLo: 0, zHi: 10 }
    const inner: FootprintRect = { xLo: 2, xHi: 8, zLo: 2, zHi: 8 }
    expect(rectsOverlap(outer, inner)).toBe(true)
    expect(rectsOverlap(inner, outer)).toBe(true)
  })
})

describe('getOccupiedHalfStudCells', () => {
  it('returns cells for a basic 1x2 brick at origin', () => {
    const brick = createMockBrick({ x: 0, z: 0, rot: 0 })
    const def1x2: PartDef = { ...mockDef, width: 1, length: 2 }
    const cells = getOccupiedHalfStudCells(brick, def1x2)

    expect(cells).toHaveLength(8)
    expect(cells).toContainEqual({ x: 0, z: 0 })
    expect(cells).toContainEqual({ x: 1, z: 3 })

    expect(cells).not.toContainEqual({ x: 2, z: 0 })
    expect(cells).not.toContainEqual({ x: 0, z: 4 })
  })

  it('handles rotations swapping width and length', () => {
    const brick = createMockBrick({ x: 0, z: 0, rot: 1 })
    const def1x2: PartDef = { ...mockDef, width: 1, length: 2 }
    const cells = getOccupiedHalfStudCells(brick, def1x2)

    expect(cells).toHaveLength(8)
    expect(cells).toContainEqual({ x: 0, z: 0 })
    expect(cells).toContainEqual({ x: 3, z: 1 })

    expect(cells).not.toContainEqual({ x: 4, z: 0 })
    expect(cells).not.toContainEqual({ x: 0, z: 2 })
  })

  it('incorporates half-stud offsets', () => {
    const brick = createMockBrick({ x: 1, z: 1, offset: { x: 1, z: 1 } })
    const def1x1: PartDef = { ...mockDef, width: 1, length: 1 }
    const cells = getOccupiedHalfStudCells(brick, def1x1)

    expect(cells).toHaveLength(4)
    expect(cells).toEqual(
      expect.arrayContaining([
        { x: 3, z: 3 },
        { x: 4, z: 3 },
        { x: 3, z: 4 },
        { x: 4, z: 4 },
      ]),
    )
  })
})

describe('getOccupiedCells', () => {
  it('returns stud cells for a basic brick', () => {
    const brick = createMockBrick({ x: 10, z: 20 })

    const cells = getOccupiedCells(brick, mockDef)
    expect(cells).toHaveLength(8)
    expect(cells).toContainEqual({ x: 10, z: 20 })
    expect(cells).toContainEqual({ x: 11, z: 20 })
    expect(cells).toContainEqual({ x: 10, z: 23 })
    expect(cells).toContainEqual({ x: 11, z: 23 })
  })

  it('handles rotated bricks', () => {
    const brick = createMockBrick({ x: 10, z: 20, rot: 1 })

    const cells = getOccupiedCells(brick, mockDef)
    expect(cells).toHaveLength(8)
    expect(cells).toContainEqual({ x: 10, z: 20 })
    expect(cells).toContainEqual({ x: 13, z: 20 })
    expect(cells).toContainEqual({ x: 10, z: 21 })
    expect(cells).toContainEqual({ x: 13, z: 21 })
    expect(cells).not.toContainEqual({ x: 10, z: 22 })
  })
})

describe('forEachOccupiedCell', () => {
  it('calls the visitor function for each cell', () => {
    const brick = createMockBrick({ x: 5, z: 5 })
    const visitor = vi.fn()
    forEachOccupiedCell(brick, mockDef, visitor)

    expect(visitor).toHaveBeenCalledTimes(8)
    expect(visitor).toHaveBeenCalledWith({ x: 5, z: 5 })
    expect(visitor).toHaveBeenCalledWith({ x: 6, z: 8 })
  })

  it('respects rotation', () => {
    const brick = createMockBrick({ x: 5, z: 5, rot: 1 })
    const visitor = vi.fn()
    forEachOccupiedCell(brick, mockDef, visitor)

    expect(visitor).toHaveBeenCalledTimes(8)
    expect(visitor).toHaveBeenCalledWith({ x: 8, z: 6 })
    expect(visitor).not.toHaveBeenCalledWith({ x: 6, z: 8 })
  })
})

describe('getMountedBrickVolumeBounds', () => {
  it('computes volume bounds for default (unmounted) brick', () => {
    const brick = createMockBrick({ x: 10, y: 0, z: 20 })
    const bounds = getMountedBrickVolumeBounds(brick, mockDef)

    expect(bounds).toEqual({
      xHalfMin: 20,
      xHalfMax: 23,
      yMin: 0,
      yMax: 2,
      zHalfMin: 40,
      zHalfMax: 47,
    })
  })

  it('computes volume bounds for px/nx mount', () => {
    const brick = createMockBrick({ x: 10, y: 0, z: 20, mount: 'px' })
    const bounds = getMountedBrickVolumeBounds(brick, mockDef)

    expect(bounds).toEqual({
      xHalfMin: 19,
      xHalfMax: 24,
      yMin: 1,
      yMax: 2,
      zHalfMin: 40,
      zHalfMax: 47,
    })
  })

  it('computes volume bounds for pz/nz mount', () => {
    const brick = createMockBrick({ x: 10, y: 0, z: 20, mount: 'pz' })
    const bounds = getMountedBrickVolumeBounds(brick, mockDef)

    expect(bounds).toEqual({
      xHalfMin: 20,
      xHalfMax: 23,
      yMin: -0,
      yMax: 3,
      zHalfMin: 41,
      zHalfMax: 46,
    })
  })
})

describe('toBrickFootprint', () => {
  const mockCatalog = {
    'brick-2x4': mockDef,
  }

  it('converts a PlacedBrick to BrickFootprint', () => {
    const brick = createMockBrick({
      id: 'abc',
      y: 5,
      offset: { x: 1, z: 0 },
      mount: 'nx',
    })
    const fp = toBrickFootprint(brick, mockCatalog)

    expect(fp.id).toBe('abc')
    expect(fp.bottomY).toBe(5)
    expect(fp.height).toBe(3)
    expect(fp.hasTopStuds).toBe(true)
    expect(fp.offset).toEqual({ x: 1, z: 0 })
    expect(fp.mount).toBe('nx')

    expect(fp.cells).toHaveLength(8)
  })

  it('throws an error if partId is not in catalog', () => {
    const brick = createMockBrick({ partId: 'unknown-part' })
    expect(() => toBrickFootprint(brick, mockCatalog)).toThrow(
      'unknown partId "unknown-part"',
    )
  })
})
