import { z } from 'zod'

import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import type { PlacedBrick } from './types'

const buildVersionSchema = z.union([z.literal(1), z.literal(2)])

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

export const serializedBrickSchema = z.object({
  partId: z.string(),
  color: z.string(),
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int(),
  rot: rotationSchema,
  offset: halfStudOffsetSchema.optional(),
})

export type SerializedBrick = z.infer<typeof serializedBrickSchema>

export const BuildSchema = z.object({
  version: buildVersionSchema,
  baseplate: z.object({
    size: z.literal(BASEPLATE_SIZE_STUDS),
  }),
  bricks: z.array(serializedBrickSchema),
})

export const buildSchema = BuildSchema

export type Build = z.infer<typeof BuildSchema>

export const CURRENT_BUILD_VERSION = 2
export const BUILD_SCHEMA_VERSION = CURRENT_BUILD_VERSION

export function bricksToBuild(
  bricks: PlacedBrick[],
  baseplateSize: typeof BASEPLATE_SIZE_STUDS,
): Build {
  const hasOffset = bricks.some((brick) => brick.offset !== undefined)

  return {
    version: hasOffset ? CURRENT_BUILD_VERSION : 1,
    baseplate: { size: baseplateSize },
    bricks: bricks.map(({ partId, color, x, y, z, rot, offset }) => ({
      partId,
      color,
      x,
      y,
      z,
      rot,
      ...(offset ? { offset } : {}),
    })),
  }
}

export function buildToBricks(build: Build): PlacedBrick[] {
  return build.bricks.map((brick, index) => ({
    id: `brick-${index}-${Math.random().toString(36).substring(2, 11)}`,
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
