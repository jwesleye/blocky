import Graph from 'graphology'
import type { PlacedBrick } from '../model/types'
import type { PartCatalog } from '../parts/catalog'
import { getOccupiedCells } from '../parts/footprint'

export interface ConnectionGraph {
  addNode: (id: string) => void
  addEdge: (source: string, target: string) => void
  hasEdge: (source: string, target: string) => boolean
  forEachNeighbor: (
    node: string,
    callback: (neighbor: string) => void,
  ) => void
}

const GraphCtor = Graph as unknown as {
  new (options?: { type?: string; allowSelfLoops?: boolean }): ConnectionGraph
}

/**
 * Builds an undirected connection graph for a set of placed bricks.
 * Two bricks share an edge when a stud face of one aligns with the
 * anti-stud face of the other (i.e. they share an (X,Z) cell and one's
 * top Y equals the other's bottom Y).
 */
export function buildConnectionGraph(
  bricks: PlacedBrick[],
  catalog: PartCatalog,
): ConnectionGraph {
  const graph = new GraphCtor({ type: 'undirected', allowSelfLoops: false })

  for (const brick of bricks) {
    graph.addNode(brick.id)
  }

  // Map from "x,z,yTop" → brick id so we can find bricks supporting from below.
  const topFaceMap = new Map<string, string>()

  for (const brick of bricks) {
    const def = catalog[brick.partId]
    if (!def) continue
    const yTop = brick.y + def.height
    for (const { x, z } of getOccupiedCells(brick, def)) {
      topFaceMap.set(`${x},${z},${yTop}`, brick.id)
    }
  }

  for (const brick of bricks) {
    const def = catalog[brick.partId]
    if (!def) continue
    for (const { x, z } of getOccupiedCells(brick, def)) {
      const belowId = topFaceMap.get(`${x},${z},${brick.y}`)
      if (
        belowId &&
        belowId !== brick.id &&
        !graph.hasEdge(brick.id, belowId)
      ) {
        graph.addEdge(brick.id, belowId)
      }
    }
  }

  return graph
}
