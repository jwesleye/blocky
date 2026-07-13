import { describe, expect, it } from 'vitest'
import { buildConnectionGraph } from '@/domain/physics/graph'
import { CATALOG_BY_ID as PART_CATALOG } from '@/domain/parts/catalog'
import type { PlacedBrick } from '@/domain/model/types'
import { BASEPLATE } from '@/domain/physics/placement'

describe('buildConnectionGraph', () => {
  it('correctly drops the BASEPLATE node', () => {
    // Two bricks that rest on the baseplate (bottomY === 0)
    // The underlying placement graph building adds a BASEPLATE node and edges to these bricks.
    const bottomBrick: PlacedBrick = {
      id: 'bottom',
      partId: 'brick-2x2',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }
    const brick2: PlacedBrick = {
      id: 'brick2',
      partId: 'brick-2x2',
      color: 'red',
      x: 3,
      y: 0,
      z: 0,
      rot: 0,
    }

    const graph = buildConnectionGraph([bottomBrick, brick2], PART_CATALOG)
    // Should contain 2 nodes, 'bottom' and 'brick2'. NOT BASEPLATE.
    expect(graph.order).toBe(2)
    expect(graph.hasNode('bottom')).toBe(true)
    expect(graph.hasNode('brick2')).toBe(true)
    expect(graph.hasNode(BASEPLATE)).toBe(false)
  })

  it('adds isolated nodes for bricks with unknown partIds', () => {
    const bottomBrick: PlacedBrick = {
      id: 'bottom',
      partId: 'brick-2x2',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    }
    const unknownBrick: PlacedBrick = {
      id: 'unknown-part',
      partId: 'some-unknown-part',
      color: 'blue',
      x: 0,
      y: 3,
      z: 0,
      rot: 0,
    }

    const graph = buildConnectionGraph([bottomBrick, unknownBrick], PART_CATALOG)
    // Both nodes should be present, but without any edges between them
    expect(graph.order).toBe(2)
    expect(graph.hasNode('bottom')).toBe(true)
    expect(graph.hasNode('unknown-part')).toBe(true)
    expect(graph.hasEdge('bottom', 'unknown-part')).toBe(false)
  })

  it('preserves valid edges correctly', () => {
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
    // graph order should be 2 because BASEPLATE is stripped.
    expect(graph.order).toBe(2)
    expect(graph.hasNode('bottom')).toBe(true)
    expect(graph.hasNode('top')).toBe(true)
    expect(graph.hasEdge('bottom', 'top')).toBe(true)
  })
})
