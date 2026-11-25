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
    const g = buildConnectionGraph([brick('a', 0, 0, 0), brick('b', 0, 0, 3)])
    expect(g.hasEdge('a', 'b')).toBe(true)
  })

  it('does not couple bricks that merely sit side by side', () => {
    const g = buildConnectionGraph([brick('a', 0, 0, 0), brick('b', 5, 5, 0)])
    expect(g.hasEdge('a', 'b')).toBe(false)
  })

  it('does not couple bricks separated by a vertical gap', () => {
    const g = buildConnectionGraph([brick('a', 0, 0, 0), brick('b', 0, 0, 4)])
    expect(g.hasEdge('a', 'b')).toBe(false)
  })

  it('does not couple onto a tile (no top studs)', () => {
    const tile = brick('a', 0, 0, 0, 1, 1, 1, false)
    const g = buildConnectionGraph([tile, brick('b', 0, 0, 1)])
    expect(g.hasEdge('a', 'b')).toBe(false)
  })

  it('reports an elevated hinge brick as floating instead of treating it as rigid', () => {
    const base = brick('base', 0, 0, 0)
    const hinge: BrickFootprint = {
      ...brick('hinge', 0, 0, 3),
      hinge: 'z',
    }

    expect(groundedIds([base, hinge])).toEqual(new Set(['base']))
    expect(floatingIds([base, hinge])).toEqual(new Set(['hinge']))
  })

  it('throws on a non-positive height', () => {
    expect(() => buildConnectionGraph([brick('a', 0, 0, 0, 1, 1, 0)])).toThrow(
      RangeError,
    )
  })

  it('works correctly when passed a one-shot generator (not re-iterable)', () => {
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
    const bricks = [brick('a', 0, 0, 0), brick('float', 10, 10, 6)]
    expect(groundedIds(bricks)).toEqual(new Set(['a']))
    expect(isGrounded('float', bricks)).toBe(false)
    expect(floatingIds(bricks)).toEqual(new Set(['float']))
  })

  it('reports the bricks that lose grounding when a support is removed', () => {
    const remaining = [brick('b', 0, 0, 3), brick('c', 0, 0, 6)]
    expect(floatingIds(remaining)).toEqual(new Set(['b', 'c']))
  })

  it('grounds a cantilever through a lateral chain of couplings', () => {
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

describe('lateral connections for mounted (SNOT) bricks', () => {
  it('grounds a mounted brick at y=0 via baseplate (fallback grounding)', () => {
    const m: BrickFootprint = {
      id: 'm',
      bottomY: 0,
      height: 3,
      cells: [{ x: 2, z: 0 }],
      mount: 'px',
    }
    expect(groundedIds([m])).toContain('m')
  })

  it('grounds an elevated mounted brick that has lateral contact with a grounded standard brick', () => {
    const s: BrickFootprint = {
      id: 's',
      bottomY: 0,
      height: 3,
      cells: [{ x: 0, z: 0 }],
    }
    const m: BrickFootprint = {
      id: 'm',
      bottomY: 1,
      height: 3,
      cells: [{ x: 2, z: 0 }],
      mount: 'px',
    }
    expect(groundedIds([s, m])).toContain('m')
    expect(floatingIds([s, m])).not.toContain('m')
  })

  it('reports a mounted brick as floating when no standard brick makes lateral contact', () => {
    const s: BrickFootprint = {
      id: 's',
      bottomY: 0,
      height: 3,
      cells: [{ x: 0, z: 0 }],
    }
    const m: BrickFootprint = {
      id: 'm',
      bottomY: 1,
      height: 3,
      cells: [{ x: 5, z: 0 }],
      mount: 'px',
    }
    expect(floatingIds([s, m])).toContain('m')
    expect(groundedIds([s, m])).not.toContain('m')
  })

  it('does not spuriously couple a mounted brick via the vertical stud scan', () => {
    const s: BrickFootprint = {
      id: 's',
      bottomY: 0,
      height: 3,
      cells: [{ x: 0, z: 0 }],
    }
    const m: BrickFootprint = {
      id: 'm',
      bottomY: 3,
      height: 3,
      cells: [{ x: 0, z: 0 }],
      mount: 'px',
    }

    expect(floatingIds([s, m])).toContain('m')
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

    expect(canPlace(brick('new', 0, 0, 1), existing)).toBe(false)
  })
})
