import { describe, expect, it } from 'vitest'

import type { PlacedBrick } from '@/domain/model/types'
import { findShearRegion } from '@/domain/physics/shear'

function brick(
  id: string,
  partId: string,
  x: number,
  y: number,
  z: number,
  rot: 0 | 1 | 2 | 3 = 0,
): PlacedBrick {
  return { id, partId, color: 'red', x, y, z, rot }
}

describe('findShearRegion', () => {
  it('removes only the unsupported overhang brick from a cantilever', () => {
    const component = [
      brick('base', 'brick-1x2', 0, 0, 0, 1),
      brick('bridge', 'plate-1x4', 0, 3, 0, 1),
      brick('tip', 'brick-1x2', 3, 4, 0, 1),
    ]

    const { shear, remainder } = findShearRegion(component)

    expect(shear.map((brick) => brick.id)).toEqual(['tip'])
    expect(remainder.map((brick) => brick.id)).toEqual(['base', 'bridge'])
  })

  it('expands the shear when needed to keep the remainder connected', () => {
    const component = [
      brick('base', 'brick-1x1', 0, 0, 0),
      brick('bridge', 'plate-1x4', 0, 3, 0, 1),
      brick('tip', 'brick-1x2', 2, 4, 0, 1),
    ]

    const { shear, remainder } = findShearRegion(component)

    expect(shear.map((brick) => brick.id)).toEqual(['tip', 'bridge'])
    expect(remainder.map((brick) => brick.id)).toEqual(['base'])
  })

  it('handles a single overhang brick as the minimal shear region', () => {
    const component = [
      brick('base', 'brick-1x1', 0, 0, 0),
      brick('overhang', 'plate-1x4', 0, 3, 0, 1),
    ]

    const { shear, remainder } = findShearRegion(component)

    expect(shear.map((brick) => brick.id)).toEqual(['overhang'])
    expect(remainder.map((brick) => brick.id)).toEqual(['base'])
  })
})
