/**
 * Anti-floating placement rules (PRD §5.1) — pure, framework-agnostic domain core.
 *
 * Two bricks **connect** when a stud face of the lower brick aligns with the
 * anti-stud face of the upper brick on the grid (classic vertical
 * stud/anti-stud coupling). A brick is **grounded** when it rests on the
 * baseplate or couples — transitively — to a brick that is. Floating is
 * hard-prevented: a placement that has no path to the baseplate is rejected.
 *
 * Callers reduce a placed brick to the {@link BrickFootprint} geometry this
 * engine needs, keeping grounding independently testable without importing
 * the grid or part catalog.
 */
import Graph from 'graphology'
import { connectedComponents } from 'graphology-components'
import type { PlacedBrick } from '../model/types'
import type { PartCatalog } from '../parts/catalog'
import { toBrickFootprint } from '../parts/footprint'

interface PlacementGraph {
  mergeNode: (id: string) => void
  mergeEdge: (source: string, target: string) => void
  hasNode: (id: string) => boolean
  hasEdge: (source: string, target: string) => boolean
}

const GraphCtor = Graph as unknown as {
  new (options?: { type?: string; allowSelfLoops?: boolean }): PlacementGraph
}

/** A single stud cell in the X/Z plane (integer stud coordinates). */
export interface Cell {
  readonly x: number
  readonly z: number
}

/**
 * A placed brick reduced to the geometry the grounding engine needs: the stud
 * cells it occupies (already rotated and world-positioned) and its vertical
 * extent in plate (Y) units.
 */
export interface BrickFootprint {
  /** Stable, unique id of the placed brick. */
  readonly id: string
  /** Bottom of the brick in plate (Y) units; 0 == resting on the baseplate. */
  readonly bottomY: number
  /** Height in plate units (brick = 3, plate/tile = 1). Must be >= 1. */
  readonly height: number
  /** Occupied stud cells in X/Z (post-rotation, world coordinates). */
  readonly cells: ReadonlyArray<Cell>
  /**
   * Whether the top face exposes studs that an upper brick can grab. Tiles are
   * smooth (no top studs), so nothing couples onto their top. Defaults to
   * `true` for bricks and plates.
   */
  readonly hasTopStuds?: boolean
}

/** Graph node id standing in for the baseplate (the ground). */
export const BASEPLATE = '__baseplate__'

/** Y level (plate units) of the baseplate's top surface. */
export const BASEPLATE_TOP_Y = 0

/** Key identifying a stud cell at a specific Y boundary plane. */
function faceKey(x: number, z: number, y: number): string {
  return `${x}|${z}|${y}`
}

/**
 * Build the undirected stud/anti-stud connection graph for a set of bricks.
 *
 * Nodes are brick ids plus the {@link BASEPLATE} node. An edge means a
 * physical coupling: either a brick resting on the baseplate (`bottomY === 0`)
 * or the studded top face of one brick meeting the anti-stud bottom face of
 * another at the same X/Z cell and Y plane.
 *
 * @throws RangeError if any brick has a non-positive height.
 */
export function buildConnectionGraph(
  bricks: Iterable<BrickFootprint>,
): PlacementGraph {
  const all = [...bricks]
  const graph = new GraphCtor({ type: 'undirected', allowSelfLoops: false })
  graph.mergeNode(BASEPLATE)

  // Index bottom (anti-stud) faces by cell + plane so each studded top face
  // can find the bricks resting directly on it in one pass.
  const bottomFaces = new Map<string, string[]>()

  // First pass: register nodes, ground baseplate-resting bricks, index bottoms.
  for (const b of all) {
    if (b.height < 1) {
      throw new RangeError(
        `brick "${b.id}" has invalid height ${b.height}; height must be >= 1`,
      )
    }
    graph.mergeNode(b.id)
    if (b.bottomY === BASEPLATE_TOP_Y) {
      graph.mergeEdge(b.id, BASEPLATE)
    }
    for (const cell of b.cells) {
      const key = faceKey(cell.x, cell.z, b.bottomY)
      const ids = bottomFaces.get(key)
      if (ids) ids.push(b.id)
      else bottomFaces.set(key, [b.id])
    }
  }

  // Second pass: couple each studded top face to the bottom faces above it.
  for (const b of all) {
    if (b.hasTopStuds === false) continue
    const topY = b.bottomY + b.height
    for (const cell of b.cells) {
      const above = bottomFaces.get(faceKey(cell.x, cell.z, topY))
      if (!above) continue
      for (const otherId of above) {
        if (otherId !== b.id) graph.mergeEdge(b.id, otherId)
      }
    }
  }

  return graph
}

/**
 * Compute the set of brick ids that are grounded — i.e. reachable from the
 * baseplate through the connection graph. Bricks not in the returned set are
 * floating.
 */
export function groundedIds(bricks: Iterable<BrickFootprint>): Set<string> {
  const graph = buildConnectionGraph(bricks)
  const grounded = new Set<string>()
  for (const component of connectedComponents(graph as never)) {
    if (!component.includes(BASEPLATE)) continue
    for (const id of component) {
      if (id !== BASEPLATE) grounded.add(id)
    }
    break
  }
  return grounded
}

/**
 * Ids of bricks with no path to the baseplate. In a deletion (PRD §5.3) these
 * are exactly the sub-parts that lost their grounding and must fall.
 */
export function floatingIds(bricks: Iterable<BrickFootprint>): Set<string> {
  const all: BrickFootprint[] = [...bricks]
  const grounded = groundedIds(all)
  const floating = new Set<string>()
  for (const b of all) {
    if (!grounded.has(b.id)) floating.add(b.id)
  }
  return floating
}

/** Whether a specific brick is grounded within the given set. */
export function isGrounded(
  id: string,
  bricks: Iterable<BrickFootprint>,
): boolean {
  return groundedIds(bricks).has(id)
}

/**
 * The hard anti-floating placement rule (PRD §5.1): a `candidate` may be placed
 * only if, once added to the `existing` structure, it is grounded — i.e. it
 * rests on the baseplate or couples (transitively) to a grounded brick.
 *
 * This enforces grounding only; collision/overlap validity is the ghost-cursor
 * placement concern (#9) and is out of scope here.
 */
export function canPlace(
  candidate: BrickFootprint,
  existing: Iterable<BrickFootprint>,
): boolean {
  return groundedIds([...existing, candidate]).has(candidate.id)
}

export function canPlaceBrick(
  candidate: PlacedBrick,
  existing: Iterable<PlacedBrick>,
  catalog: PartCatalog,
): boolean {
  const all = Array.from(existing, (brick) => toBrickFootprint(brick, catalog))
  return canPlace(toBrickFootprint(candidate, catalog), all)
}
