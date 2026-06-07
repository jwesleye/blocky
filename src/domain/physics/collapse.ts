import type { PlacedBrick } from '../model/types'
import { PART_CATALOG } from '../parts/catalog'
import { buildConnectionGraph } from './graph'
import { getFloatingBricks } from './grounding'
import { getUnbalancedBricks } from './balance'

/**
 * Returns the set of brick IDs that should collapse after an edit.
 *
 * Phase 1 MVP collapses:
 *  - Floating bricks: any brick without a path to the baseplate.
 *  - Whole unbalanced components: any connected component whose center-of-mass
 *    projection falls outside the convex hull of its baseplate contact footprint.
 *
 * Smart shear (break only the overhanging sub-region) is deferred to Phase 2.
 */
export function selectCollapsingBricks(bricks: PlacedBrick[]): Set<string> {
  if (bricks.length === 0) return new Set()

  const graph = buildConnectionGraph(bricks, PART_CATALOG)
  const floating = getFloatingBricks(bricks, graph)
  const unbalanced = getUnbalancedBricks(bricks, graph, PART_CATALOG)

  return new Set([...floating, ...unbalanced])
}
