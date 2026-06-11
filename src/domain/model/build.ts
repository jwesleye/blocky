import { z } from 'zod'

import {
  BASEPLATE_SIZE_STUDS,
  SUPPORTED_BASEPLATE_SIZES,
  type BaseplateSize,
  boundsForSize,
  isSupportedBaseplateSize,
} from '@/domain/grid'
import { createBrickId } from '@/domain/model/ids'
import type { PlacedBrick } from './types'

const buildVersionSchema = z.union([z.literal(1), z.literal(2), z.literal(3)])

const rotationSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
])

const halfStudOffsetSchema = z.object({
  x: z.union([z.literal(0), z.literal(1)]),
  z: z.union([z.literal(0), z.literal(1)]),
})

const brickMountSchema = z.union([
  z.literal('px'),
  z.literal('nx'),
  z.literal('pz'),
  z.literal('nz'),
])

const buildBrickSchema = z.object({
  partId: z.string(),
  color: z.string(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  z: z.number().int().min(0),
  rot: rotationSchema,
  offset: halfStudOffsetSchema.optional(),
  mount: brickMountSchema.optional(),
})

export type SerializedBrick = z.infer<typeof buildBrickSchema>

const baseplateSizeSchema = z.custom<BaseplateSize>(
  (size) => typeof size === 'number' && isSupportedBaseplateSize(size),
  `Supported baseplate sizes are ${SUPPORTED_BASEPLATE_SIZES.join(', ')}`,
)

export const BuildSchema = z
  .object({
    version: buildVersionSchema,
    baseplate: z.object({
      size: baseplateSizeSchema,
    }),
    bricks: z.array(buildBrickSchema),
  })
  .superRefine((build, ctx) => {
    const bounds = boundsForSize(build.baseplate.size)

    for (const [index, brick] of build.bricks.entries()) {
      if (brick.x > bounds.maxX) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bricks', index, 'x'],
          message: `x must be less than or equal to ${bounds.maxX}`,
        })
      }

      if (brick.z > bounds.maxZ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bricks', index, 'z'],
          message: `z must be less than or equal to ${bounds.maxZ}`,
        })
      }

      if (brick.offset !== undefined && build.version < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bricks', index, 'offset'],
          message: `offset requires version 2 or later; envelope is version ${build.version}`,
        })
      }

      if (brick.mount !== undefined && build.version < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bricks', index, 'mount'],
          message: `mount requires version 3; envelope is version ${build.version}`,
        })
      }
    }
  })

export const buildSchema = BuildSchema

export type Build = z.infer<typeof BuildSchema>

export const CURRENT_BUILD_VERSION = 3
export const BUILD_SCHEMA_VERSION = CURRENT_BUILD_VERSION

export function bricksToBuild(
  bricks: PlacedBrick[],
  baseplateSize: BaseplateSize,
): Build {
  const hasMount = bricks.some((brick) => brick.mount !== undefined)
  const hasOffset = bricks.some((brick) => brick.offset !== undefined)
  const version = hasMount ? 3 : hasOffset ? 2 : 1

  return {
    version,
    baseplate: { size: baseplateSize },
    bricks: bricks.map(({ partId, color, x, y, z, rot, offset, mount }) => ({
      partId,
      color,
      x,
      y,
      z,
      rot,
      ...(offset ? { offset } : {}),
      ...(mount ? { mount } : {}),
    })),
  }
}

export function buildToBricks(build: Build): PlacedBrick[] {
  return build.bricks.map((brick) => ({
    id: createBrickId(),
    ...brick,
  }))
}

export function validateBuild(data: unknown): Build {
  return BuildSchema.parse(data)
}

export const createEmptyBuild = (): Build => ({
  version: 1,
  baseplate: { size: BASEPLATE_SIZE_STUDS },
  bricks: [],
})

export const serializeBuild = (build: Build): string =>
  JSON.stringify(validateBuild(build))

export const parseBuild = (json: string): Build =>
  validateBuild(JSON.parse(json))

export const safeParseBuild = (json: string): Build | null => {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  const result = BuildSchema.safeParse(data)
  return result.success ? result.data : null
}
