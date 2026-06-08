import { create } from 'zustand'
import { temporal } from 'zundo'
import type { TemporalState } from 'zundo'
import { subscribeWithSelector } from 'zustand/middleware'
import Graph from 'graphology'

import type { BuildState, PlacedBrick } from '@/domain/model/types'
import { createBrickId } from '@/state/schema'
import { buildConnectionGraph } from '@/domain/physics/graph'
import { PART_CATALOG } from '@/domain/parts/catalog'

export interface BuildActions {
  /**
   * Adds a brick to the model, assigning it a fresh id which is returned to the
   * caller. The brick is supplied without an id; the store owns id generation.
   */
  placeBrick: (brick: Omit<PlacedBrick, 'id'>) => string
  /** Removes a brick from the model and from the selection. No-op if unknown. */
  deleteBrick: (id: string) => void
  /**
   * Selects a brick. By default this replaces the current selection; pass
   * `additive` to extend it (e.g. shift-click multi-select).
   */
  selectBrick: (id: string, additive?: boolean) => void
  /** Clears the entire selection. */
  clearSelection: () => void
  /** Undo the last state-changing action. */
  undo: () => void
  /** Redo the last undone action. */
  redo: () => void
}

export type BuildStore = BuildState & BuildActions

export interface BuildStoreWithTemporal extends BuildStore {
  temporal: {
    getState: () => TemporalState<Partial<BuildState>>
  }
}

export const useBuildStore = create<BuildStore>()(
  subscribeWithSelector(
    temporal(
      (set) => ({
        bricks: {},
        selection: new Set<string>(),
        connectionGraph: new Graph({
          type: 'undirected',
          allowSelfLoops: false,
        }),

        placeBrick: (brick) => {
          const id = createBrickId()
          set((state) => ({
            bricks: { ...state.bricks, [id]: { id, ...brick } },
          }))
          return id
        },

        deleteBrick: (id) =>
          set((state) => {
            if (!(id in state.bricks)) return state
            const bricks = { ...state.bricks }
            delete bricks[id]
            const selection = new Set(state.selection)
            selection.delete(id)
            return { bricks, selection }
          }),

        selectBrick: (id, additive = false) =>
          set((state) => {
            if (!(id in state.bricks)) return state
            const selection = additive
              ? new Set(state.selection)
              : new Set<string>()
            selection.add(id)
            return { selection }
          }),

        clearSelection: () => set({ selection: new Set<string>() }),

        undo: () => {
          ;(useBuildStore as unknown as BuildStoreWithTemporal).temporal
            .getState()
            .undo()
        },

        redo: () => {
          ;(useBuildStore as unknown as BuildStoreWithTemporal).temporal
            .getState()
            .redo()
        },
      }),
      {
        limit: 50,
        partialize: (state) => {
          const { bricks, selection } = state
          return { bricks, selection }
        },
        equality: (pastState, currentState) =>
          pastState.bricks === currentState.bricks &&
          pastState.selection === currentState.selection,
      },
    ),
  ),
)

// Automatically derive the connection graph whenever the bricks collection changes.
useBuildStore.subscribe(
  (state) => state.bricks,
  (bricks) => {
    useBuildStore.setState({
      connectionGraph: buildConnectionGraph(
        Object.values(bricks),
        PART_CATALOG,
      ),
    })
  },
  { fireImmediately: true },
)
