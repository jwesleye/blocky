import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import { createBrickId } from '@/domain/model/ids'
import type { BuildState, PlacedBrick } from '@/domain/model/types'
import { buildConnectionGraph } from '@/domain/physics/graph'
import { PART_CATALOG } from '@/domain/parts/catalog'

import {
  buildSchema,
  BUILD_SCHEMA_VERSION,
} from '@/domain/model/build'
import type { Build, SerializedBrick } from '@/domain/model/build'

/**
 * Build JSON schema and (de)serialization helpers.
 *
 * The on-disk / on-wire form mirrors PRD §9.2: a versioned envelope around a
 * compact list of placed bricks. Runtime-only state (the selection) and the
 * per-session brick ids are intentionally excluded — ids are regenerated on
 * load so two clients never collide on a shared build.
 */
export { buildSchema, BUILD_SCHEMA_VERSION }
export { createBrickId }
export type { Build, SerializedBrick }

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
