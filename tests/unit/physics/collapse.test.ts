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

  it('marks an unbalanced component as collapsing (whole-component topple)', () => {
    // b1: 1x1 at (0,0,0) — supports the stack; CoM support = [0,1]x[0,1]
    // b2: plate-1x4 at (0,3,0) rot=0 — cells (0,0)..(0,3); extends far in Z
    // The stack CoM.z will fall outside the 1x1 support footprint
    const bricks = [
      brick('b1', 'brick-1x1', 0, 0, 0),
      brick('b2', 'plate-1x4', 0, 3, 0),
    ]
    const result = selectCollapsingBricks(bricks)
    // Both bricks are in the same component and it's unbalanced
    expect(result).toContain('b1')
    expect(result).toContain('b2')
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
    expect(result).toContain('b1')
    expect(result).toContain('b2')
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
})
