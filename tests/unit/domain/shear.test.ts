import { describe, expect, it } from 'vitest'

import type { HalfStudOffset, PlacedBrick } from '@/domain/model/types'
import { findShearRegion } from '@/domain/physics/shear'

function brick(
  id: string,
  partId: string,
  x: number,
  y: number,
  z: number,
  rot: 0 | 1 | 2 | 3 = 0,
  offset?: HalfStudOffset,
): PlacedBrick {
  return { id, partId, color: 'red', x, y, z, rot, offset }
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

  it('uses half-stud offsets when choosing the outermost shear candidate', () => {
    const component = [
      brick('base', 'brick-1x1', 0, 0, 0),
      brick('a-centered', 'brick-1x2', 0, 3, 0, 1),
      brick('z-offset', 'brick-1x2', 0, 3, 0, 1, { x: 1, z: 0 }),
    ]

    const { shear, remainder } = findShearRegion(component)

    expect(shear.map((brick) => brick.id)).toEqual(['z-offset'])
    expect(remainder.map((brick) => brick.id)).toEqual(['base', 'a-centered'])
  })

  it('keeps a larger cantilever connected while preserving input order', () => {
    const component = [
      brick('base-a', 'brick-2x4', 0, 0, 0),
      brick('base-b', 'brick-2x4', 2, 0, 0),
      brick('span-a', 'plate-2x8', 0, 3, 0, 1),
      brick('span-b', 'plate-2x8', 2, 4, 0, 1),
      brick('tip-a', 'brick-2x2', 7, 5, 0),
      brick('tip-b', 'brick-2x2', 9, 5, 0),
    ]
    const originalOrder = component.map((candidate) => candidate.id)

    const { shear, remainder } = findShearRegion(component)

    expect(shear.map((candidate) => candidate.id)).toEqual(['tip-b'])
    expect(remainder.map((candidate) => candidate.id)).toEqual([
      'base-a',
      'base-b',
      'span-a',
      'span-b',
      'tip-a',
    ])
    expect(component.map((candidate) => candidate.id)).toEqual(originalOrder)
  })
})
