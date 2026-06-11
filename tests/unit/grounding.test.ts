import { describe, it, expect } from 'vitest'
import {
  BASEPLATE,
  buildConnectionGraph,
  canPlace,
  floatingIds,
  groundedIds,
  isGrounded,
  type BrickFootprint,
} from '@/domain/physics/placement'

/**
 * Helper: a square brick occupying a `w × d` block of stud cells with its
 * lower-near corner at (x, z), bottom at `bottomY`, of the given plate height.
 */
function brick(
  id: string,
  x: number,
  z: number,
  bottomY: number,
  w = 1,
  d = 1,
  height = 3,
  hasTopStuds = true,
): BrickFootprint {
  const cells = []
  for (let dx = 0; dx < w; dx++) {
    for (let dz = 0; dz < d; dz++) {
      cells.push({ x: x + dx, z: z + dz })
    }
  }
  return { id, bottomY, height, cells, hasTopStuds }
}

describe('buildConnectionGraph', () => {
  it('connects a baseplate-resting brick to the baseplate node', () => {
    const g = buildConnectionGraph([brick('a', 0, 0, 0)])
    expect(g.hasNode('a')).toBe(true)
    expect(g.hasNode(BASEPLATE)).toBe(true)
    expect(g.hasEdge('a', BASEPLATE)).toBe(true)
  })

  it('couples a stud face to the anti-stud face directly above it', () => {
    // 'a' is a brick (height 3) on the baseplate; 'b' rests on its top studs.
    const g = buildConnectionGraph([brick('a', 0, 0, 0), brick('b', 0, 0, 3)])
    expect(g.hasEdge('a', 'b')).toBe(true)
  })

  it('does not couple bricks that merely sit side by side', () => {
    const g = buildConnectionGraph([brick('a', 0, 0, 0), brick('b', 5, 5, 0)])
    expect(g.hasEdge('a', 'b')).toBe(false)
  })

  it('does not couple bricks separated by a vertical gap', () => {
    // 'b' bottom is at y=4 while 'a' top is at y=3 — no shared face.
    const g = buildConnectionGraph([brick('a', 0, 0, 0), brick('b', 0, 0, 4)])
    expect(g.hasEdge('a', 'b')).toBe(false)
  })

  it('does not couple onto a tile (no top studs)', () => {
    // tile 'a' has no top studs, so 'b' resting on it does not connect.
    const tile = brick('a', 0, 0, 0, 1, 1, 1, false)
    const g = buildConnectionGraph([tile, brick('b', 0, 0, 1)])
    expect(g.hasEdge('a', 'b')).toBe(false)
  })

  it('throws on a non-positive height', () => {
    expect(() => buildConnectionGraph([brick('a', 0, 0, 0, 1, 1, 0)])).toThrow(
      RangeError,
    )
  })

  it('works correctly when passed a one-shot generator (not re-iterable)', () => {
    // A generator is a one-shot iterable; if the impl iterates twice the second
    // pass is a no-op and the stud→anti-stud edge between 'a' and 'b' is lost.
    function* gen(): Generator<BrickFootprint> {
      yield brick('a', 0, 0, 0)
      yield brick('b', 0, 0, 3)
    }
    const g = buildConnectionGraph(gen())
    expect(g.hasEdge('a', 'b')).toBe(true)
    expect(g.hasEdge('a', BASEPLATE)).toBe(true)
  })
})

describe('groundedIds / isGrounded', () => {
  it('grounds a tower stacked on the baseplate', () => {
    const bricks = [
      brick('a', 0, 0, 0),
      brick('b', 0, 0, 3),
      brick('c', 0, 0, 6),
    ]
    expect(groundedIds(bricks)).toEqual(new Set(['a', 'b', 'c']))
    expect(isGrounded('c', bricks)).toBe(true)
  })

  it('treats a brick with no path to the baseplate as floating', () => {
    // 'a' grounds; 'float' hovers two bricks up with nothing beneath it.
    const bricks = [brick('a', 0, 0, 0), brick('float', 10, 10, 6)]
    expect(groundedIds(bricks)).toEqual(new Set(['a']))
    expect(isGrounded('float', bricks)).toBe(false)
    expect(floatingIds(bricks)).toEqual(new Set(['float']))
  })

  it('reports the bricks that lose grounding when a support is removed', () => {
    // Tower a→b→c. Remove 'a': b and c lose their path to the baseplate.
    const remaining = [brick('b', 0, 0, 3), brick('c', 0, 0, 6)]
    expect(floatingIds(remaining)).toEqual(new Set(['b', 'c']))
  })

  it('grounds a cantilever through a lateral chain of couplings', () => {
    // a on baseplate; b stacked on a; c stacked on b but shifted so it
    // overhangs — still grounded because it couples down through b → a.
    const bricks = [
      brick('a', 0, 0, 0, 2, 1),
      brick('b', 0, 0, 3, 2, 1),
      brick('c', 1, 0, 6, 2, 1),
    ]
    expect(groundedIds(bricks)).toEqual(new Set(['a', 'b', 'c']))
  })
})

describe('offset-aware grounding (placement path)', () => {
  it('grounds an offset brick whose rect overlaps a supporter even when integer cells do not match', () => {
    // Supporter at x=1, cells (1,0). Top brick at integer x=0 with offset.x=1:
    // its footprint rect is X [0.5, 1.5], which overlaps the supporter rect [1, 2]
    // with positive area. Integer cell matching (cells (0,0) vs (1,0)) produces no
    // match, so the current code reports the top as floating — the rect-overlap
    // fix is required for the correct grounded result.
    const support: BrickFootprint = {
      id: 'support',
      bottomY: 0,
      height: 3,
      cells: [{ x: 1, z: 0 }],
      hasTopStuds: true,
    }
    const top: BrickFootprint = {
      id: 'top',
      bottomY: 3,
      height: 3,
      cells: [{ x: 0, z: 0 }],
      hasTopStuds: true,
      offset: { x: 1, z: 0 },
    }
    expect(groundedIds([support, top])).toContain('top')
    expect(floatingIds([support, top])).not.toContain('top')
  })
})

describe('canPlace (anti-floating hard rule)', () => {
  it('allows a brick placed directly on the baseplate', () => {
    expect(canPlace(brick('new', 4, 4, 0), [])).toBe(true)
  })

  it('allows a brick that couples onto the existing structure', () => {
    const existing = [brick('a', 0, 0, 0)]
    expect(canPlace(brick('new', 0, 0, 3), existing)).toBe(true)
  })

  it('rejects a brick that would float (no path to baseplate)', () => {
    const existing = [brick('a', 0, 0, 0)]
    expect(canPlace(brick('new', 20, 20, 9), existing)).toBe(false)
  })

  it('rejects a brick resting only on a tile top (no studs to grab)', () => {
    const existing = [brick('tile', 0, 0, 0, 1, 1, 1, false)]
    // The tile itself is grounded, but its smooth top offers no coupling.
    expect(canPlace(brick('new', 0, 0, 1), existing)).toBe(false)
  })
})
