import { describe, it, expect } from 'vitest'
import { bricksToBuild, buildToBricks, validateBuild } from '@/domain/model/build'
import type { PlacedBrick } from '@/domain/model/types'
import type { Build } from '@/domain/model/build'

describe('Build Schema', () => {
  it('should validate a correct build object', () => {
    const validBuild: Build = {
      version: 1,
      baseplate: { size: 32 },
      bricks: [
        {
          partId: 'brick-1x1',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
      ],
    }
    expect(() => validateBuild(validBuild)).not.toThrow()
    expect(validateBuild(validBuild)).toEqual(validBuild)
  })

  it('should throw on invalid build object', () => {
    const invalidBuild = {
      version: '1', // should be number
      baseplate: { size: 32 },
      bricks: [],
    }
    expect(() => validateBuild(invalidBuild)).toThrow()
  })

  it('should convert bricks to build correctly', () => {
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
    const build = bricksToBuild(bricks, 32)
    expect(build.version).toBe(1)
    expect(build.baseplate.size).toBe(32)
    expect(build.bricks).toHaveLength(1)
    expect(build.bricks[0]).toEqual({
      partId: 'brick-1x1',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    })
  })

  it('should convert build to bricks with unique IDs', () => {
    const build: Build = {
      version: 1,
      baseplate: { size: 32 },
      bricks: [
        {
          partId: 'brick-1x1',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
        {
          partId: 'brick-1x2',
          color: 'blue',
          x: 1,
          y: 0,
          z: 0,
          rot: 1,
        },
      ],
    }
    const bricks = buildToBricks(build)
    expect(bricks).toHaveLength(2)
    expect(bricks[0].id).not.toBe(bricks[1].id)
    expect(bricks[0].partId).toBe('brick-1x1')
    expect(bricks[1].partId).toBe('brick-1x2')
  })
})
