import { describe, expect, it } from 'vitest'
import type { PlacedBrick } from '@/domain/model/types'
import { PART_CATALOG } from '@/domain/parts/catalog'
import { toBrickFootprint } from '@/domain/parts/footprint'
import { createBuildStore } from '@/state/buildStore'

function placedBrick(
  id: string,
  partId: string,
  x: number,
  y: number,
  z: number,
): PlacedBrick {
  return {
    id,
    partId,
    color: 'red',
    x,
    y,
    z,
    rot: 0,
  }
}

describe('toBrickFootprint', () => {
  it('preserves smooth-top tile metadata from the part catalog', () => {
    const footprint = toBrickFootprint(
      placedBrick('tile', 'tile-1x2', 4, 0, 7),
      PART_CATALOG,
    )

    expect(footprint.cells).toEqual([
      { x: 4, z: 7 },
      { x: 4, z: 8 },
    ])
    expect(footprint.height).toBe(1)
    expect(footprint.hasTopStuds).toBe(false)
  })
})

describe('createBuildStore.placeBrick', () => {
  it('accepts a brick grounded on the baseplate', () => {
    const store = createBuildStore()
    const placed = store
      .getState()
      .placeBrick(placedBrick('base', 'brick-1x1', 0, 0, 0))

    expect(placed).toBe(true)
    expect(store.getState().bricks).toEqual([
      placedBrick('base', 'brick-1x1', 0, 0, 0),
    ])
  })

  it('rejects a floating placement and leaves state unchanged', () => {
    const anchor = placedBrick('anchor', 'brick-1x1', 0, 0, 0)
    const store = createBuildStore([anchor])
    const placed = store
      .getState()
      .placeBrick(placedBrick('float', 'brick-1x1', 5, 6, 5))

    expect(placed).toBe(false)
    expect(store.getState().bricks).toEqual([anchor])
  })

  it('rejects a brick resting on a tile because the tile has no top studs', () => {
    const tile = placedBrick('tile', 'tile-1x1', 0, 0, 0)
    const store = createBuildStore([tile])
    const placed = store
      .getState()
      .placeBrick(placedBrick('top', 'plate-1x1', 0, 1, 0))

    expect(placed).toBe(false)
    expect(store.getState().bricks).toEqual([tile])
  })
})
