import { assertSupportedBaseplateSize } from '@/domain/grid'
import {
  BUILD_SCHEMA_VERSION,
  bricksToBuild,
  parseBuild,
  serializeBuild,
} from '@/domain/model/build'
import { createBrickId } from '@/domain/model/ids'
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
export { createBrickId }
export { BUILD_SCHEMA_VERSION }
export type { Build } from '@/domain/model/build'

/** Serializes the runtime build model to a compact Build JSON string. */
export function serialize(state: BuildState): string {
  const baseplateSize = state.baseplateSize
  assertSupportedBaseplateSize(baseplateSize)
  return serializeBuild(
    bricksToBuild(Object.values(state.bricks), baseplateSize),
  )
}

/**
 * Parses and validates a Build JSON string into a runtime build model. Throws
 * if the JSON is malformed or fails schema validation. Brick ids are freshly
 * generated and the selection starts empty.
 */
export function deserialize(json: string): BuildState {
  const parsed = parseBuild(json)
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
    baseplateSize: parsed.baseplate.size,
  }
}
