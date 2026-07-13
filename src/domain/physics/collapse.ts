import type { PlacedBrick } from '../model/types'
import { CATALOG_BY_ID as PART_CATALOG } from '../parts/catalog'
import { toBrickFootprint } from '../parts/footprint'
import { buildConnectionGraph } from './graph'
import { floatingIds } from './placement'
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

  // Use the shared footprint-based grounding helper so tile coupling (hasTopStuds)
  // is evaluated by the same rule as the placement path.
  const floating = floatingIds(
    bricks.map((b) => toBrickFootprint(b, PART_CATALOG)),
  )

  // Brick-only graph (no BASEPLATE node) for shear connected-component analysis
  // so physically disconnected grounded components are evaluated independently.
  const graph = buildConnectionGraph(bricks, PART_CATALOG)

  const brickById = new Map<string, PlacedBrick>()
  for (let i = 0; i < bricks.length; i++) {
    brickById.set(bricks[i].id, bricks[i])
  }

  const sheared = new Set<string>()

  for (const componentIds of connectedComponents(graph)) {
    const component: PlacedBrick[] = []
    for (let i = 0; i < componentIds.length; i++) {
      const brick = brickById.get(componentIds[i])
      if (brick !== undefined) {
        component.push(brick)
      }
    }

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
