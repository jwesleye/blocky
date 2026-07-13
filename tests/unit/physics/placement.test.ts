import { describe, expect, it } from 'vitest'
import {
  BASEPLATE,
  buildConnectionGraph,
  canPlace,
  canPlaceBrick,
  floatingIds,
  groundedIds,
  isGrounded,
  type BrickFootprint,
} from '@/domain/physics/placement'
import type { PlacedBrick, BrickMount } from '@/domain/model/types'
import type { PartCatalog } from '@/domain/parts/catalog'

// Helper to quickly create a footprint
function fp(
  id: string,
  bottomY: number,
  height: number,
  cells: { x: number; z: number }[],
  opts?: {
    hasTopStuds?: boolean
    offset?: { x: 0 | 1; z: 0 | 1 }
    mount?: BrickMount
  },
): BrickFootprint {
  return {
    id,
    bottomY,
    height,
    cells,
    hasTopStuds: opts?.hasTopStuds ?? true,
    offset: opts?.offset,
    mount: opts?.mount,
  }
}

describe('buildConnectionGraph', () => {
  it('connects a brick on the baseplate to BASEPLATE', () => {
    const brick = fp('b1', 0, 1, [{ x: 0, z: 0 }])
    const graph = buildConnectionGraph([brick])
    expect(graph.hasNode(BASEPLATE)).toBe(true)
    expect(graph.hasNode('b1')).toBe(true)
    expect(graph.hasEdge(BASEPLATE, 'b1')).toBe(true)
  })

  it('connects a stacked brick to the one below it', () => {
    const bottom = fp('b1', 0, 3, [{ x: 0, z: 0 }])
    const top = fp('t1', 3, 1, [{ x: 0, z: 0 }])
    const graph = buildConnectionGraph([bottom, top])
    expect(graph.hasEdge('b1', 't1')).toBe(true)
  })

  it('does not connect bricks that do not overlap in Y', () => {
    const b1 = fp('b1', 0, 3, [{ x: 0, z: 0 }])
    const b2 = fp('b2', 4, 1, [{ x: 0, z: 0 }]) // Gap of 1 unit
    const graph = buildConnectionGraph([b1, b2])
    expect(graph.hasEdge('b1', 'b2')).toBe(false)
  })

  it('does not connect bricks that overlap in Y but not in X/Z', () => {
    const b1 = fp('b1', 0, 3, [{ x: 0, z: 0 }])
    const b2 = fp('b2', 3, 1, [{ x: 1, z: 0 }]) // different column
    const graph = buildConnectionGraph([b1, b2])
    expect(graph.hasEdge('b1', 'b2')).toBe(false)
  })

  it('does not connect if the bottom brick has hasTopStuds = false', () => {
    // E.g., a tile
    const bottom = fp('b1', 0, 1, [{ x: 0, z: 0 }], { hasTopStuds: false })
    const top = fp('t1', 1, 1, [{ x: 0, z: 0 }])
    const graph = buildConnectionGraph([bottom, top])
    expect(graph.hasEdge('b1', 't1')).toBe(false)
  })

  it('connects a mounted brick via lateral contact to a standard brick', () => {
    // Standard 2x2 brick at (0,0,0) -> cells (0,0),(1,0),(0,1),(1,1), bottomY=0, height=3
    // Rect: x: [0, 2], z: [0, 2]
    const std = fp(
      'std',
      0,
      3,
      [
        { x: 0, z: 0 },
        { x: 1, z: 0 },
        { x: 0, z: 1 },
        { x: 1, z: 1 },
      ],
    )

    // Mounted brick 'px' at (2,0,0) -> cells (2,0), bottomY=0, height=1
    // anti-stud face will be at X = 2.5 - 0.5 = 2.0 (matches std xHi = 2.0)
    const mnt = fp('mnt', 0, 1, [{ x: 2, z: 0 }], { mount: 'px' })
    const graph = buildConnectionGraph([std, mnt])
    expect(graph.hasEdge('std', 'mnt')).toBe(true)
  })

  it('throws a RangeError if a brick has invalid height', () => {
    expect(() =>
      buildConnectionGraph([fp('b1', 0, 0, [{ x: 0, z: 0 }])]),
    ).toThrow(RangeError)
  })
})

describe('groundedIds / floatingIds / isGrounded', () => {
  it('correctly identifies grounded and floating bricks', () => {
    const grounded1 = fp('g1', 0, 3, [{ x: 0, z: 0 }])
    const grounded2 = fp('g2', 3, 1, [{ x: 0, z: 0 }]) // on top of g1

    const floating1 = fp('f1', 5, 3, [{ x: 2, z: 2 }]) // floating
    const floating2 = fp('f2', 8, 1, [{ x: 2, z: 2 }]) // floating, on top of f1

    const bricks = [grounded1, grounded2, floating1, floating2]

    const grounded = groundedIds(bricks)
    expect(grounded.has('g1')).toBe(true)
    expect(grounded.has('g2')).toBe(true)
    expect(grounded.has('f1')).toBe(false)
    expect(grounded.has('f2')).toBe(false)

    const floating = floatingIds(bricks)
    expect(floating.has('f1')).toBe(true)
    expect(floating.has('f2')).toBe(true)
    expect(floating.has('g1')).toBe(false)

    expect(isGrounded('g2', bricks)).toBe(true)
    expect(isGrounded('f1', bricks)).toBe(false)
  })
})

describe('canPlace', () => {
  it('returns true if the candidate connects to the baseplate', () => {
    const candidate = fp('c1', 0, 1, [{ x: 0, z: 0 }])
    expect(canPlace(candidate, [])).toBe(true)
  })

  it('returns true if the candidate connects to an existing grounded brick', () => {
    const existing = [fp('e1', 0, 3, [{ x: 0, z: 0 }])]
    const candidate = fp('c1', 3, 1, [{ x: 0, z: 0 }])
    expect(canPlace(candidate, existing)).toBe(true)
  })

  it('returns false if the candidate is floating', () => {
    const existing = [fp('e1', 0, 3, [{ x: 0, z: 0 }])]
    const candidate = fp('c1', 5, 1, [{ x: 0, z: 0 }]) // floating
    expect(canPlace(candidate, existing)).toBe(false)
  })

  it('returns false if connecting to an ungrounded brick', () => {
    const existing = [fp('e1', 5, 3, [{ x: 0, z: 0 }])] // e1 is floating
    const candidate = fp('c1', 8, 1, [{ x: 0, z: 0 }]) // candidate on top of floating e1
    expect(canPlace(candidate, existing)).toBe(false)
  })
})

describe('canPlaceBrick', () => {
  // Mock catalog
  const mockCatalog: PartCatalog = {
    'brick-1x1': {
      width: 1,
      length: 1,
      height: 3,
      hasTopStuds: true,
    },
    'tile-1x1': {
      width: 1,
      length: 1,
      height: 1,
      hasTopStuds: false,
    },
  }

  function brick(id: string, partId: string, x: number, y: number, z: number): PlacedBrick {
    return { id, partId, color: 'red', x, y, z, rot: 0 }
  }

  it('returns true for a grounded placement', () => {
    const candidate = brick('c1', 'brick-1x1', 0, 0, 0)
    expect(canPlaceBrick(candidate, [], mockCatalog)).toBe(true)
  })

  it('returns true for placement on a grounded brick', () => {
    const existing = [brick('e1', 'brick-1x1', 0, 0, 0)]
    const candidate = brick('c1', 'brick-1x1', 0, 3, 0)
    expect(canPlaceBrick(candidate, existing, mockCatalog)).toBe(true)
  })

  it('returns false for placement on a tile', () => {
    const existing = [brick('e1', 'tile-1x1', 0, 0, 0)]
    const candidate = brick('c1', 'brick-1x1', 0, 1, 0)
    expect(canPlaceBrick(candidate, existing, mockCatalog)).toBe(false)
  })
})