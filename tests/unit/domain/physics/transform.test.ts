import { describe, it, expect } from 'vitest'
import { PART_CATALOG } from '@/domain/parts/catalog'
import {
  translateBrick,
  findCollisions,
  canPlaceGroup,
  bricksOutsideBaseplate,
  mirrorBricks,
} from '@/domain/physics/transform'
import { getOccupiedCells } from '@/domain/parts/footprint'
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

    it('rejects placement outside a smaller explicit baseplateSize', () => {
      // 1x1 at (20,0,20) fits a 32-plate but not a 16-plate
      const moved = [
        { ...brick1, id: 'm1', partId: 'brick-1x1', x: 20, y: 0, z: 20 },
      ]
      expect(canPlaceGroup(moved, [], PART_CATALOG, 32)).toBe(true)
      expect(canPlaceGroup(moved, [], PART_CATALOG, 16)).toBe(false)
    })
  })

  describe('bricksOutsideBaseplate', () => {
    it('returns empty array when all bricks fit inside the plate', () => {
      const b: PlacedBrick = {
        id: 'b1',
        partId: 'brick-1x1',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
        color: 'red',
      }
      expect(bricksOutsideBaseplate([b], 32, PART_CATALOG)).toEqual([])
    })

    it('reports a brick inside 32-plate as outside when size is 16', () => {
      const b: PlacedBrick = {
        id: 'b1',
        partId: 'brick-1x1',
        x: 20,
        y: 0,
        z: 20,
        rot: 0,
        color: 'red',
      }
      expect(bricksOutsideBaseplate([b], 32, PART_CATALOG)).toEqual([])
      expect(bricksOutsideBaseplate([b], 16, PART_CATALOG)).toEqual(['b1'])
    })
  })

  describe('mirrorBricks', () => {
    it('reflects origins about the group bounding box and preserves partId/color/y', () => {
      // Two 2x4 bricks at x=0 and x=6 (W=2 each), group X bounding box = [0..7]
      const b1: PlacedBrick = {
        id: 'b1',
        partId: 'brick-2x4',
        x: 0,
        y: 0,
        z: 10,
        rot: 0,
        color: 'red',
      }
      const b2: PlacedBrick = {
        id: 'b2',
        partId: 'brick-2x4',
        x: 6,
        y: 0,
        z: 10,
        rot: 0,
        color: 'blue',
      }

      const mirrored = mirrorBricks([b1, b2], 'x', PART_CATALOG)

      const mb1 = mirrored.find((b) => b.id === 'b1')!
      const mb2 = mirrored.find((b) => b.id === 'b2')!

      // Reflect x: new_x = minX+maxX-(x+W-1) where minX=0,maxX=7,W=2
      expect(mb1.x).toBe(6) // 0+7-(0+2-1)=6
      expect(mb2.x).toBe(0) // 0+7-(6+2-1)=0
      expect(mb1.partId).toBe('brick-2x4')
      expect(mb1.color).toBe('red')
      expect(mb1.y).toBe(0)
      expect(mb1.z).toBe(10)
    })

    it('mirrored footprint cells equal the reflected original cells', () => {
      const b1: PlacedBrick = {
        id: 'b1',
        partId: 'brick-2x4',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
        color: 'red',
      }
      const b2: PlacedBrick = {
        id: 'b2',
        partId: 'brick-1x1',
        x: 6,
        y: 0,
        z: 0,
        rot: 0,
        color: 'blue',
      }

      // bounding box X: cells from b1 (0,1) and b2 (6) → minX=0, maxX=6
      const mirrored = mirrorBricks([b1, b2], 'x', PART_CATALOG)
      const mb1 = mirrored.find((b) => b.id === 'b1')!
      const mb2 = mirrored.find((b) => b.id === 'b2')!

      const def2x4 = PART_CATALOG['brick-2x4']
      const def1x1 = PART_CATALOG['brick-1x1']

      const origCells1 = getOccupiedCells(b1, def2x4)
        .map((c) => c.x)
        .sort()
      const mirroredCells1 = getOccupiedCells(mb1, def2x4)
        .map((c) => c.x)
        .sort()
      const reflectedCells1 = origCells1.map((x) => 6 - x).sort()

      expect(mirroredCells1).toEqual(reflectedCells1)

      const origCells2 = getOccupiedCells(b2, def1x1).map((c) => c.x)
      const mirroredCells2 = getOccupiedCells(mb2, def1x1).map((c) => c.x)
      expect(mirroredCells2).toEqual(origCells2.map((x) => 6 - x))
    })

    it('remaps rot so footprint width parity is preserved (rot 1 → rot 3)', () => {
      const b: PlacedBrick = {
        id: 'b',
        partId: 'brick-2x4',
        x: 0,
        y: 0,
        z: 0,
        rot: 1,
        color: 'red',
      }
      // rot=1: W=4 (def.length), L=2 (def.width)
      const [mirrored] = mirrorBricks([b], 'x', PART_CATALOG)

      expect(mirrored.rot).toBe(3) // (4-1)%4 = 3
      // W for rot=3 is still def.length=4 — same footprint width
      const def = PART_CATALOG['brick-2x4']
      const origW = b.rot % 2 === 0 ? def.width : def.length
      const newW = mirrored.rot % 2 === 0 ? def.width : def.length
      expect(newW).toBe(origW)
    })

    it('mirroring the same group twice across the same axis returns original bricks (involution)', () => {
      const b1: PlacedBrick = {
        id: 'b1',
        partId: 'brick-2x4',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
        color: 'red',
      }
      const b2: PlacedBrick = {
        id: 'b2',
        partId: 'brick-1x1',
        x: 6,
        y: 0,
        z: 0,
        rot: 0,
        color: 'blue',
      }

      const once = mirrorBricks([b1, b2], 'x', PART_CATALOG)
      const twice = mirrorBricks(once, 'x', PART_CATALOG)

      const tb1 = twice.find((b) => b.id === 'b1')!
      const tb2 = twice.find((b) => b.id === 'b2')!

      expect(tb1.x).toBe(b1.x)
      expect(tb1.rot).toBe(b1.rot)
      expect(tb2.x).toBe(b2.x)
      expect(tb2.rot).toBe(b2.rot)
    })
  })
})
