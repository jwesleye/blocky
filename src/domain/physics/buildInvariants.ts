import type { PlacedBrick } from '../model/types'
import { CATALOG_BY_ID, type PartCatalog } from '../parts/catalog'
import { buildConnectionGraph } from './graph'
import { getFloatingBricks } from './grounding'
import { findCollisions } from './transform'

/**
 * The PRD §5.1 (anti-floating) and no-overlap invariants for a whole build,
 * reported as the offending brick ids.
 */
export interface BuildInvariantViolations {
  /** Ids of bricks with no transitive path to the baseplate. */
  floating: string[]
  /** Ids of bricks that share an occupied cell with another brick. */
  colliding: string[]
}

/**
 * Check a set of placed bricks against the core structural invariants:
 * grounding (no floating bricks) and no overlap (no shared occupied cells).
 *
 * This is a pure helper for the build-load paths (JSON import, shareable-URL
 * load, startup restore), which bypass the interactive placement-validity path.
 * It reuses the existing physics helpers rather than reimplementing collision
 * or grounding logic, so its semantics match interactive placement — including
 * skipping bricks whose `partId` is absent from the catalog.
 */
export function findBuildInvariantViolations(
  bricks: PlacedBrick[],
  catalog: PartCatalog = CATALOG_BY_ID,
): BuildInvariantViolations {
  const colliding = [...findCollisions(bricks, catalog)]
  const floating = [
    ...getFloatingBricks(bricks, buildConnectionGraph(bricks, catalog)),
  ]
  return { floating, colliding }
}
