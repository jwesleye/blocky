import { z } from 'zod'
import type { PlacedBrick } from './types'

export const BuildSchema = z.object({
  version: z.number(),
  baseplate: z.object({
    size: z.number(),
  }),
  bricks: z.array(
    z.object({
      partId: z.string(),
      color: z.string(),
      x: z.number().int(),
      y: z.number().int(),
      z: z.number().int(),
      rot: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    }),
  ),
})

export type Build = z.infer<typeof BuildSchema>

export const CURRENT_BUILD_VERSION = 1

export function bricksToBuild(bricks: PlacedBrick[], baseplateSize: number): Build {
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
