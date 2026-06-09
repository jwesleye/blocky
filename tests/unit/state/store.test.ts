import { beforeEach, describe, expect, it } from 'vitest'
import Graph from 'graphology'

import type { BuildState, PlacedBrick } from '@/domain/model/types'
import { bricksOutsideBaseplate } from '@/domain/physics'
import { CATALOG_BY_ID as PART_CATALOG } from '@/domain/parts/catalog'
import { BUILD_SCHEMA_VERSION, deserialize, serialize } from '@/state/schema'
import { type BuildStoreWithTemporal, useBuildStore } from '@/state/store'

const sampleBrick: Omit<PlacedBrick, 'id'> = {
  partId: 'brick-2x4',
  color: 'red',
  x: 0,
  y: 0,
  z: 0,
  rot: 0,
}

const placeBrick = (brick: Omit<PlacedBrick, 'id'> = sampleBrick) => {
  const id = useBuildStore.getState().placeBrick(brick)
  expect(id).not.toBeNull()
  return id!
}

const resetStore = () => {
  const temporal = (
    useBuildStore as unknown as BuildStoreWithTemporal
  ).temporal.getState()
  temporal.pause()
  useBuildStore.setState({
    bricks: {},
    selection: new Set<string>(),
    connectionGraph: new Graph({ type: 'undirected', allowSelfLoops: false }),
    lastCollapse: null,
    baseplateSize: 32,
  })
  temporal.clear()
  temporal.resume()
}

describe('useBuildStore', () => {
  beforeEach(resetStore)

  it('canonical store state conforms to the BuildState interface', () => {
    useBuildStore.getState() satisfies BuildState
    expect(useBuildStore.getState().selection).toBeInstanceOf(Set)
    expect(typeof useBuildStore.getState().bricks).toBe('object')
  })

  it('placeBrick adds a brick to the model keyed by a generated id', () => {
    const id = placeBrick(sampleBrick)
    const { bricks } = useBuildStore.getState()
    expect(Object.keys(bricks)).toEqual([id])
    expect(bricks[id]).toEqual({ id, ...sampleBrick })
  })

  it('placeBrick updates the connectionGraph', () => {
    const a = placeBrick(sampleBrick)
    const b = placeBrick({
      ...sampleBrick,
      partId: 'brick-1x1',
      y: 3,
    })
    const { connectionGraph } = useBuildStore.getState()
    expect(connectionGraph.order).toBe(2)
    expect(connectionGraph.hasEdge(a, b)).toBe(true)
  })

  it('deleteBrick removes the entry and updates the graph', () => {
    const a = placeBrick(sampleBrick)
    const b = placeBrick({
      ...sampleBrick,
      partId: 'brick-1x1',
      y: 3,
    })
    useBuildStore.getState().deleteBrick(b)
    const state = useBuildStore.getState()
    expect(state.bricks[b]).toBeUndefined()
    expect(state.connectionGraph.order).toBe(1)
    expect(state.connectionGraph.hasNode(a)).toBe(true)
  })

  it('undo/redo reverses and reapplies placeBrick', () => {
    const id = placeBrick(sampleBrick)
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)

    useBuildStore.getState().undo()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(0)
    expect(useBuildStore.getState().connectionGraph.order).toBe(0)

    useBuildStore.getState().redo()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)
    expect(useBuildStore.getState().bricks[id]).toBeDefined()
    expect(useBuildStore.getState().connectionGraph.hasNode(id)).toBe(true)
  })

  it('undo/redo reverses multiple placeBrick actions in sequence', () => {
    const first = placeBrick(sampleBrick)
    const second = placeBrick({ ...sampleBrick, x: 4 })
    const third = placeBrick({ ...sampleBrick, x: 8 })
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(3)

    useBuildStore.getState().undo()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(2)
    expect(useBuildStore.getState().bricks[third]).toBeUndefined()
    expect(useBuildStore.getState().connectionGraph.order).toBe(2)

    useBuildStore.getState().undo()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)
    expect(useBuildStore.getState().bricks[first]).toBeDefined()
    expect(useBuildStore.getState().bricks[second]).toBeUndefined()
    expect(useBuildStore.getState().connectionGraph.order).toBe(1)

    useBuildStore.getState().redo()
    useBuildStore.getState().redo()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(3)
    expect(useBuildStore.getState().connectionGraph.order).toBe(3)
  })

  it('undo/redo reverses and reapplies deleteBrick', () => {
    const id = placeBrick(sampleBrick)
    useBuildStore.getState().deleteBrick(id)
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(0)

    useBuildStore.getState().undo()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)
    expect(useBuildStore.getState().bricks[id]).toBeDefined()

    useBuildStore.getState().redo()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(0)
  })

  it('placeBrick generates a distinct id for each placement', () => {
    const a = placeBrick(sampleBrick)
    const b = placeBrick({ ...sampleBrick, x: 4 })
    expect(a).not.toEqual(b)
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(2)
  })

  it('deleteBrick removes the entry and clears it from the selection', () => {
    const id = placeBrick(sampleBrick)
    useBuildStore.getState().selectBrick(id)
    useBuildStore.getState().deleteBrick(id)
    const state = useBuildStore.getState()
    expect(state.bricks[id]).toBeUndefined()
    expect(state.selection.has(id)).toBe(false)
  })

  it('deleteBrick is a no-op for an unknown id', () => {
    const id = placeBrick(sampleBrick)
    useBuildStore.getState().deleteBrick('does-not-exist')
    expect(Object.keys(useBuildStore.getState().bricks)).toEqual([id])
  })

  it('selectBrick replaces the selection by default', () => {
    const a = placeBrick(sampleBrick)
    const b = placeBrick({ ...sampleBrick, x: 4 })
    useBuildStore.getState().selectBrick(a)
    expect([...useBuildStore.getState().selection]).toEqual([a])
    useBuildStore.getState().selectBrick(b)
    expect([...useBuildStore.getState().selection]).toEqual([b])
  })

  it('selectBrick can add to the existing selection (additive)', () => {
    const a = placeBrick(sampleBrick)
    const b = placeBrick({ ...sampleBrick, x: 4 })
    useBuildStore.getState().selectBrick(a)
    useBuildStore.getState().selectBrick(b, true)
    expect(useBuildStore.getState().selection).toEqual(new Set([a, b]))
  })

  it('clearSelection empties the selection', () => {
    const id = placeBrick(sampleBrick)
    useBuildStore.getState().selectBrick(id)
    useBuildStore.getState().clearSelection()
    expect(useBuildStore.getState().selection.size).toBe(0)
  })

  it('selectBrick is a no-op for an unknown id', () => {
    const id = placeBrick(sampleBrick)
    useBuildStore.getState().selectBrick(id)
    useBuildStore.getState().selectBrick('does-not-exist', true)
    expect(useBuildStore.getState().selection).toEqual(new Set([id]))

    useBuildStore.getState().selectBrick('still-missing')
    expect(useBuildStore.getState().selection).toEqual(new Set([id]))
  })

  describe('moveSelection', () => {
    it('shifts selected bricks and preserves selection ids', () => {
      const a = placeBrick(sampleBrick)
      const b = placeBrick({ ...sampleBrick, x: 4 })
      const c = placeBrick({ ...sampleBrick, x: 8 })

      useBuildStore.getState().selectBrick(a)
      useBuildStore.getState().selectBrick(b, true)

      const success = useBuildStore
        .getState()
        .moveSelection({ dx: 1, dy: 0, dz: 0 })
      expect(success).toBe(true)

      const { bricks, selection } = useBuildStore.getState()
      expect(bricks[a].x).toBe(1)
      expect(bricks[b].x).toBe(5)
      expect(bricks[c].x).toBe(8) // Unchanged
      expect(selection).toEqual(new Set([a, b]))
    })

    it('rejects invalid moves and leaves state unchanged', () => {
      const a = placeBrick(sampleBrick)
      useBuildStore.getState().selectBrick(a)

      const initialState = useBuildStore.getState().bricks
      const success = useBuildStore
        .getState()
        .moveSelection({ dx: 100, dy: 0, dz: 0 }) // Out of bounds

      expect(success).toBe(false)
      expect(useBuildStore.getState().bricks).toBe(initialState)
    })

    it('is captured as a single undoable step', () => {
      const a = placeBrick(sampleBrick)
      useBuildStore.getState().selectBrick(a)

      useBuildStore.getState().moveSelection({ dx: 1, dy: 0, dz: 0 })
      expect(useBuildStore.getState().bricks[a].x).toBe(1)

      useBuildStore.getState().undo()
      expect(useBuildStore.getState().bricks[a].x).toBe(0)

      useBuildStore.getState().redo()
      expect(useBuildStore.getState().bricks[a].x).toBe(1)
    })
  })

  describe('mirrorSelection', () => {
    it('commits reflected positions, preserves brick ids, and keeps selection', () => {
      // Asymmetric group: brick-2x4 at x=0 (W=2) and brick-1x1 at x=5 (W=1)
      // bounding box X: cells 0,1 and 5 → minX=0, maxX=5
      // mirror x: a new_x=0+5-(0+2-1)=4, b new_x=0+5-(5+1-1)=0
      const a = placeBrick({ ...sampleBrick, x: 0 })
      const b = placeBrick({
        partId: 'brick-1x1',
        color: 'blue',
        x: 5,
        y: 0,
        z: 0,
        rot: 0,
      })

      useBuildStore.getState().selectBrick(a)
      useBuildStore.getState().selectBrick(b, true)

      const success = useBuildStore.getState().mirrorSelection('x')
      expect(success).toBe(true)

      const { bricks, selection } = useBuildStore.getState()
      expect(bricks[a].x).toBe(4)
      expect(bricks[b].x).toBe(0)
      expect(selection).toEqual(new Set([a, b]))
    })

    it('rejects invalid mirrors and leaves state referentially unchanged', () => {
      // Directly inject bricks bypassing placement validation:
      // f1 floating at y=3, f2 grounded at y=0.
      // Mirror x: f1→x=5,y=3 (still floating), f2→x=0,y=0.
      // canPlaceGroup rejects because the mirrored f1 is floating.
      const f1Id = 'f1-test'
      const f2Id = 'f2-test'
      useBuildStore.setState({
        bricks: {
          [f1Id]: {
            id: f1Id,
            partId: 'brick-1x1',
            color: 'red',
            x: 0,
            y: 3,
            z: 0,
            rot: 0 as const,
          },
          [f2Id]: {
            id: f2Id,
            partId: 'brick-1x1',
            color: 'blue',
            x: 5,
            y: 0,
            z: 0,
            rot: 0 as const,
          },
        },
        selection: new Set([f1Id, f2Id]),
      })

      const bricksBefore = useBuildStore.getState().bricks
      const selBefore = useBuildStore.getState().selection

      const success = useBuildStore.getState().mirrorSelection('x')
      expect(success).toBe(false)
      expect(useBuildStore.getState().bricks).toBe(bricksBefore)
      expect(useBuildStore.getState().selection).toBe(selBefore)
    })

    it('is captured as a single undoable/redoable step', () => {
      // Two brick-1x1 at x=0 and x=5, mirror swaps them: a→x=5, b→x=0
      const a = placeBrick({
        partId: 'brick-1x1',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
      })
      const b = placeBrick({
        partId: 'brick-1x1',
        color: 'blue',
        x: 5,
        y: 0,
        z: 0,
        rot: 0,
      })

      useBuildStore.getState().selectBrick(a)
      useBuildStore.getState().selectBrick(b, true)

      const success = useBuildStore.getState().mirrorSelection('x')
      expect(success).toBe(true)
      expect(useBuildStore.getState().bricks[a].x).toBe(5)
      expect(useBuildStore.getState().bricks[b].x).toBe(0)

      useBuildStore.getState().undo()
      expect(useBuildStore.getState().bricks[a].x).toBe(0)
      expect(useBuildStore.getState().bricks[b].x).toBe(5)

      useBuildStore.getState().redo()
      expect(useBuildStore.getState().bricks[a].x).toBe(5)
      expect(useBuildStore.getState().bricks[b].x).toBe(0)
    })
  })

  describe('duplicateSelection', () => {
    it('creates clones with fresh ids and selects them', () => {
      const a = placeBrick(sampleBrick)
      useBuildStore.getState().selectBrick(a)

      const success = useBuildStore
        .getState()
        .duplicateSelection({ dx: 0, dy: 3, dz: 0 })
      expect(success).toBe(true)

      const { bricks, selection } = useBuildStore.getState()
      expect(Object.keys(bricks)).toHaveLength(2)
      expect(selection.size).toBe(1)

      const cloneId = [...selection][0]
      expect(cloneId).not.toBe(a)
      expect(bricks[cloneId]).toEqual({
        ...sampleBrick,
        id: cloneId,
        y: 3,
      })
      expect(bricks[a].y).toBe(0) // Original preserved
    })

    it('rejects invalid duplicates and leaves state unchanged', () => {
      const a = placeBrick(sampleBrick)
      useBuildStore.getState().selectBrick(a)

      const initialState = useBuildStore.getState()
      const success = useBuildStore
        .getState()
        .duplicateSelection({ dx: 0, dy: 0, dz: 0 }) // Collision with original

      expect(success).toBe(false)
      expect(useBuildStore.getState().bricks).toBe(initialState.bricks)
      expect(useBuildStore.getState().selection).toBe(initialState.selection)
    })

    it('is captured as a single undoable step', () => {
      const a = placeBrick(sampleBrick)
      useBuildStore.getState().selectBrick(a)

      useBuildStore.getState().duplicateSelection({ dx: 0, dy: 3, dz: 0 })
      expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(2)

      useBuildStore.getState().undo()
      expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)
      expect(useBuildStore.getState().selection).toEqual(new Set([a]))

      useBuildStore.getState().redo()
      expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(2)
    })
  })

  describe('baseplateSize', () => {
    it('defaults to 32', () => {
      expect(useBuildStore.getState().baseplateSize).toBe(32)
    })

    it('setBaseplateSize updates baseplateSize', () => {
      useBuildStore.getState().setBaseplateSize(48)
      expect(useBuildStore.getState().baseplateSize).toBe(48)
    })

    it('a brick valid on a 32-plate is detectable as outside after setBaseplateSize(16)', () => {
      useBuildStore.getState().placeBrick({
        partId: 'brick-1x1',
        color: 'red',
        x: 20,
        y: 0,
        z: 20,
        rot: 0,
      })
      useBuildStore.getState().setBaseplateSize(16)
      const state = useBuildStore.getState()
      const outside = bricksOutsideBaseplate(
        Object.values(state.bricks),
        state.baseplateSize,
        PART_CATALOG,
      )
      expect(outside).toHaveLength(1)
    })

    it('moveSelection rejects a move that leaves current baseplateSize', () => {
      const id = placeBrick({
        partId: 'brick-1x1',
        color: 'red',
        x: 14,
        y: 0,
        z: 0,
        rot: 0,
      })
      useBuildStore.getState().setBaseplateSize(16)
      useBuildStore.getState().selectBrick(id)
      expect(
        useBuildStore.getState().moveSelection({ dx: 2, dy: 0, dz: 0 }),
      ).toBe(false)
      expect(
        useBuildStore.getState().moveSelection({ dx: -1, dy: 0, dz: 0 }),
      ).toBe(true)
    })

    it('duplicateSelection rejects a duplicate that leaves current baseplateSize', () => {
      const id = placeBrick({
        partId: 'brick-1x1',
        color: 'red',
        x: 14,
        y: 0,
        z: 0,
        rot: 0,
      })
      useBuildStore.getState().setBaseplateSize(16)
      useBuildStore.getState().selectBrick(id)
      expect(
        useBuildStore.getState().duplicateSelection({ dx: 2, dy: 0, dz: 0 }),
      ).toBe(false)
    })
  })

  describe('grounding validation', () => {
    it('rejects a floating placement and leaves bricks unchanged', () => {
      const anchor = placeBrick({ ...sampleBrick, partId: 'brick-1x1' })
      const initialBricks = useBuildStore.getState().bricks

      const rejected = useBuildStore.getState().placeBrick({
        ...sampleBrick,
        partId: 'brick-1x1',
        x: 5,
        y: 6,
        z: 5,
      })

      expect(rejected).toBeNull()
      expect(useBuildStore.getState().bricks).toBe(initialBricks)
      expect(Object.keys(useBuildStore.getState().bricks)).toEqual([anchor])
    })

    it('rejects a brick resting on a tile top and leaves bricks unchanged', () => {
      const tile = placeBrick({
        partId: 'tile-1x1',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
      })
      const initialBricks = useBuildStore.getState().bricks

      const rejected = useBuildStore.getState().placeBrick({
        partId: 'plate-1x1',
        color: 'red',
        x: 0,
        y: 1,
        z: 0,
        rot: 0,
      })

      expect(rejected).toBeNull()
      expect(useBuildStore.getState().bricks).toBe(initialBricks)
      expect(Object.keys(useBuildStore.getState().bricks)).toEqual([tile])
    })
  })

  describe('triggerCollapse', () => {
    // A grounded 2x4 at the origin (stays standing) plus two 1x1 bricks that
    // float high above the baseplate, clear of the 2x4 footprint and of each
    // other (no stud path to the ground → both collapse).
    const seedCollapseModel = () => {
      const grounded = placeBrick(sampleBrick)
      const floatA = 'float-a'
      const floatB = 'float-b'

      useBuildStore.setState({
        bricks: {
          ...useBuildStore.getState().bricks,
          [floatA]: {
            id: floatA,
            ...sampleBrick,
            partId: 'brick-1x1',
            x: 10,
            y: 3,
            z: 10,
          },
          [floatB]: {
            id: floatB,
            ...sampleBrick,
            partId: 'brick-1x1',
            x: 14,
            y: 3,
            z: 10,
          },
        },
      })

      return { grounded, floatA, floatB }
    }

    const pastStateCount = () =>
      (useBuildStore as unknown as BuildStoreWithTemporal).temporal.getState()
        .pastStates.length

    it('removes all collapsing bricks in a single undoable history entry', () => {
      const { grounded, floatA, floatB } = seedCollapseModel()
      const preSnapshot = Object.values(useBuildStore.getState().bricks)
      expect(preSnapshot).toHaveLength(3)

      const before = pastStateCount()
      useBuildStore.getState().triggerCollapse()

      const collapsed = useBuildStore.getState()
      expect(Object.keys(collapsed.bricks)).toEqual([grounded])
      expect(collapsed.bricks[floatA]).toBeUndefined()
      expect(collapsed.bricks[floatB]).toBeUndefined()
      // Exactly one history entry was added (the graph subscription must not
      // record a second one, since connectionGraph is not partialized).
      expect(pastStateCount()).toBe(before + 1)

      useBuildStore.getState().undo()
      const restored = useBuildStore.getState()
      expect(Object.values(restored.bricks)).toEqual(preSnapshot)
      expect(restored.connectionGraph.order).toBe(3)
    })

    it('redo re-applies the stored collapse diff', () => {
      const { grounded } = seedCollapseModel()
      useBuildStore.getState().triggerCollapse()
      const postCollapse = { ...useBuildStore.getState().bricks }

      useBuildStore.getState().undo()
      expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(3)

      useBuildStore.getState().redo()
      expect(useBuildStore.getState().bricks).toEqual(postCollapse)
      expect(Object.keys(useBuildStore.getState().bricks)).toEqual([grounded])
    })

    it('clears collapsing bricks from the selection', () => {
      const { grounded, floatA } = seedCollapseModel()
      useBuildStore.getState().selectBrick(grounded)
      useBuildStore.getState().selectBrick(floatA, true)

      useBuildStore.getState().triggerCollapse()
      const { selection } = useBuildStore.getState()
      expect(selection).toEqual(new Set([grounded]))
    })

    it('is a no-op (no history entry) when nothing collapses', () => {
      placeBrick(sampleBrick)
      const before = pastStateCount()
      const bricksRef = useBuildStore.getState().bricks

      useBuildStore.getState().triggerCollapse()

      expect(useBuildStore.getState().bricks).toBe(bricksRef)
      expect(pastStateCount()).toBe(before)
      expect(useBuildStore.getState().lastCollapse).toBeNull()
    })

    it('labels the collapse and round-trips the label through undo/redo', () => {
      seedCollapseModel()
      useBuildStore.getState().triggerCollapse()
      expect(useBuildStore.getState().lastCollapse).toEqual({
        count: 2,
        label: 'Undo collapse',
      })

      useBuildStore.getState().undo()
      expect(useBuildStore.getState().lastCollapse).toBeNull()

      useBuildStore.getState().redo()
      expect(useBuildStore.getState().lastCollapse).toEqual({
        count: 2,
        label: 'Undo collapse',
      })
    })

    it('spawns dynamic bodies only for the collapsing bricks', () => {
      const { grounded, floatA, floatB } = seedCollapseModel()

      useBuildStore.getState().triggerCollapse()
      const { activeCollapse } = useBuildStore.getState()

      expect(activeCollapse).not.toBeNull()
      const bodyIds = activeCollapse!.collapsingBodies.map((b) => b.id).sort()
      expect(bodyIds).toEqual([floatA, floatB].sort())
      // The stable remainder is recorded as standing, never as a dynamic body.
      expect(activeCollapse!.standingBricks.map((b) => b.id)).toEqual([
        grounded,
      ])
      // Bodies carry their original grid-derived position.
      const floatBody = activeCollapse!.collapsingBodies.find(
        (b) => b.id === floatA,
      )
      expect(floatBody?.position[1]).toBeGreaterThan(0)
    })

    it('undo clears activeCollapse; redo leaves it null', () => {
      seedCollapseModel()
      useBuildStore.getState().triggerCollapse()
      expect(useBuildStore.getState().activeCollapse).not.toBeNull()

      useBuildStore.getState().undo()
      expect(useBuildStore.getState().activeCollapse).toBeNull()

      useBuildStore.getState().redo()
      expect(useBuildStore.getState().activeCollapse).toBeNull()
    })

    it('completeCollapse clears the active collapse without touching bricks', () => {
      const { grounded } = seedCollapseModel()
      useBuildStore.getState().triggerCollapse()
      expect(useBuildStore.getState().activeCollapse).not.toBeNull()

      const bricksRef = useBuildStore.getState().bricks
      useBuildStore.getState().completeCollapse()

      expect(useBuildStore.getState().activeCollapse).toBeNull()
      expect(useBuildStore.getState().bricks).toBe(bricksRef)
      expect(Object.keys(useBuildStore.getState().bricks)).toEqual([grounded])
    })

    it('leaves activeCollapse null when nothing collapses', () => {
      useBuildStore.getState().placeBrick(sampleBrick)
      useBuildStore.getState().triggerCollapse()
      expect(useBuildStore.getState().activeCollapse).toBeNull()
    })

    it('clears lastCollapse on a subsequent non-collapse edit', () => {
      seedCollapseModel()
      useBuildStore.getState().triggerCollapse()
      expect(useBuildStore.getState().lastCollapse).not.toBeNull()

      // Any later state-changing action makes the collapse no longer the top
      // undo entry, so its label must not linger.
      placeBrick({ ...sampleBrick, x: 20 })
      expect(useBuildStore.getState().lastCollapse).toBeNull()
    })
  })
})

describe('build schema serialization', () => {
  beforeEach(resetStore)

  it('serialize produces compact Build JSON without selection or ids', () => {
    placeBrick(sampleBrick)
    const json = serialize(useBuildStore.getState())
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.baseplate).toEqual({ size: 32 })
    expect(parsed.bricks).toEqual([sampleBrick])
  })

  it('deserialize round-trips a serialized build', () => {
    placeBrick(sampleBrick)
    placeBrick({ ...sampleBrick, partId: 'plate-2x2', x: 6 })
    const json = serialize(useBuildStore.getState())
    const restored = deserialize(json)
    expect(serialize(restored)).toEqual(json)
    expect(restored.selection.size).toBe(0)
    expect(Object.keys(restored.bricks)).toHaveLength(2)
  })

  it('preserves the active baseplate size through serialize and deserialize', () => {
    useBuildStore.getState().setBaseplateSize(48)
    placeBrick(sampleBrick)

    const json = serialize(useBuildStore.getState())
    const restored = deserialize(json)

    expect(JSON.parse(json).baseplate).toEqual({ size: 48 })
    expect(restored.baseplateSize).toBe(48)
    expect(serialize(restored)).toEqual(json)
  })

  it('round-trips half-stud offsets without affecting classic bricks', () => {
    useBuildStore.setState({
      bricks: {
        offset: {
          id: 'offset',
          partId: 'brick-1x1',
          color: 'yellow',
          x: 1,
          y: 0,
          z: 2,
          rot: 0,
          offset: { x: 0, z: 1 },
        } as unknown as PlacedBrick,
        classic: {
          id: 'classic',
          partId: 'plate-1x2',
          color: 'blue',
          x: 0,
          y: 1,
          z: 0,
          rot: 2,
        },
      },
    })

    const json = serialize(useBuildStore.getState())
    const restored = deserialize(json)
    const restoredBricks = Object.values(restored.bricks).sort((a, b) =>
      a.partId.localeCompare(b.partId),
    )

    expect(JSON.parse(json).version).toBe(2)
    expect(restoredBricks).toEqual([
      {
        id: restoredBricks[0].id,
        partId: 'brick-1x1',
        color: 'yellow',
        x: 1,
        y: 0,
        z: 2,
        rot: 0,
        offset: { x: 0, z: 1 },
      },
      {
        id: restoredBricks[1].id,
        partId: 'plate-1x2',
        color: 'blue',
        x: 0,
        y: 1,
        z: 0,
        rot: 2,
      },
    ])
  })

  it('deserialize assigns fresh ids matching the brick payloads', () => {
    const id = placeBrick(sampleBrick)
    const json = serialize(useBuildStore.getState())
    const restored = deserialize(json)
    const [restoredId] = Object.keys(restored.bricks)
    expect(restored.bricks[restoredId]).toEqual({
      id: restoredId,
      ...sampleBrick,
    })
    expect(restoredId).not.toEqual(id)
  })

  it('deserialize rejects malformed build JSON', () => {
    expect(() => deserialize('{"version":1}')).toThrow()
    expect(() =>
      deserialize(
        '{"version":1,"baseplate":{"size":32},"bricks":[{"partId":"x"}]}',
      ),
    ).toThrow()
    expect(() => deserialize('not json')).toThrow()
  })

  it('deserialize rejects unsupported schema envelopes', () => {
    expect(() =>
      deserialize(
        JSON.stringify({
          version: BUILD_SCHEMA_VERSION + 1,
          baseplate: { size: 32 },
          bricks: [],
        }),
      ),
    ).toThrow()

    expect(() =>
      deserialize(
        JSON.stringify({
          version: BUILD_SCHEMA_VERSION,
          baseplate: { size: 33 },
          bricks: [],
        }),
      ),
    ).toThrow()
  })

  it('deserializes an existing v1 payload without offsets', () => {
    const restored = deserialize(
      JSON.stringify({
        version: 1,
        baseplate: { size: 32 },
        bricks: [
          {
            partId: 'brick-2x4',
            color: 'red',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
          },
        ],
      }),
    )

    expect(Object.values(restored.bricks)).toEqual([
      {
        id: Object.values(restored.bricks)[0].id,
        partId: 'brick-2x4',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
      },
    ])
  })

  it('rejects an out-of-range half-stud offset', () => {
    expect(() =>
      deserialize(
        JSON.stringify({
          version: 2,
          baseplate: { size: 32 },
          bricks: [
            {
              partId: 'brick-1x1',
              color: 'red',
              x: 0,
              y: 0,
              z: 0,
              rot: 0,
              offset: { x: 0, z: 2 },
            },
          ],
        }),
      ),
    ).toThrow()
  })
})
