import { describe, expect, it } from 'vitest'

import {
  computeSupportFootprint,
  computeCoM,
  isBalanced,
} from '@/domain/physics/balance'
import type { PlacedBrick } from '@/domain/model/types'
import { CATALOG_BY_ID as PART_CATALOG } from '@/domain/parts/catalog'

function sortPoints(points: ReadonlyArray<readonly [number, number]>) {
  return [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

describe('Balance primitives', () => {
  describe('computeSupportFootprint', () => {
    it('computes convex hull of base-contact bricks', () => {
      const bricks: PlacedBrick[] = [
        {
          id: '1',
          partId: 'brick-2x2',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
      ]
      const footprint = computeSupportFootprint(bricks, PART_CATALOG)
      // 2x2 brick at (0,0) -> cells (0,0), (1,0), (0,1), (1,1)
      // corners: (0,0), (2,0), (0,2), (2,2)
      // hull will be convex hull of these points
      expect(sortPoints(footprint)).toEqual(
        sortPoints([
          [0, 2],
          [2, 2],
          [2, 0],
          [0, 0],
        ]),
      )
    })

    it('returns empty array if no bricks touch the ground', () => {
      const bricks: PlacedBrick[] = [
        {
          id: '1',
          partId: 'brick-2x2',
          color: 'red',
          x: 0,
          y: 3,
          z: 0,
          rot: 0,
        },
      ]
      const footprint = computeSupportFootprint(bricks, PART_CATALOG)
      expect(footprint).toEqual([])
    })

    it('uses the rotated world footprint for a 90° rectangular brick', () => {
      // brick-1x2 is width 1 (X) x length 2 (Z) at rot 0. With rot: 1 (90° CW)
      // the world footprint flips to 2 (X) x 1 (Z): cells (4,7) and (5,7).
      const bricks: PlacedBrick[] = [
        {
          id: '1',
          partId: 'brick-1x2',
          color: 'red',
          x: 4,
          y: 0,
          z: 7,
          rot: 1,
        },
      ]
      const footprint = computeSupportFootprint(bricks, PART_CATALOG)
      // Rotated footprint spans X [4, 6], Z [7, 8] — a 2x1 rectangle, not 1x2.
      expect(sortPoints(footprint)).toEqual(
        sortPoints([
          [4, 7],
          [6, 7],
          [6, 8],
          [4, 8],
        ]),
      )
    })
  })

  describe('computeCoM', () => {
    it('computes simple mass-uniform center of mass', () => {
      const bricks: PlacedBrick[] = [
        {
          id: '1',
          partId: 'brick-2x2',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
        {
          id: '2',
          partId: 'brick-2x2',
          color: 'red',
          x: 0,
          y: 3,
          z: 0,
          rot: 0,
        },
      ]
      const com = computeCoM(bricks, PART_CATALOG)
      // Two 2x2 bricks stacked.
      // Brick 1 CoM: x=1, y=1.5, z=1. Mass = 4 cells * 3 height = 12
      // Brick 2 CoM: x=1, y=4.5, z=1. Mass = 12
      // Combined CoM: x=1, y=3, z=1
      expect(com).toEqual({ x: 1, y: 3, z: 1 })
    })

    it('uses the rotated occupied cells for a 90° rectangular brick', () => {
      const bricks: PlacedBrick[] = [
        {
          id: '1',
          partId: 'brick-1x2',
          color: 'red',
          x: 4,
          y: 0,
          z: 7,
          rot: 1,
        },
      ]
      const com = computeCoM(bricks, PART_CATALOG)
      // Rotated cells (4,7) and (5,7): X-center 5, Z-center 7.5, Y-center 1.5.
      expect(com).toEqual({ x: 5, y: 1.5, z: 7.5 })
    })
  })

  describe('isBalanced', () => {
    it('single-brick always balanced', () => {
      const bricks: PlacedBrick[] = [
        {
          id: '1',
          partId: 'brick-1x1',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
      ]
      expect(isBalanced(bricks, PART_CATALOG)).toBe(true)
    })

    it('balanced cantilever returns true', () => {
      // Base: x in [0,1], z in [0,6]
      // Overhang: x in [2,3], z in [0,6]
      // Wait, 1x6 rot=0 means width=1, length=6?
      // PART_CATALOG: B(1, 6) -> width: 1, length: 6.
      // Let's use 1x4 and offset Z.
      // Actually rot=1 means width=6, length=1. Let's do that for cantilever along X.
      const cantileverBricks: PlacedBrick[] = [
        // Base 1x6 (length 6 along X)
        {
          id: '1',
          partId: 'brick-1x6',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 1,
        },
        // Overhang 1x6 (length 6 along X), shifted X by +2
        {
          id: '2',
          partId: 'brick-1x6',
          color: 'red',
          x: 2,
          y: 3,
          z: 0,
          rot: 1,
        },
      ]
      // CoM X:
      // Base X-center: 3 (from 0 to 6)
      // Overhang X-center: 5 (from 2 to 8)
      // Total CoM X: 4
      // Support footprint: X in [0,6], Z in [0,1]
      // CoM X=4 is inside [0,6]. Balanced!
      expect(isBalanced(cantileverBricks, PART_CATALOG)).toBe(true)
    })

    it('obvious overhang returns false', () => {
      const bricks: PlacedBrick[] = [
        // Base 1x2 (length 2 along X)
        {
          id: '1',
          partId: 'brick-1x2',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 1,
        },
        // Huge overhang 1x6 (length 6 along X), shifted X by +2
        {
          id: '2',
          partId: 'brick-1x6',
          color: 'red',
          x: 2,
          y: 3,
          z: 0,
          rot: 1,
        },
      ]
      // Base CoM X: 1 (mass 2*3=6)
      // Overhang CoM X: 5 (mass 6*3=18)
      // Total CoM X: (1*6 + 5*18) / 24 = (6 + 90) / 24 = 96 / 24 = 4
      // Support footprint: X in [0,2]
      // CoM X=4 is outside [0,2]. Unbalanced!
      expect(isBalanced(bricks, PART_CATALOG)).toBe(false)
    })

    it('rotated rectangular brick is balanced over its rotated footprint', () => {
      const bricks: PlacedBrick[] = [
        {
          id: '1',
          partId: 'brick-1x2',
          color: 'red',
          x: 4,
          y: 0,
          z: 7,
          rot: 1,
        },
      ]
      // CoM (5, 7.5) projects inside the rotated support footprint X [4,6], Z [7,8].
      expect(isBalanced(bricks, PART_CATALOG)).toBe(true)
    })

    it('returns true for empty array', () => {
      expect(isBalanced([], PART_CATALOG)).toBe(true)
    })

    it('offset brick is balanced when its shifted CoM lands inside the support footprint', () => {
      // plate-1x1 (height=1) at x=2 gives support footprint X [2,3].
      // brick-1x1 (height=3) at x=1 with offset.x=1: true CoM_x = 1.5+0.5 = 2.0 → inside [2,3].
      // Without offset: CoM_x = 1.5, outside [2,3] → misjudged as unbalanced.
      const bricks: PlacedBrick[] = [
        {
          id: 'base',
          partId: 'plate-1x1',
          color: 'red',
          x: 2,
          y: 0,
          z: 0,
          rot: 0,
        },
        {
          id: 'top',
          partId: 'brick-1x1',
          color: 'blue',
          x: 1,
          y: 1,
          z: 0,
          rot: 0,
          offset: { x: 1, z: 0 },
        },
      ]
      expect(isBalanced(bricks, PART_CATALOG)).toBe(true)
    })

    it('CoM on hull boundary is considered balanced', () => {
      // Grounded brick-1x1 at (0,0,0) gives support footprint [0,1]x[0,1].
      // Second brick-1x1 at (1,3,0) is not grounded so does not widen footprint.
      // Combined CoM projects to x=1.0, z=0.5 — exactly on the right edge of the hull.
      const bricks: PlacedBrick[] = [
        {
          id: '1',
          partId: 'brick-1x1',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
        {
          id: '2',
          partId: 'brick-1x1',
          color: 'red',
          x: 1,
          y: 3,
          z: 0,
          rot: 0,
        },
      ]
      expect(isBalanced(bricks, PART_CATALOG)).toBe(true)
    })
  })
})
