import { beforeEach, describe, expect, it } from 'vitest'

import type { PlacedBrick } from '@/domain/model/types'
import { useBuildStore } from '@/state/store'

const sampleBrick: Omit<PlacedBrick, 'id'> = {
  partId: 'brick-2x4',
  color: 'red',
  x: 0,
  y: 0,
  z: 0,
  rot: 0,
}

beforeEach(() => {
  useBuildStore.setState({ bricks: {}, selection: new Set<string>() })
  useBuildStore.temporal.getState().clear()
})

describe('placeBrick undo/redo', () => {
  it('can be undone', () => {
    const id = useBuildStore.getState().placeBrick(sampleBrick)
    expect(useBuildStore.getState().bricks[id]).toBeDefined()
    useBuildStore.temporal.getState().undo()
    expect(useBuildStore.getState().bricks).toEqual({})
  })

  it('can be redone after undo', () => {
    const id = useBuildStore.getState().placeBrick(sampleBrick)
    useBuildStore.temporal.getState().undo()
    useBuildStore.temporal.getState().redo()
    expect(useBuildStore.getState().bricks[id]).toEqual({ id, ...sampleBrick })
  })
})

describe('deleteBrick undo/redo', () => {
  it('restores the deleted brick on undo', () => {
    const id = useBuildStore.getState().placeBrick(sampleBrick)
    useBuildStore.temporal.getState().clear()
    useBuildStore.getState().deleteBrick(id)
    expect(useBuildStore.getState().bricks[id]).toBeUndefined()
    useBuildStore.temporal.getState().undo()
    expect(useBuildStore.getState().bricks[id]).toEqual({ id, ...sampleBrick })
  })
})

describe('commitCollapse', () => {
  it('removes all collapsing bricks atomically', () => {
    const a = useBuildStore.getState().placeBrick(sampleBrick)
    const b = useBuildStore.getState().placeBrick({ ...sampleBrick, x: 2 })
    const c = useBuildStore.getState().placeBrick({ ...sampleBrick, x: 4 })
    useBuildStore.getState().commitCollapse(new Set([a, b]))
    expect(Object.keys(useBuildStore.getState().bricks)).toEqual([c])
  })

  it('restores all collapsed bricks in a single undo step', () => {
    const a = useBuildStore.getState().placeBrick(sampleBrick)
    const b = useBuildStore.getState().placeBrick({ ...sampleBrick, x: 2 })
    const c = useBuildStore.getState().placeBrick({ ...sampleBrick, x: 4 })
    useBuildStore.temporal.getState().clear()
    useBuildStore.getState().commitCollapse(new Set([a, b]))
    useBuildStore.temporal.getState().undo()
    expect(Object.keys(useBuildStore.getState().bricks)).toEqual([a, b, c])
  })

  it('keeps place and collapse as separate undo steps', () => {
    const a = useBuildStore.getState().placeBrick(sampleBrick)
    const b = useBuildStore.getState().placeBrick({ ...sampleBrick, x: 2 })
    const c = useBuildStore.getState().placeBrick({ ...sampleBrick, x: 4 })
    useBuildStore.getState().commitCollapse(new Set([b, c]))
    // After collapse only the first brick remains.
    expect(Object.keys(useBuildStore.getState().bricks)).toEqual([a])
    // One undo restores the entire pre-collapse build in a single step.
    useBuildStore.temporal.getState().undo()
    expect(Object.keys(useBuildStore.getState().bricks)).toEqual([a, b, c])
    // A further undo unwinds the previous placement.
    useBuildStore.temporal.getState().undo()
    expect(Object.keys(useBuildStore.getState().bricks)).toEqual([a, b])
  })
})
