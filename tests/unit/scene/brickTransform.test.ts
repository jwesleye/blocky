import { describe, it, expect } from 'vitest'
import { brickToSceneTransform } from '../../../src/scene/brickTransform'
import { PART_CATALOG } from '../../../src/domain/parts/catalog'
import { STUD_PITCH_MM, PLATE_HEIGHT_MM } from '../../../src/domain/grid'
import type { PlacedBrick } from '../../../src/domain/model/types'

describe('brickToSceneTransform', () => {
  it('computes size and centered position for a brick at origin (rot 0)', () => {
    const brick: PlacedBrick = {
      id: '1',
      partId: 'brick-2x4',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }
    const transform = brickToSceneTransform(brick, PART_CATALOG)

    expect(transform.size).toEqual([
      2 * STUD_PITCH_MM,
      3 * PLATE_HEIGHT_MM, // 1 brick = 3 plates
      4 * STUD_PITCH_MM,
    ])
    expect(transform.position).toEqual([
      1 * STUD_PITCH_MM,
      1.5 * PLATE_HEIGHT_MM,
      2 * STUD_PITCH_MM,
    ])
  })

  it('swaps width and length for rot 1', () => {
    const brick: PlacedBrick = {
      id: '2',
      partId: 'brick-2x4',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 1,
    }
    const transform = brickToSceneTransform(brick, PART_CATALOG)

    expect(transform.size).toEqual([
      4 * STUD_PITCH_MM,
      3 * PLATE_HEIGHT_MM,
      2 * STUD_PITCH_MM,
    ])
  })

  it('handles non-zero y correctly', () => {
    const brick: PlacedBrick = {
      id: '3',
      partId: 'brick-2x4',
      color: 'red',
      x: 0,
      y: 3,
      z: 0,
      rot: 0,
    }
    const transform = brickToSceneTransform(brick, PART_CATALOG)

    expect(transform.position[1]).toBe(3 * PLATE_HEIGHT_MM + 1.5 * PLATE_HEIGHT_MM)
  })

  it('applies half-stud offset', () => {
    const brick: PlacedBrick = {
      id: '4',
      partId: 'brick-2x4',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
      offset: { x: 1, z: 1 },
    }
    const transform = brickToSceneTransform(brick, PART_CATALOG)

    expect(transform.position[0]).toBe(1 * STUD_PITCH_MM + 0.5 * STUD_PITCH_MM)
    expect(transform.position[2]).toBe(2 * STUD_PITCH_MM + 0.5 * STUD_PITCH_MM)
  })
})
