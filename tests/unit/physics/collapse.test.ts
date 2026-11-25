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
    const bricks = [brick('b1', 'brick-1x1', 0, 0, 0)]
    expect(selectCollapsingBricks(bricks)).toEqual(new Set())
  })

  it('returns empty set for a stable stacked tower', () => {
    const bricks = [
      brick('b1', 'brick-1x1', 0, 0, 0),
      brick('b2', 'brick-1x1', 0, 3, 0),
      brick('b3', 'brick-1x1', 0, 6, 0),
    ]
    expect(selectCollapsingBricks(bricks)).toEqual(new Set())
  })

  it('identifies floating bricks (no path to baseplate)', () => {
    const bricks = [
      brick('b1', 'brick-1x1', 0, 0, 0),
      brick('b2', 'brick-1x1', 5, 3, 5),
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toContain('b2')
    expect(result).not.toContain('b1')
  })

  it('identifies a floating component (multiple disconnected bricks)', () => {
    const bricks = [
      brick('g1', 'brick-1x1', 0, 0, 0),
      brick('b1', 'brick-1x1', 5, 3, 5),
      brick('b2', 'brick-1x1', 5, 6, 5),
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toContain('b1')
    expect(result).toContain('b2')
    expect(result).not.toContain('g1')
  })

  it('does not mark a brick at y=0 as floating even when isolated', () => {
    const bricks = [
      brick('b1', 'brick-1x1', 0, 0, 0),
      brick('b2', 'brick-1x1', 10, 0, 10),
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toEqual(new Set())
  })

  it('shears only the unsupported sub-region from an unbalanced component', () => {
    const bricks = [
      brick('b1', 'brick-1x1', 0, 0, 0),
      brick('b2', 'plate-1x4', 0, 3, 0),
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toContain('b2')
    expect(result).not.toContain('b1')
  })

  it('does not collapse a balanced wide-base structure', () => {
    const bricks = [
      brick('b1', 'brick-2x2', 0, 0, 0),
      brick('b2', 'brick-1x1', 0, 3, 0),
    ]
    expect(selectCollapsingBricks(bricks)).toEqual(new Set())
  })

  it('independently evaluates multiple disconnected grounded components', () => {
    const bricks = [
      brick('a1', 'brick-2x2', 0, 0, 0),
      brick('a2', 'brick-1x1', 0, 3, 0),

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
    const bricks = [
      brick('b1', 'brick-1x1', 0, 0, 0),
      brick('b2', 'brick-1x1', 0, 3, 0),
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toEqual(new Set())
  })

  it('collapses bricks that are both floating and would-be-unbalanced', () => {
    const bricks = [
      brick('b1', 'brick-1x1', 5, 3, 5),
      brick('b2', 'plate-1x4', 5, 4, 5),
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toContain('b1')
    expect(result).toContain('b2')
  })

  it('a wide balanced tower never collapses', () => {
    const bricks = [
      brick('b1', 'brick-2x4', 0, 0, 0),
      brick('b2', 'brick-2x4', 0, 3, 0),
    ]
    expect(selectCollapsingBricks(bricks)).toEqual(new Set())
  })

  it('collapses an offset brick whose +0.5 shift pushes its component CoM outside the support', () => {
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

  it('does not collapse a hinge brick resting on the baseplate', () => {
    const bricks: PlacedBrick[] = [
      brick('base', 'brick-1x1', 4, 0, 0),
      { ...brick('hinge', 'brick-1x1', 0, 0, 0), hinge: 'z' },
    ]

    expect([...selectCollapsingBricks(bricks)]).toEqual([])
  })

  it('treats a brick resting only on a tile (hasTopStuds=false) as floating', () => {
    const bricks = [
      brick('base', 'tile-1x1', 0, 0, 0),
      brick('top', 'plate-1x1', 0, 1, 0),
    ]
    const result = selectCollapsingBricks(bricks)
    expect(result).toContain('top')
    expect(result).not.toContain('base')
  })
})
