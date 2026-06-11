import { describe, expect, it } from 'vitest'

import { generateStressBuildBricks, generateStressBuildPlacedBricks } from '@/testing/stressBuild'

describe('stressBuild generator', () => {
  it('generates the requested brick count deterministically', () => {
    const first = generateStressBuildBricks(2000)
    const second = generateStressBuildBricks(2000)

    expect(first).toHaveLength(2000)
    expect(second).toEqual(first)
  })

  it('uses the expected color indexing for generated bricks', () => {
    const bricks = generateStressBuildBricks(1100)

    expect(bricks[0]).toMatchObject({
      x: 0,
      z: 0,
      color: 'red',
    })
    expect(bricks[1024]).toMatchObject({
      x: 0,
      y: 3,
      z: 0,
      color: 'blue',
    })
  })

  it('generates deterministic placed-brick ids', () => {
    const bricks = generateStressBuildPlacedBricks(2000)

    expect(bricks[0]?.id).toBe('perf-0-0')
    expect(bricks[1024]?.id).toBe('perf-1-0')
  })

  it('stays structurally compatible with build and placed-brick types', () => {
    const serialized = generateStressBuildBricks(1)
    const placed = generateStressBuildPlacedBricks(1)

    serialized satisfies import('@/domain/model/build').SerializedBrick[]
    placed satisfies import('@/domain/model/types').PlacedBrick[]

    expect(serialized[0]).toBeDefined()
    expect(placed[0]).toBeDefined()
  })
})
