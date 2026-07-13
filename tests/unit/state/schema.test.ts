import { describe, expect, it, vi, beforeEach } from 'vitest'
import { serialize, deserialize } from '@/state/schema'
import { createBrickId } from '@/domain/model/ids'
import type { BuildState } from '@/domain/model/types'
import Graph from 'graphology'

vi.mock('@/domain/model/ids', () => ({
  createBrickId: vi.fn(),
}))

vi.mock('@/domain/physics/graph', () => ({
  buildConnectionGraph: vi.fn(() => new Graph()),
}))

const MOCK_UUIDS = ['uuid-1', 'uuid-2', 'uuid-3']

describe('state/schema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    let uuidIndex = 0
    vi.mocked(createBrickId).mockImplementation(() => MOCK_UUIDS[uuidIndex++])
  })

  describe('serialize', () => {
    it('serializes a BuildState into a JSON string', () => {
      const state: BuildState = {
        baseplateSize: 32,
        bricks: {
          'uuid-1': {
            id: 'uuid-1',
            partId: 'brick-1x1',
            color: 'red',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
          },
        },
        selection: new Set(['uuid-1']),
        connectionGraph: new Graph(),
        lastCollapse: null,
      }

      const jsonStr = serialize(state)
      const parsed = JSON.parse(jsonStr)
      expect(parsed).toEqual({
        version: 1,
        baseplate: { size: 32 },
        bricks: [
          {
            partId: 'brick-1x1',
            color: 'red',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
          }
        ]
      })
    })

    it('throws if baseplateSize is unsupported', () => {
      const state = {
        baseplateSize: 123,
        bricks: {},
        selection: new Set(),
        connectionGraph: new Graph(),
        lastCollapse: null,
      } as unknown as BuildState

      expect(() => serialize(state)).toThrow()
    })
  })

  describe('deserialize', () => {
    it('deserializes a JSON string into a BuildState', () => {
      const jsonStr = JSON.stringify({
        version: 1,
        baseplate: { size: 32 },
        bricks: [
          {
            partId: 'brick-1x1',
            color: 'red',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
          }
        ]
      })

      const state = deserialize(jsonStr)

      expect(state.baseplateSize).toBe(32)
      expect(state.selection.size).toBe(0)
      expect(state.lastCollapse).toBeNull()

      expect(Object.keys(state.bricks)).toHaveLength(1)
      expect(state.bricks['uuid-1']).toEqual({
        id: 'uuid-1',
        partId: 'brick-1x1',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
      })

      expect(createBrickId).toHaveBeenCalledTimes(1)
    })

    it('throws if JSON is malformed', () => {
      expect(() => deserialize('invalid json')).toThrow()
    })
  })
})
