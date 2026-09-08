import { describe, expect, it } from 'vitest'
import {
  bricksToBuild,
  buildToBricks,
  parseBuild,
  serializeBuild,
  BuildSchema,
} from '@/domain/model/build'
import type { PlacedBrick } from '@/domain/model/types'
import { saveBuild, loadBuild } from '@/domain/persistence/autosave'
import {
  encodeBuildToShareToken,
  decodeShareToken,
} from '@/domain/persistence/shareUrl'
import { SharedBuildPayloadSchema } from '@/domain/persistence/sharedBuildContract'
import { PublishRequestSchema } from '../../../../backend/src/validation'

const brick: PlacedBrick = {
  id: 'b',
  partId: 'brick-1x1',
  color: 'red',
  x: 4,
  y: 0,
  z: 4,
  rot: 0,
}

describe('hinge persistence compatibility', () => {
  it.each([
    { version: 1, extra: {} },
    { version: 2, extra: { offset: { x: 1, z: 0 } as const } },
    { version: 3, extra: { mount: 'px' as const } },
    { version: 4, extra: { hinge: 'x' as const } },
    {
      version: 4,
      extra: { hinge: 'z' as const, offset: { x: 1, z: 0 } as const },
    },
  ])(
    'preserves version $version through every persistence contract',
    ({ version, extra }) => {
      const build = bricksToBuild([{ ...brick, ...extra }], 32)
      expect(build.version).toBe(version)
      expect(parseBuild(serializeBuild(build))).toEqual(build)
      expect(bricksToBuild(buildToBricks(build), 32)).toEqual(build)
      let saved: string | null = null
      const storage = {
        getItem: () => saved,
        setItem: (_key: string, value: string) => {
          saved = value
        },
        removeItem: () => {
          saved = null
        },
      }
      expect(saveBuild(build, storage)).toBe(true)
      expect(loadBuild(storage)).toEqual(build)
      expect(decodeShareToken(encodeBuildToShareToken(build))).toEqual(build)
      const gallery = {
        title: 'Hinge test',
        visibility: 'public',
        author: { identityMode: 'anonymous' },
      }
      expect(PublishRequestSchema.parse({ build, gallery }).build).toEqual(
        build,
      )
      expect(
        SharedBuildPayloadSchema.parse({
          contractVersion: 1,
          buildId: 'hinge-test',
          build,
          gallery: {
            ...gallery,
            publishedAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        }).build,
      ).toEqual(build)
    },
  )

  it.each([1, 2, 3])(
    'rejects hinge metadata in a v%s envelope on frontend and backend',
    (version) => {
      const build = {
        version,
        baseplate: { size: 32 },
        bricks: [{ ...brick, hinge: 'x' }],
      }
      expect(BuildSchema.safeParse(build).success).toBe(false)
      expect(
        PublishRequestSchema.safeParse({
          build,
          gallery: {
            title: 'Invalid',
            visibility: 'public',
            author: { identityMode: 'anonymous' },
          },
        }).success,
      ).toBe(false)
    },
  )

  it('rejects an invalid hinge axis on frontend and backend', () => {
    const build = {
      version: 4,
      baseplate: { size: 32 },
      bricks: [{ ...brick, hinge: 'y' }],
    }
    expect(BuildSchema.safeParse(build).success).toBe(false)
    expect(
      PublishRequestSchema.safeParse({
        build,
        gallery: {
          title: 'Invalid',
          visibility: 'public',
          author: { identityMode: 'anonymous' },
        },
      }).success,
    ).toBe(false)
  })
})
