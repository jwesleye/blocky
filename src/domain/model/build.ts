import { z } from 'zod'

import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import type { PlacedBrick } from './types'

const rotationSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
])

export const BuildSchema = z.object({
  version: z.number().int().positive(),
  baseplate: z.object({
    size: z.number().int().positive(),
  }),
  bricks: z.array(
    z.object({
      partId: z.string(),
      color: z.string(),
      x: z.number().int(),
      y: z.number().int(),
      z: z.number().int(),
      rot: rotationSchema,
    }),
  ),
})

export const buildSchema = BuildSchema

export type Build = z.infer<typeof BuildSchema>

export const CURRENT_BUILD_VERSION = 1
export const BUILD_SCHEMA_VERSION = CURRENT_BUILD_VERSION

export function bricksToBuild(
  bricks: PlacedBrick[],
  baseplateSize: number,
): Build {
  return {
    version: CURRENT_BUILD_VERSION,
    baseplate: { size: baseplateSize },
    bricks: bricks.map(({ partId, color, x, y, z, rot }) => ({
      partId,
      color,
      x,
      y,
      z,
      rot,
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
  version: BUILD_SCHEMA_VERSION,
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
