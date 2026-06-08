import { describe, it, expect } from 'vitest'
import { PART_CATALOG } from '@/domain/parts/catalog'
import { translateBrick, findCollisions, canPlaceGroup } from '@/domain/physics/transform'
import type { PlacedBrick } from '@/domain/model/types'

describe('Transform Physics', () => {
  const brick1: PlacedBrick = {
    id: 'b1',
    partId: 'brick-2x4',
    x: 0,
    y: 0,
    z: 0,
    rot: 0,
    color: 'red',
  }

  describe('translateBrick', () => {
    it('shifts position while preserving other properties', () => {
      const moved = translateBrick(brick1, { dx: 2, dy: 1, dz: 3 })
      expect(moved).toEqual({
        ...brick1,
        x: 2,
        y: 1,
        z: 3,
      })
    })
  })

  describe('findCollisions', () => {
    it('detects overlapping bricks', () => {
      const b1 = { ...brick1, id: 'b1', x: 0, z: 0 }
      const b2 = { ...brick1, id: 'b2', x: 1, z: 0 } // Overlaps on (1,0)
      const collisions = findCollisions([b1, b2], PART_CATALOG)
      expect(collisions).toContain('b1')
      expect(collisions).toContain('b2')
    })

    it('returns empty set for stacked bricks', () => {
      const b1 = { ...brick1, id: 'b1', x: 0, y: 0 }
      const b2 = { ...brick1, id: 'b2', x: 0, y: 3 } // Directly above
      const collisions = findCollisions([b1, b2], PART_CATALOG)
      expect(collisions.size).toBe(0)
    })
  })

  describe('canPlaceGroup', () => {
    it('rejects collisions', () => {
      const moved = [{ ...brick1, id: 'm1', x: 10, z: 10 }]
      const others = [{ ...brick1, id: 'o1', x: 11, z: 10 }]
      expect(canPlaceGroup(moved, others, PART_CATALOG)).toBe(false)
    })

    it('rejects out of bounds', () => {
      const moved = [{ ...brick1, id: 'm1', x: 31, z: 0 }] // 2x4 at 31 extends to 32, which is out (max 31)
      expect(canPlaceGroup(moved, [], PART_CATALOG)).toBe(false)
    })

    it('rejects floating bricks', () => {
      const moved = [{ ...brick1, id: 'm1', x: 0, y: 1 }] // Floating at y=1
      expect(canPlaceGroup(moved, [], PART_CATALOG)).toBe(false)
    })

    it('accepts valid grounded placement', () => {
      const moved = [{ ...brick1, id: 'm1', x: 5, y: 0, z: 5 }]
      expect(canPlaceGroup(moved, [], PART_CATALOG)).toBe(true)
    })
    
    it('accepts grounded placement on top of others', () => {
      const others = [{ ...brick1, id: 'o1', x: 0, y: 0, z: 0 }]
      const moved = [{ ...brick1, id: 'm1', x: 0, y: 3, z: 0 }]
      expect(canPlaceGroup(moved, others, PART_CATALOG)).toBe(true)
    })
  })
})
