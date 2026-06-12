import { describe, expect, it } from 'vitest'
import { buildConnectionGraph } from '@/domain/physics/graph'
import { CATALOG_BY_ID as PART_CATALOG } from '@/domain/parts/catalog'
import type { PlacedBrick } from '@/domain/model/types'

describe('buildConnectionGraph', () => {
  it('detects vertical adjacency between stacked bricks', () => {
    const bottomBrick: PlacedBrick = {
      id: 'bottom',
      partId: 'brick-2x2',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }
    const topBrick: PlacedBrick = {
      id: 'top',
      partId: 'brick-2x2',
      color: 'blue',
      x: 0,
      y: 3, // brick-2x2 height is 3
      z: 0,
      rot: 0,
    }

    const graph = buildConnectionGraph([bottomBrick, topBrick], PART_CATALOG)
    expect(graph.order).toBe(2)
    expect(graph.hasEdge('bottom', 'top')).toBe(true)
  })

  it('detects adjacency when one brick is partially supported by another', () => {
    const bottomBrick: PlacedBrick = {
      id: 'bottom',
      partId: 'brick-2x4', // 2x4 footprint
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }
    const topBrick: PlacedBrick = {
      id: 'top',
      partId: 'brick-2x2',
      color: 'blue',
      x: 1, // Partially overlaps: cells (1,0) and (1,1)
      y: 3,
      z: 0,
      rot: 0,
    }

    const graph = buildConnectionGraph([bottomBrick, topBrick], PART_CATALOG)
    expect(graph.hasEdge('bottom', 'top')).toBe(true)
  })

  it('does not detect adjacency for non-touching bricks', () => {
    const brick1: PlacedBrick = {
      id: '1',
      partId: 'brick-1x1',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }
    const brick2: PlacedBrick = {
      id: '2',
      partId: 'brick-1x1',
      color: 'blue',
      x: 1, // Adjacent on X but not touching (bricks are 1 unit wide)
      y: 0,
      z: 0,
      rot: 0,
    }

    const graph = buildConnectionGraph([brick1, brick2], PART_CATALOG)
    expect(graph.hasEdge('1', '2')).toBe(false)
  })

  it('detects adjacency with rotated bricks', () => {
    const bottomBrick: PlacedBrick = {
      id: 'bottom',
      partId: 'brick-1x2',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 1, // Rotated 90 deg: occupies (0,0) and (1,0)
    }
    const topBrick: PlacedBrick = {
      id: 'top',
      partId: 'brick-1x1',
      color: 'blue',
      x: 1,
      y: 3,
      z: 0,
      rot: 0,
    }

    const graph = buildConnectionGraph([bottomBrick, topBrick], PART_CATALOG)
    expect(graph.hasEdge('bottom', 'top')).toBe(true)
  })

  it('does not create an edge from a smooth tile top (hasTopStuds=false)', () => {
    // tile-1x1 has hasTopStuds=false; plate-1x1 rests at y=1 directly on the tile.
    // No coupling should exist because tiles have no top studs.
    const tile: PlacedBrick = {
      id: 'tile',
      partId: 'tile-1x1',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }
    const top: PlacedBrick = {
      id: 'top',
      partId: 'plate-1x1',
      color: 'blue',
      x: 0,
      y: 1,
      z: 0,
      rot: 0,
    }

    const graph = buildConnectionGraph([tile, top], PART_CATALOG)
    expect(graph.hasEdge('tile', 'top')).toBe(false)
  })

  it('does not create an edge between two mounted bricks (both excluded from vertical scan)', () => {
    const m1: PlacedBrick = {
      id: 'm1',
      partId: 'brick-1x1',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
      mount: 'px',
    }
    const m2: PlacedBrick = {
      id: 'm2',
      partId: 'brick-1x1',
      color: 'red',
      x: 0,
      y: 3,
      z: 0,
      rot: 0,
      mount: 'px',
    }

    const graph = buildConnectionGraph([m1, m2], PART_CATALOG)
    expect(graph.hasEdge('m1', 'm2')).toBe(false)
  })

  it('couples a half-stud-offset (jumper) brick to all supporters it physically overlaps', () => {
    // Two 1x1 supporters side by side in X at y=0.
    // The top brick has offset.x=1 (+0.5 stud shift in X), so its footprint rect
    // spans X [0.5, 1.5] at y=3 — physically overlapping BOTH supporters.
    const left: PlacedBrick = {
      id: 'left',
      partId: 'brick-1x1',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }
    const right: PlacedBrick = {
      id: 'right',
      partId: 'brick-1x1',
      color: 'red',
      x: 1,
      y: 0,
      z: 0,
      rot: 0,
    }
    const top: PlacedBrick = {
      id: 'top',
      partId: 'brick-1x1',
      color: 'blue',
      x: 0,
      y: 3,
      z: 0,
      rot: 0,
      offset: { x: 1, z: 0 },
    }

    const graph = buildConnectionGraph([left, right, top], PART_CATALOG)
    expect(graph.hasEdge('top', 'left')).toBe(true)
    expect(graph.hasEdge('top', 'right')).toBe(true)
  })
})

describe('lateral connections (SNOT mount)', () => {
  it("connects a mounted 'px' brick to the standard brick whose +X face aligns with its anti-stud", () => {
    // brick-1x1 height=3, W=1. Mounted 'px' at x=2: anti-stud world X = 2.5 - 1.5 = 1.0.
    // Standard at x=0: xHi = 1.0. Contact face matches.
    const standard: PlacedBrick = {
      id: 'std',
      partId: 'brick-1x1',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }
    const mounted: PlacedBrick = {
      id: 'mnt',
      partId: 'brick-1x1',
      color: 'blue',
      x: 2,
      y: 0,
      z: 0,
      rot: 0,
      mount: 'px',
    }

    const graph = buildConnectionGraph([standard, mounted], PART_CATALOG)
    expect(graph.hasEdge('std', 'mnt')).toBe(true)
  })

  it('does not connect a mounted brick whose anti-stud face does not align with any standard face', () => {
    // Standard at x=0: xHi=1.0. Mounted 'px' at x=4: anti-stud = 4.5 - 1.5 = 3.0 ≠ 1.0.
    const standard: PlacedBrick = {
      id: 'std',
      partId: 'brick-1x1',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }
    const mounted: PlacedBrick = {
      id: 'mnt',
      partId: 'brick-1x1',
      color: 'blue',
      x: 4,
      y: 0,
      z: 0,
      rot: 0,
      mount: 'px',
    }

    const graph = buildConnectionGraph([standard, mounted], PART_CATALOG)
    expect(graph.hasEdge('std', 'mnt')).toBe(false)
  })

  it("connects a mounted 'nz' brick to the standard brick whose −Z face aligns with its anti-stud", () => {
    // Mounted 'nz' at z=2: anti-stud world Z = zCenter(2.5) + H/2(1.5) = 4.0.
    // Standard at z=4: zLo=4.0. Contact face matches.
    const standard: PlacedBrick = {
      id: 'std',
      partId: 'brick-1x1',
      color: 'red',
      x: 0,
      y: 0,
      z: 4,
      rot: 0,
    }
    const mounted: PlacedBrick = {
      id: 'mnt',
      partId: 'brick-1x1',
      color: 'blue',
      x: 0,
      y: 0,
      z: 2,
      rot: 0,
      mount: 'nz',
    }

    const graph = buildConnectionGraph([standard, mounted], PART_CATALOG)
    expect(graph.hasEdge('std', 'mnt')).toBe(true)
  })

  it("connects an elevated mounted 'px' brick to an elevated standard brick at the same level", () => {
    // Standard at y=3 (stacked on a baseplate brick). Mounted 'px' at x=2, y=3.
    // Anti-stud: xCenter(2.5) − H/2(1.5) = 1.0. Standard xHi = 1.0. Face matches.
    // Y overlap: mounted bottomY=3, H=3, W=1 → mountedY [4.0, 5.0].
    //            Standard bottomY=3, height=3 → Y [3, 6]. Overlap [4, 5] ✓.
    const standard: PlacedBrick = {
      id: 'std',
      partId: 'brick-1x1',
      color: 'red',
      x: 0,
      y: 3,
      z: 0,
      rot: 0,
    }
    const mounted: PlacedBrick = {
      id: 'mnt',
      partId: 'brick-1x1',
      color: 'blue',
      x: 2,
      y: 3,
      z: 0,
      rot: 0,
      mount: 'px',
    }

    const graph = buildConnectionGraph([standard, mounted], PART_CATALOG)
    expect(graph.hasEdge('std', 'mnt')).toBe(true)
  })

  it('does not connect a mounted brick when the standard brick Y range does not overlap', () => {
    // 'px' mounted at y=9: mountedYCenter=10.5, mountedY [10.0, 11.0].
    // Standard at y=0, height=3 → Y [0, 3]. mountedYLo(10) ≥ std top(3) → no overlap.
    const standard: PlacedBrick = {
      id: 'std',
      partId: 'brick-1x1',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }
    const mounted: PlacedBrick = {
      id: 'mnt',
      partId: 'brick-1x1',
      color: 'blue',
      x: 2,
      y: 9,
      z: 0,
      rot: 0,
      mount: 'px',
    }

    const graph = buildConnectionGraph([standard, mounted], PART_CATALOG)
    expect(graph.hasEdge('std', 'mnt')).toBe(false)
  })
})
