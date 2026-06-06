import type Graph from 'graphology'
import type { PlacedBrick } from '../model/types'

/**
 * Returns the IDs of bricks that are NOT connected (transitively) to the
 * baseplate. A brick at y=0 is directly grounded; all bricks reachable from
 * any grounded brick via the connection graph are also grounded.
 */
export function getFloatingBricks(bricks: PlacedBrick[], graph: Graph): Set<string> {
  const grounded = new Set<string>()
  const queue: string[] = []

  for (const brick of bricks) {
    if (brick.y === 0) {
      grounded.add(brick.id)
      queue.push(brick.id)
    }
  }

  // BFS through the connection graph
  let i = 0
  while (i < queue.length) {
    const current = queue[i++]
    graph.forEachNeighbor(current, (neighbor) => {
      if (!grounded.has(neighbor)) {
        grounded.add(neighbor)
        queue.push(neighbor)
      }
    })
  }

  const floating = new Set<string>()
  for (const brick of bricks) {
    if (!grounded.has(brick.id)) {
      floating.add(brick.id)
    }
  }
  return floating
}
