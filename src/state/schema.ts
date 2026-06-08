import { z } from 'zod'

import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import type { BuildState, PlacedBrick } from '@/domain/model/types'
import { buildConnectionGraph } from '@/domain/physics/graph'
import { PART_CATALOG } from '@/domain/parts/catalog'

/**
 * Build JSON schema and (de)serialization helpers.
 *
 * The on-disk / on-wire form mirrors PRD §9.2: a versioned envelope around a
 * compact list of placed bricks. Runtime-only state (the selection) and the
 * per-session brick ids are intentionally excluded — ids are regenerated on
 * load so two clients never collide on a shared build.
 */
export const BUILD_SCHEMA_VERSION = 2

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

const serializedBrickSchema = z.object({
  partId: z.string(),
  color: z.string(),
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int(),
  rot: rotationSchema,
  offset: halfStudOffsetSchema.optional(),
})

export const buildSchema = z.object({
  version: buildVersionSchema,
  baseplate: z.object({ size: z.literal(BASEPLATE_SIZE_STUDS) }),
  bricks: z.array(serializedBrickSchema),
})

export type SerializedBrick = z.infer<typeof serializedBrickSchema>
export type Build = z.infer<typeof buildSchema>

let idCounter = 0

/** Generates a unique id for a placed brick. */
export function createBrickId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  idCounter += 1
  return `brick-${idCounter}`
}

/** Serializes the runtime build model to a compact Build JSON string. */
export function serialize(state: BuildState): string {
  const bricks: SerializedBrick[] = Object.values(state.bricks).map(
    ({ partId, color, x, y, z, rot, offset }) => ({
      partId,
      color,
      x,
      y,
      z,
      rot,
      ...(offset ? { offset } : {}),
    }),
  )
  const hasOffset = bricks.some((brick) => brick.offset !== undefined)
  const build: Build = {
    version: hasOffset ? BUILD_SCHEMA_VERSION : 1,
    baseplate: { size: BASEPLATE_SIZE_STUDS },
    bricks,
  }
  return JSON.stringify(build)
}

/**
 * Parses and validates a Build JSON string into a runtime build model. Throws
 * if the JSON is malformed or fails schema validation. Brick ids are freshly
 * generated and the selection starts empty.
 */
export function deserialize(json: string): BuildState {
  const parsed = buildSchema.parse(JSON.parse(json))
  const bricks: Record<string, PlacedBrick> = {}
  for (const brick of parsed.bricks) {
    const id = createBrickId()
    bricks[id] = { id, ...brick }
  }
  return {
    bricks,
    selection: new Set<string>(),
    connectionGraph: buildConnectionGraph(Object.values(bricks), PART_CATALOG),
    lastCollapse: null,
  }
}
