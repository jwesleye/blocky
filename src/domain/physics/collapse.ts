import type { PlacedBrick } from '../model/types'
import { CATALOG_BY_ID as PART_CATALOG } from '../parts/catalog'
import { buildConnectionGraph } from './graph'
import { getFloatingBricks } from './grounding'
import { isBalanced } from './balance'
import { findShearRegion } from './shear'
import { connectedComponents } from 'graphology-components'

/**
 * Returns the set of brick IDs that should collapse after an edit.
 *
 * Collapses:
 *  - Floating bricks: any brick without a path to the baseplate.
 *  - Sheared unstable regions: only the minimal overhanging sub-region of each
 *    grounded, unbalanced component falls away.
 */
export function selectCollapsingBricks(bricks: PlacedBrick[]): Set<string> {
  if (bricks.length === 0) return new Set()

  const graph = buildConnectionGraph(bricks, PART_CATALOG)
  const floating = getFloatingBricks(bricks, graph)
  const brickById = new Map(bricks.map((brick) => [brick.id, brick]))
  const sheared = new Set<string>()

  for (const componentIds of connectedComponents(graph)) {
    const component = componentIds
      .map((id) => brickById.get(id))
      .filter((brick): brick is PlacedBrick => Boolean(brick))

    if (component.length === 0 || component.every((brick) => brick.y !== 0))
      continue
    if (isBalanced(component, PART_CATALOG)) continue

    const { shear } = findShearRegion(component)
    for (const brick of shear) {
      sheared.add(brick.id)
    }
  }

  return new Set([...floating, ...sheared])
}
