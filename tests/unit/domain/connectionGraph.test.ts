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
})
