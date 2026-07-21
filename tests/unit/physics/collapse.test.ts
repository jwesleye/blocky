import { describe, it, expect } from 'vitest'
import { selectCollapsingBricks } from '@/domain/physics/collapse'
import type { PlacedBrick } from '@/domain/model/types'

function brick(
  id: string,
  partId: string,
  x: number,
  y: number,
  z: number,
  rot: 0 | 1 | 2 | 3 = 0,
): PlacedBrick {
  return { id, partId, color: 'red', x, y, z, rot }
}

describe('selectCollapsingBricks', () => {
  it('returns empty set for an empty build', () => {
    expect(selectCollapsingBricks([])).toEqual(new Set())
  })

  it('returns empty set for a single grounded brick', () => {
    // 1x1 brick sitting on the baseplate
    const bricks = [brick('b1', 'brick-1x1', 0, 0, 0)]
    expect(selectCollapsingBricks(bricks)).toEqual(new Set())
  })

  it('returns empty set for a stable stacked tower', () => {
    // Three 1x1 bricks stacked vertically — grounded and balanced
    const bricks = [
      brick('b1', 'brick-1x1', 0, 0, 0),
      brick('b2', 'brick-1x1', 0, 3, 0),
      brick('b3', 'brick-1x1', 0, 6, 0),
    ]
    expect(selectCollapsingBricks(bricks)).toEqual(new Set())
  })

  it('identifies floating bricks (no path to baseplate)', () => {
    // b1 is on the baseplate; b2 is suspended in space with no support
    const bricks = [
      brick('b1', 'brick-1x1', 0, 0, 0),
      brick('b2', 'brick-1x1', 5, 3, 5), // y=3 but nothing below at (5,5)
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toContain('b2')
    expect(result).not.toContain('b1')
  })

  it('identifies a floating component (multiple disconnected bricks)', () => {
    // b1 + b2 form a connected pair, but neither reaches the baseplate
    const bricks = [
      brick('g1', 'brick-1x1', 0, 0, 0), // grounded anchor
      brick('b1', 'brick-1x1', 5, 3, 5), // floating
      brick('b2', 'brick-1x1', 5, 6, 5), // stacked on b1, also floating
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toContain('b1')
    expect(result).toContain('b2')
    expect(result).not.toContain('g1')
  })

  it('does not mark a brick at y=0 as floating even when isolated', () => {
    // Two bricks both on the baseplate but not connected to each other
    const bricks = [
      brick('b1', 'brick-1x1', 0, 0, 0),
      brick('b2', 'brick-1x1', 10, 0, 10),
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toEqual(new Set())
  })

  it('shears only the unsupported sub-region from an unbalanced component', () => {
    // b1: 1x1 at (0,0,0) — supports the stack; CoM support = [0,1]x[0,1]
    // b2: plate-1x4 at (0,3,0) rot=0 — cells (0,0)..(0,3); extends far in Z
    // The stack CoM.z will fall outside the 1x1 support footprint
    const bricks = [
      brick('b1', 'brick-1x1', 0, 0, 0),
      brick('b2', 'plate-1x4', 0, 3, 0),
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toContain('b2')
    expect(result).not.toContain('b1')
  })

  it('does not collapse a balanced wide-base structure', () => {
    // b1: 2x2 on baseplate provides a wide footprint
    // b2: 1x1 centered on top — CoM well within support hull
    const bricks = [
      brick('b1', 'brick-2x2', 0, 0, 0),
      brick('b2', 'brick-1x1', 0, 3, 0),
    ]
    expect(selectCollapsingBricks(bricks)).toEqual(new Set())
  })

  it('independently evaluates multiple disconnected grounded components', () => {
    // Component A: balanced tower at (0,0,0)
    // Component B: unbalanced cantilever at (10,0,0)
    const bricks = [
      // Component A — stable
      brick('a1', 'brick-2x2', 0, 0, 0),
      brick('a2', 'brick-1x1', 0, 3, 0),
      // Component B — unbalanced: 1x1 base supports a long 1x4 plate reaching far in Z
      brick('b1', 'brick-1x1', 10, 0, 0),
      brick('b2', 'plate-1x4', 10, 3, 0),
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).not.toContain('a1')
    expect(result).not.toContain('a2')
    expect(result).toContain('b2')
    expect(result).not.toContain('b1')
  })

  it('a brick connected to grounded brick is not floating', () => {
    // b1 on baseplate; b2 stacked on b1 (connected) — b2 should not be floating
    const bricks = [
      brick('b1', 'brick-1x1', 0, 0, 0),
      brick('b2', 'brick-1x1', 0, 3, 0),
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toEqual(new Set())
  })

  it('collapses bricks that are both floating and would-be-unbalanced', () => {
    // All bricks floating — they should all collapse (floating takes precedence, but result is same)
    const bricks = [
      brick('b1', 'brick-1x1', 5, 3, 5),
      brick('b2', 'plate-1x4', 5, 4, 5),
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toContain('b1')
    expect(result).toContain('b2')
  })

  it('a wide balanced tower never collapses', () => {
    // 2x4 on baseplate, then 2x4 on top — perfectly centered
    const bricks = [
      brick('b1', 'brick-2x4', 0, 0, 0),
      brick('b2', 'brick-2x4', 0, 3, 0),
    ]
    expect(selectCollapsingBricks(bricks)).toEqual(new Set())
  })

  it('collapses an offset brick whose +0.5 shift pushes its component CoM outside the support', () => {
    // base: brick-1x1 at (0,0,0) → support footprint X [0,1].
    // top: brick-1x2 (rot=1, two cells in X: (0,0)&(1,0)) at (0,3,0) with offset.x=1.
    // Without offset awareness: CoM_x = (0.5*3 + 1.0*6)/9 = 0.833 → inside [0,1] → no collapse.
    // With offset: CoM_x = (0.5*3 + 1.5*6)/9 = 1.167 → outside [0,1] → top shears off.
    const bricks: PlacedBrick[] = [
      {
        id: 'base',
        partId: 'brick-1x1',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
      },
      {
        id: 'top',
        partId: 'brick-1x2',
        color: 'red',
        x: 0,
        y: 3,
        z: 0,
        rot: 1,
        offset: { x: 1, z: 0 },
      },
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toContain('top')
    expect(result).not.toContain('base')
  })

  it('treats a mounted brick connected via lateral contact as stable', () => {
    // brick-2x2 at (0,0,0) has xHi=2. Mounted 'px' brick-1x1 at (3,1,0):
    // anti-stud = 3.5-1.5 = 2.0 = xHi → lateral contact. Y overlap: [2,3] vs [0,3] ✓
    // Combined CoM (1.5, 0.9) is inside the 2x2 support hull → no collapse.
    const bricks: PlacedBrick[] = [
      brick('std', 'brick-2x2', 0, 0, 0),
      {
        id: 'mnt',
        partId: 'brick-1x1',
        color: 'red',
        x: 3,
        y: 1,
        z: 0,
        rot: 0,
        mount: 'px' as const,
      },
    ]
    expect(selectCollapsingBricks(bricks)).toEqual(new Set())
  })

  it('collapses a mounted brick that loses its lateral connection when the supporting standard brick is removed', () => {
    // Without the standard brick the mounted brick at y=1 has no path to the baseplate.
    const bricks: PlacedBrick[] = [
      {
        id: 'mnt',
        partId: 'brick-1x1',
        color: 'red',
        x: 3,
        y: 1,
        z: 0,
        rot: 0,
        mount: 'px' as const,
      },
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toContain('mnt')
  })

  it('collapses an elevated hinge brick instead of treating it as rigidly supported', () => {
    const bricks: PlacedBrick[] = [
      brick('base', 'brick-1x1', 0, 0, 0),
      {
        ...brick('hinge', 'brick-1x1', 0, 3, 0),
        hinge: 'z',
      },
    ]

    const result = selectCollapsingBricks(bricks)
    expect(result).toContain('hinge')
    expect(result).not.toContain('base')
  })

  it('treats a brick resting only on a tile (hasTopStuds=false) as floating', () => {
    // tile at y=0 is grounded but has no top studs — the plate above cannot couple
    // through it, so the plate has no path to the baseplate and must collapse.
    const bricks = [
      brick('base', 'tile-1x1', 0, 0, 0),
      brick('top', 'plate-1x1', 0, 1, 0),
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toContain('top')
    expect(result).not.toContain('base')
  })
})
