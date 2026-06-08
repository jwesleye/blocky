import { beforeEach, describe, expect, it } from 'vitest'
import Graph from 'graphology'

import type { PlacedBrick } from '@/domain/model/types'
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

const resetStore = () => {
  const temporal = (useBuildStore as unknown as BuildStoreWithTemporal).temporal
    .getState()
  temporal.pause()
  useBuildStore.setState({
    bricks: {},
    selection: new Set<string>(),
    connectionGraph: new Graph({ type: 'undirected', allowSelfLoops: false }),
  })
  temporal.clear()
  temporal.resume()
}

describe('useBuildStore', () => {
  beforeEach(resetStore)

  it('placeBrick adds a brick to the model keyed by a generated id', () => {
    const id = useBuildStore.getState().placeBrick(sampleBrick)
    const { bricks } = useBuildStore.getState()
    expect(Object.keys(bricks)).toEqual([id])
    expect(bricks[id]).toEqual({ id, ...sampleBrick })
  })

  it('placeBrick updates the connectionGraph', () => {
    const a = useBuildStore.getState().placeBrick(sampleBrick)
    const b = useBuildStore.getState().placeBrick({
      ...sampleBrick,
      partId: 'brick-1x1',
      y: 3,
    })
    const { connectionGraph } = useBuildStore.getState()
    expect(connectionGraph.order).toBe(2)
    expect(connectionGraph.hasEdge(a, b)).toBe(true)
  })

  it('deleteBrick removes the entry and updates the graph', () => {
    const a = useBuildStore.getState().placeBrick(sampleBrick)
    const b = useBuildStore.getState().placeBrick({
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
    const id = useBuildStore.getState().placeBrick(sampleBrick)
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
    const first = useBuildStore.getState().placeBrick(sampleBrick)
    const second = useBuildStore.getState().placeBrick({ ...sampleBrick, x: 4 })
    const third = useBuildStore.getState().placeBrick({ ...sampleBrick, x: 8 })
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
    const id = useBuildStore.getState().placeBrick(sampleBrick)
    useBuildStore.getState().deleteBrick(id)
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(0)

    useBuildStore.getState().undo()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)
    expect(useBuildStore.getState().bricks[id]).toBeDefined()

    useBuildStore.getState().redo()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(0)
  })

  it('placeBrick generates a distinct id for each placement', () => {
    const a = useBuildStore.getState().placeBrick(sampleBrick)
    const b = useBuildStore.getState().placeBrick({ ...sampleBrick, x: 4 })
    expect(a).not.toEqual(b)
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(2)
  })

  it('deleteBrick removes the entry and clears it from the selection', () => {
    const id = useBuildStore.getState().placeBrick(sampleBrick)
    useBuildStore.getState().selectBrick(id)
    useBuildStore.getState().deleteBrick(id)
    const state = useBuildStore.getState()
    expect(state.bricks[id]).toBeUndefined()
    expect(state.selection.has(id)).toBe(false)
  })

  it('deleteBrick is a no-op for an unknown id', () => {
    const id = useBuildStore.getState().placeBrick(sampleBrick)
    useBuildStore.getState().deleteBrick('does-not-exist')
    expect(Object.keys(useBuildStore.getState().bricks)).toEqual([id])
  })

  it('selectBrick replaces the selection by default', () => {
    const a = useBuildStore.getState().placeBrick(sampleBrick)
    const b = useBuildStore.getState().placeBrick({ ...sampleBrick, x: 4 })
    useBuildStore.getState().selectBrick(a)
    expect([...useBuildStore.getState().selection]).toEqual([a])
    useBuildStore.getState().selectBrick(b)
    expect([...useBuildStore.getState().selection]).toEqual([b])
  })

  it('selectBrick can add to the existing selection (additive)', () => {
    const a = useBuildStore.getState().placeBrick(sampleBrick)
    const b = useBuildStore.getState().placeBrick({ ...sampleBrick, x: 4 })
    useBuildStore.getState().selectBrick(a)
    useBuildStore.getState().selectBrick(b, true)
    expect(useBuildStore.getState().selection).toEqual(new Set([a, b]))
  })

  it('clearSelection empties the selection', () => {
    const id = useBuildStore.getState().placeBrick(sampleBrick)
    useBuildStore.getState().selectBrick(id)
    useBuildStore.getState().clearSelection()
    expect(useBuildStore.getState().selection.size).toBe(0)
  })

  it('selectBrick is a no-op for an unknown id', () => {
    const id = useBuildStore.getState().placeBrick(sampleBrick)
    useBuildStore.getState().selectBrick(id)
    useBuildStore.getState().selectBrick('does-not-exist', true)
    expect(useBuildStore.getState().selection).toEqual(new Set([id]))

    useBuildStore.getState().selectBrick('still-missing')
    expect(useBuildStore.getState().selection).toEqual(new Set([id]))
  })

  describe('moveSelection', () => {
    it('shifts selected bricks and preserves selection ids', () => {
      const a = useBuildStore.getState().placeBrick(sampleBrick)
      const b = useBuildStore.getState().placeBrick({ ...sampleBrick, x: 4 })
      const c = useBuildStore.getState().placeBrick({ ...sampleBrick, x: 8 })

      useBuildStore.getState().selectBrick(a)
      useBuildStore.getState().selectBrick(b, true)

      const success = useBuildStore.getState().moveSelection({ dx: 1, dy: 0, dz: 0 })
      expect(success).toBe(true)

      const { bricks, selection } = useBuildStore.getState()
      expect(bricks[a].x).toBe(1)
      expect(bricks[b].x).toBe(5)
      expect(bricks[c].x).toBe(8) // Unchanged
      expect(selection).toEqual(new Set([a, b]))
    })

    it('rejects invalid moves and leaves state unchanged', () => {
      const a = useBuildStore.getState().placeBrick(sampleBrick)
      useBuildStore.getState().selectBrick(a)

      const initialState = useBuildStore.getState().bricks
      const success = useBuildStore.getState().moveSelection({ dx: 100, dy: 0, dz: 0 }) // Out of bounds
      
      expect(success).toBe(false)
      expect(useBuildStore.getState().bricks).toBe(initialState)
    })

    it('is captured as a single undoable step', () => {
      const a = useBuildStore.getState().placeBrick(sampleBrick)
      useBuildStore.getState().selectBrick(a)
      
      useBuildStore.getState().moveSelection({ dx: 1, dy: 0, dz: 0 })
      expect(useBuildStore.getState().bricks[a].x).toBe(1)

      useBuildStore.getState().undo()
      expect(useBuildStore.getState().bricks[a].x).toBe(0)

      useBuildStore.getState().redo()
      expect(useBuildStore.getState().bricks[a].x).toBe(1)
    })
  })

  describe('duplicateSelection', () => {
    it('creates clones with fresh ids and selects them', () => {
      const a = useBuildStore.getState().placeBrick(sampleBrick)
      useBuildStore.getState().selectBrick(a)

      const success = useBuildStore.getState().duplicateSelection({ dx: 0, dy: 3, dz: 0 })
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
      const a = useBuildStore.getState().placeBrick(sampleBrick)
      useBuildStore.getState().selectBrick(a)

      const initialState = useBuildStore.getState()
      const success = useBuildStore.getState().duplicateSelection({ dx: 0, dy: 0, dz: 0 }) // Collision with original
      
      expect(success).toBe(false)
      expect(useBuildStore.getState().bricks).toBe(initialState.bricks)
      expect(useBuildStore.getState().selection).toBe(initialState.selection)
    })

    it('is captured as a single undoable step', () => {
      const a = useBuildStore.getState().placeBrick(sampleBrick)
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
})

describe('build schema serialization', () => {
  beforeEach(resetStore)

  it('serialize produces compact Build JSON without selection or ids', () => {
    useBuildStore.getState().placeBrick(sampleBrick)
    const json = serialize(useBuildStore.getState())
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.baseplate).toEqual({ size: 32 })
    expect(parsed.bricks).toEqual([sampleBrick])
  })

  it('deserialize round-trips a serialized build', () => {
    useBuildStore.getState().placeBrick(sampleBrick)
    useBuildStore
      .getState()
      .placeBrick({ ...sampleBrick, partId: 'plate-2x2', x: 6 })
    const json = serialize(useBuildStore.getState())
    const restored = deserialize(json)
    expect(serialize(restored)).toEqual(json)
    expect(restored.selection.size).toBe(0)
    expect(Object.keys(restored.bricks)).toHaveLength(2)
  })

  it('deserialize assigns fresh ids matching the brick payloads', () => {
    const id = useBuildStore.getState().placeBrick(sampleBrick)
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
          baseplate: { size: 16 },
          bricks: [],
        }),
      ),
    ).toThrow()
  })
})
