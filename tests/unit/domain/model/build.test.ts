import { describe, it, expect, vi, afterEach } from 'vitest'

import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import {
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
import { createBrickId } from '@/domain/model/ids'
import type { PlacedBrick } from '@/domain/model/types'

const sampleBuild: Build = {
  version: 1,
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

  it('rejects an unsupported baseplate size', () => {
    const badBaseplate = {
      version: 1,
      baseplate: { size: 33 },
      bricks: [],
    }
    expect(() => validateBuild(badBaseplate)).toThrow()
    expect(safeParseBuild(JSON.stringify(badBaseplate))).toBeNull()
  })

  it('rejects a zero baseplate size', () => {
    const badBaseplate = {
      version: 1,
      baseplate: { size: 0 },
      bricks: [],
    }
    expect(() => validateBuild(badBaseplate)).toThrow()
    expect(safeParseBuild(JSON.stringify(badBaseplate))).toBeNull()
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

    expect(build.version).toBe(1)
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

  it('round-trips half-stud offsets without affecting classic bricks', () => {
    const bricks = [
      {
        id: 'offset',
        partId: 'brick-1x1',
        color: 'yellow',
        x: 2,
        y: 0,
        z: 3,
        rot: 1,
        offset: { x: 1, z: 0 },
      },
      {
        id: 'classic',
        partId: 'plate-1x2',
        color: 'green',
        x: 0,
        y: 1,
        z: 0,
        rot: 0,
      },
    ] as unknown as PlacedBrick[]

    const serializedBuild = bricksToBuild(bricks, 32)
    const restored = buildToBricks(parseBuild(serializeBuild(serializedBuild)))

    expect(serializedBuild.version).toBe(2)
    expect(restored).toHaveLength(2)
    expect(restored[0]).toMatchObject({
      partId: 'brick-1x1',
      color: 'yellow',
      x: 2,
      y: 0,
      z: 3,
      rot: 1,
      offset: { x: 1, z: 0 },
    })
    expect(restored[1]).toMatchObject({
      partId: 'plate-1x2',
      color: 'green',
      x: 0,
      y: 1,
      z: 0,
      rot: 0,
    })
    expect(restored[1]).not.toHaveProperty('offset')
  })

  it('converts a build to placed bricks with generated ids', () => {
    const bricks = buildToBricks(sampleBuild)

    expect(bricks).toHaveLength(2)
    expect(bricks[0].id).not.toBe(bricks[1].id)
    expect(bricks[0]).toMatchObject(sampleBuild.bricks[0])
    expect(bricks[1]).toMatchObject(sampleBuild.bricks[1])
  })
})

describe('version 3 — SNOT mount', () => {
  it('selects version 3 when any brick has a mount', () => {
    const bricks: PlacedBrick[] = [
      {
        id: '1',
        partId: 'brick-1x1',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
        mount: 'px',
      },
    ]
    expect(bricksToBuild(bricks, 32).version).toBe(3)
  })

  it('selects version 2 when only offsets are present (no mount)', () => {
    const bricks: PlacedBrick[] = [
      {
        id: '1',
        partId: 'brick-1x1',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
        offset: { x: 1, z: 0 },
      },
    ]
    expect(bricksToBuild(bricks, 32).version).toBe(2)
  })

  it('selects version 1 for a plain build (no offset, no mount)', () => {
    const bricks: PlacedBrick[] = [
      { id: '1', partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 0, rot: 0 },
    ]
    expect(bricksToBuild(bricks, 32).version).toBe(1)
  })

  it('round-trips a brick with mount through bricksToBuild → buildToBricks', () => {
    const bricks: PlacedBrick[] = [
      {
        id: '1',
        partId: 'brick-1x1',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
        mount: 'px',
      },
    ]
    const restored = buildToBricks(bricksToBuild(bricks, 32))
    expect(restored[0]).toMatchObject({ mount: 'px' })
  })

  it('round-trips a brick with mount through serializeBuild → parseBuild', () => {
    const bricks: PlacedBrick[] = [
      {
        id: '1',
        partId: 'brick-1x1',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
        mount: 'px',
      },
    ]
    const build = bricksToBuild(bricks, 32)
    const restored = parseBuild(serializeBuild(build))
    expect(restored.version).toBe(3)
    expect(restored.bricks[0]).toMatchObject({ mount: 'px' })
  })

  it('rejects an unknown mount value', () => {
    const bad = JSON.stringify({
      version: 3,
      baseplate: { size: 32 },
      bricks: [
        {
          partId: 'brick-1x1',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
          mount: 'sideways',
        },
      ],
    })
    expect(safeParseBuild(bad)).toBeNull()
    expect(() => validateBuild(JSON.parse(bad))).toThrow()
  })

  it('rejects version 4 (unsupported future version)', () => {
    const bad = JSON.stringify({
      version: 4,
      baseplate: { size: 32 },
      bricks: [],
    })
    expect(safeParseBuild(bad)).toBeNull()
    expect(() => validateBuild(JSON.parse(bad))).toThrow()
  })

  it('preserves v1 classic builds as version 1 after bumping CURRENT_BUILD_VERSION', () => {
    const build = createEmptyBuild()
    expect(build.version).toBe(1)
    expect(buildSchema.safeParse(build).success).toBe(true)
  })
})

describe('version/feature envelope compatibility', () => {
  it('rejects mount on a version 1 envelope', () => {
    const bad = JSON.stringify({
      version: 1,
      baseplate: { size: 32 },
      bricks: [{ partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 0, rot: 0, mount: 'px' }],
    })
    expect(safeParseBuild(bad)).toBeNull()
    expect(() => validateBuild(JSON.parse(bad))).toThrow()
  })

  it('rejects mount on a version 2 envelope', () => {
    const bad = JSON.stringify({
      version: 2,
      baseplate: { size: 32 },
      bricks: [{ partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 0, rot: 0, mount: 'nx' }],
    })
    expect(safeParseBuild(bad)).toBeNull()
    expect(() => validateBuild(JSON.parse(bad))).toThrow()
  })

  it('rejects offset on a version 1 envelope', () => {
    const bad = JSON.stringify({
      version: 1,
      baseplate: { size: 32 },
      bricks: [{ partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 0, rot: 0, offset: { x: 1, z: 0 } }],
    })
    expect(safeParseBuild(bad)).toBeNull()
    expect(() => validateBuild(JSON.parse(bad))).toThrow()
  })

  it('accepts offset on a version 2 envelope', () => {
    const good = JSON.stringify({
      version: 2,
      baseplate: { size: 32 },
      bricks: [{ partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 0, rot: 0, offset: { x: 1, z: 0 } }],
    })
    expect(safeParseBuild(good)).not.toBeNull()
  })

  it('accepts mount on a version 3 envelope', () => {
    const good = JSON.stringify({
      version: 3,
      baseplate: { size: 32 },
      bricks: [{ partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 0, rot: 0, mount: 'pz' }],
    })
    expect(safeParseBuild(good)).not.toBeNull()
  })
})

describe('createBrickId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns unique ids using crypto.randomUUID when available', () => {
    let call = 0
    const uuids = ['uuid-a', 'uuid-b']
    vi.stubGlobal('crypto', { randomUUID: () => uuids[call++] })
    const id1 = createBrickId()
    const id2 = createBrickId()
    expect(id1).toBe('uuid-a')
    expect(id2).toBe('uuid-b')
    expect(id1).not.toBe(id2)
  })

  it('falls back to brick-<counter> format when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {})
    const id1 = createBrickId()
    const id2 = createBrickId()
    expect(id1).toMatch(/^brick-\d+$/)
    expect(id2).toMatch(/^brick-\d+$/)
    expect(id1).not.toBe(id2)
  })
})

describe('buildToBricks (uses shared createBrickId)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('assigns unique ids from createBrickId to each brick', () => {
    let call = 0
    const uuids = ['uuid-a', 'uuid-b']
    vi.stubGlobal('crypto', { randomUUID: () => uuids[call++] })
    const bricks = buildToBricks(sampleBuild)
    expect(bricks).toHaveLength(2)
    expect(bricks[0].id).toBe('uuid-a')
    expect(bricks[1].id).toBe('uuid-b')
    expect(bricks[0]).toMatchObject(sampleBuild.bricks[0])
    expect(bricks[1]).toMatchObject(sampleBuild.bricks[1])
  })
})

describe('createEmptyBuild', () => {
  it('produces a valid empty build at the current version', () => {
    const build = createEmptyBuild()

    expect(build.version).toBe(1)
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

  it('round-trips a supported larger baseplate size', () => {
    const largerBaseplateBuild: Build = {
      ...sampleBuild,
      baseplate: { size: 48 },
    }

    const restored = parseBuild(serializeBuild(largerBaseplateBuild))

    expect(restored).toEqual(largerBaseplateBuild)
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

  it('accepts existing v1 payloads without offsets', () => {
    const classicBuild = JSON.stringify({
      version: 1,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [
        {
          partId: 'brick-2x4',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
      ],
    })

    expect(safeParseBuild(classicBuild)).toEqual({
      version: 1,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [
        {
          partId: 'brick-2x4',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
      ],
    })
  })

  it('returns null for malformed JSON instead of throwing', () => {
    expect(safeParseBuild('}{')).toBeNull()
  })

  it('returns null when a brick has an invalid rotation', () => {
    const bad = JSON.stringify({
      version: 1,
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
      version: 1,
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

  it('returns null when an offset is out of range', () => {
    const bad = JSON.stringify({
      version: 2,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [
        {
          partId: 'brick-1x1',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
          offset: { x: 2, z: 0 },
        },
      ],
    })

    expect(safeParseBuild(bad)).toBeNull()
  })

  it('returns null when x is greater than the baseplate max', () => {
    const bad = JSON.stringify({
      version: 1,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [
        {
          partId: 'brick-1x1',
          color: 'red',
          x: BASEPLATE_SIZE_STUDS,
          y: 0,
          z: 0,
          rot: 0,
        },
      ],
    })

    expect(safeParseBuild(bad)).toBeNull()
  })

  it('accepts x coordinates that fit within a larger supported baseplate', () => {
    const largerBaseplate = JSON.stringify({
      version: 1,
      baseplate: { size: 48 },
      bricks: [
        { partId: 'brick-1x1', color: 'red', x: 40, y: 0, z: 0, rot: 0 },
      ],
    })

    expect(safeParseBuild(largerBaseplate)).not.toBeNull()
  })

  it('returns null when z is negative', () => {
    const bad = JSON.stringify({
      version: 1,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [
        { partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: -1, rot: 0 },
      ],
    })

    expect(safeParseBuild(bad)).toBeNull()
  })

  it('returns null when y is negative', () => {
    const bad = JSON.stringify({
      version: 1,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [
        { partId: 'brick-1x1', color: 'red', x: 0, y: -1, z: 0, rot: 0 },
      ],
    })

    expect(safeParseBuild(bad)).toBeNull()
  })

  it('accepts bricks at the baseplate edges', () => {
    const atMinEdge = JSON.stringify({
      version: 1,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [{ partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 0, rot: 0 }],
    })
    const atMaxEdge = JSON.stringify({
      version: 1,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [
        {
          partId: 'brick-1x1',
          color: 'red',
          x: BASEPLATE_SIZE_STUDS - 1,
          y: 0,
          z: BASEPLATE_SIZE_STUDS - 1,
          rot: 0,
        },
      ],
    })

    expect(safeParseBuild(atMinEdge)).not.toBeNull()
    expect(safeParseBuild(atMaxEdge)).not.toBeNull()
  })

  it('returns null when x exceeds a larger baseplate size', () => {
    const bad = JSON.stringify({
      version: 1,
      baseplate: { size: 48 },
      bricks: [
        { partId: 'brick-1x1', color: 'red', x: 48, y: 0, z: 0, rot: 0 },
      ],
    })

    expect(safeParseBuild(bad)).toBeNull()
  })
})
