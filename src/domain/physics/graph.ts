import Graph from 'graphology'
import type { PlacedBrick } from '../model/types'
import type { PartCatalog } from '../parts/catalog'
import { toBrickFootprint } from '../parts/footprint'
import {
  buildConnectionGraph as buildFootprintGraph,
  BASEPLATE,
} from './placement'

export type ConnectionGraph = Graph

/**
 * Builds an undirected brick-only connection graph for a set of placed bricks.
 *
 * Delegates stud/anti-stud coupling — including the `hasTopStuds === false`
 * skip for smooth tiles — to the shared footprint-based graph builder in
 * placement.ts, then strips the synthetic BASEPLATE node so callers receive
 * a brick-only graph consistent with the old signature.
 */
export function buildConnectionGraph(
  bricks: PlacedBrick[],
  catalog: PartCatalog,
): ConnectionGraph {
  const footprints = []
  const unknownIds: string[] = []
  for (const b of bricks) {
    if (catalog[b.partId]) {
      footprints.push(toBrickFootprint(b, catalog))
    } else {
      unknownIds.push(b.id)
    }
  }

  const g = buildFootprintGraph(footprints) as unknown as ConnectionGraph
  if (g.hasNode(BASEPLATE)) g.dropNode(BASEPLATE)

  // Preserve backward compat: bricks with unknown partIds become isolated nodes.
  for (const id of unknownIds) {
    if (!g.hasNode(id)) g.addNode(id)
  }

  return g
}
