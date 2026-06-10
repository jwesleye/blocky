import { describe, expect, it } from 'vitest'

import {
  brickInstanceTransform,
  groupBricksForInstancing,
  PLATE_SCENE_UNIT,
  STUD_SCENE_UNIT,
  type PartDims,
  type RenderBrick,
} from '@/scene/instancing'

const ONE_BY_ONE: PartDims = { w: 1, d: 1, h: 1 }
const TWO_BY_FOUR: PartDims = { w: 2, d: 4, h: 3 }

function getDims(partId: string): PartDims {
  switch (partId) {
    case 'brick-1x1':
      return ONE_BY_ONE
    case 'brick-2x4':
      return TWO_BY_FOUR
    default:
      throw new Error(`unknown part "${partId}"`)
  }
}

describe('groupBricksForInstancing', () => {
  it('returns one bucket per distinct part and color pair', () => {
    const bricks: RenderBrick[] = [
      { partId: 'brick-2x4', color: 'red', x: 0, y: 0, z: 0, rot: 0 },
      { partId: 'brick-2x4', color: 'red', x: 2, y: 0, z: 0, rot: 0 },
      { partId: 'brick-2x4', color: 'blue', x: 0, y: 0, z: 4, rot: 0 },
      { partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 8, rot: 0 },
    ]

    const buckets = groupBricksForInstancing(bricks, getDims)

    expect(buckets.map((bucket) => bucket.key)).toEqual([
      'brick-1x1::red',
      'brick-2x4::blue',
      'brick-2x4::red',
    ])
    expect(
      buckets.find((bucket) => bucket.key === 'brick-2x4::red')?.instances,
    ).toHaveLength(2)
    expect(
      buckets.find((bucket) => bucket.key === 'brick-2x4::blue')?.instances,
    ).toHaveLength(1)
  })

  it('exposes rotation-independent base geometry size per bucket', () => {
    const buckets = groupBricksForInstancing(
      [{ partId: 'brick-2x4', color: 'red', x: 0, y: 0, z: 0, rot: 1 }],
      getDims,
    )

    expect(buckets).toHaveLength(1)
    expect(buckets[0]?.size).toEqual([
      2 * STUD_SCENE_UNIT,
      3 * PLATE_SCENE_UNIT,
      4 * STUD_SCENE_UNIT,
    ])
  })
})

describe('brickInstanceTransform', () => {
  it('computes the center position and rotation for an unrotated brick', () => {
    const brick: RenderBrick = {
      partId: 'brick-1x1',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }

    expect(brickInstanceTransform(brick, ONE_BY_ONE)).toEqual({
      position: [
        0.5 * STUD_SCENE_UNIT,
        0.5 * PLATE_SCENE_UNIT,
        0.5 * STUD_SCENE_UNIT,
      ],
      rotationY: 0,
    })
  })

  it('swaps the footprint center for quarter turns and applies y rotation', () => {
    const brick: RenderBrick = {
      partId: 'brick-2x4',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 1,
    }

    expect(brickInstanceTransform(brick, TWO_BY_FOUR)).toEqual({
      position: [
        2 * STUD_SCENE_UNIT,
        1.5 * PLATE_SCENE_UNIT,
        1 * STUD_SCENE_UNIT,
      ],
      rotationY: Math.PI / 2,
    })
  })

  it('uses the unrotated footprint for the base transform when rot is zero', () => {
    const brick: RenderBrick = {
      partId: 'brick-2x4',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }

    expect(brickInstanceTransform(brick, TWO_BY_FOUR)).toEqual({
      position: [
        1 * STUD_SCENE_UNIT,
        1.5 * PLATE_SCENE_UNIT,
        2 * STUD_SCENE_UNIT,
      ],
      rotationY: 0,
    })
  })
})
