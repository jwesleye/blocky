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
      const cantileverBricks: PlacedBrick[] = [
        {
          id: '1',
          partId: 'brick-1x6',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 1,
        },

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

      expect(isBalanced(cantileverBricks, PART_CATALOG)).toBe(true)
    })

    it('obvious overhang returns false', () => {
      const bricks: PlacedBrick[] = [
        {
          id: '1',
          partId: 'brick-1x2',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 1,
        },

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

      expect(isBalanced(bricks, PART_CATALOG)).toBe(true)
    })

    it('returns true for empty array', () => {
      expect(isBalanced([], PART_CATALOG)).toBe(true)
    })

    it('correctly evaluates balance for a mixed classic+SNOT component', () => {
      const bricks: PlacedBrick[] = [
        {
          id: 'std',
          partId: 'brick-2x2',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
        {
          id: 'mnt',
          partId: 'brick-1x1',
          color: 'blue',
          x: 3,
          y: 1,
          z: 0,
          rot: 0,
          mount: 'px' as const,
        },
      ]
      expect(isBalanced(bricks, PART_CATALOG)).toBe(true)
    })

    it('fails closed for a mixed classic+hinge component', () => {
      const bricks: PlacedBrick[] = [
        {
          id: 'base',
          partId: 'brick-2x2',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
        {
          id: 'hinge',
          partId: 'brick-1x1',
          color: 'blue',
          x: 0,
          y: 3,
          z: 0,
          rot: 0,
          hinge: 'x',
        },
      ]

      expect(isBalanced(bricks, PART_CATALOG)).toBe(false)
    })

    it('offset brick is balanced when its shifted CoM lands inside the support footprint', () => {
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
