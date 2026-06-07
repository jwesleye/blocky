import { describe, it, expect } from 'vitest'

import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import {
  BUILD_SCHEMA_VERSION,
  bricksToBuild,
  buildSchema,
  buildToBricks,
  createEmptyBuild,
  parseBuild,
  safeParseBuild,
  serializeBuild,
  validateBuild,
} from '@/domain/model/build'
import type { Build } from '@/domain/model/build'
import type { PlacedBrick } from '@/domain/model/types'

const sampleBuild: Build = {
  version: BUILD_SCHEMA_VERSION,
  baseplate: { size: BASEPLATE_SIZE_STUDS },
  bricks: [
    { partId: 'brick-2x4', color: 'red', x: 0, y: 0, z: 0, rot: 0 },
    { partId: 'plate-1x2', color: 'blue', x: 1, y: 3, z: 2, rot: 2 },
  ],
}

describe('validateBuild', () => {
  it('accepts a correct build object', () => {
    expect(() => validateBuild(sampleBuild)).not.toThrow()
    expect(validateBuild(sampleBuild)).toEqual(sampleBuild)
  })

  it('throws on an invalid build object', () => {
    const invalidBuild = {
      version: '1',
      baseplate: { size: 32 },
      bricks: [],
    }
    expect(() => validateBuild(invalidBuild)).toThrow()
  })
})

describe('bricksToBuild / buildToBricks', () => {
  it('converts placed bricks to a serializable build', () => {
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

    expect(build.version).toBe(BUILD_SCHEMA_VERSION)
    expect(build.baseplate.size).toBe(32)
    expect(build.bricks).toEqual([
      {
        partId: 'brick-1x1',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
      },
    ])
  })

  it('converts a build to placed bricks with generated ids', () => {
    const bricks = buildToBricks(sampleBuild)

    expect(bricks).toHaveLength(2)
    expect(bricks[0].id).not.toBe(bricks[1].id)
    expect(bricks[0]).toMatchObject(sampleBuild.bricks[0])
    expect(bricks[1]).toMatchObject(sampleBuild.bricks[1])
  })
})

describe('createEmptyBuild', () => {
  it('produces a valid empty build at the current version', () => {
    const build = createEmptyBuild()

    expect(build.version).toBe(BUILD_SCHEMA_VERSION)
    expect(build.baseplate.size).toBe(BASEPLATE_SIZE_STUDS)
    expect(build.bricks).toEqual([])
    expect(buildSchema.safeParse(build).success).toBe(true)
  })
})

describe('serializeBuild / parseBuild', () => {
  it('round-trips a build through JSON without loss', () => {
    const restored = parseBuild(serializeBuild(sampleBuild))
    expect(restored).toEqual(sampleBuild)
  })

  it('rejects a build that does not match the schema', () => {
    expect(() => parseBuild('{"version":1}')).toThrow()
  })

  it('rejects malformed JSON', () => {
    expect(() => parseBuild('not json {')).toThrow()
  })
})

describe('safeParseBuild', () => {
  it('returns the build for valid input', () => {
    expect(safeParseBuild(serializeBuild(sampleBuild))).toEqual(sampleBuild)
  })

  it('returns null for malformed JSON instead of throwing', () => {
    expect(safeParseBuild('}{')).toBeNull()
  })

  it('returns null when a brick has an invalid rotation', () => {
    const bad = JSON.stringify({
      version: BUILD_SCHEMA_VERSION,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [
        {
          partId: 'brick-1x1',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 7,
        },
      ],
    })

    expect(safeParseBuild(bad)).toBeNull()
  })

  it('returns null when a coordinate is not an integer', () => {
    const bad = JSON.stringify({
      version: BUILD_SCHEMA_VERSION,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [
        {
          partId: 'brick-1x1',
          color: 'red',
          x: 0.5,
          y: 0,
          z: 0,
          rot: 0,
        },
      ],
    })

    expect(safeParseBuild(bad)).toBeNull()
  })
})
