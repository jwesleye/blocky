import { create } from 'zustand'
import { temporal } from 'zundo'
import type { TemporalState } from 'zundo'
import { subscribeWithSelector } from 'zustand/middleware'
import Graph from 'graphology'

import type { BuildState, PlacedBrick } from '@/domain/model/types'
import { createBrickId } from '@/state/schema'
import {
  buildConnectionGraph,
  translateBrick,
  canPlaceGroup,
} from '@/domain/physics'
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
   * Translates the current selection by a grid delta. Returns true if the move
   * is valid and was committed.
   */
  moveSelection: (delta: { dx: number; dy: number; dz: number }) => boolean
  /**
   * Duplicates the current selection at a grid delta. Returns true if the
   * duplicate is valid and was committed; sets selection to the new clones.
   */
  duplicateSelection: (delta: { dx: number; dy: number; dz: number }) => boolean
  /** Returns true if moving the current selection by delta would be valid. */
  previewMoveSelection: (delta: { dx: number; dy: number; dz: number }) => boolean
  /** Returns true if duplicating the current selection at delta would be valid. */
  previewDuplicateSelection: (delta: {
    dx: number
    dy: number
    dz: number
  }) => boolean
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
      (set, get) => ({
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

        moveSelection: (delta) => {
          const state = get()
          if (state.selection.size === 0) return false

          const selectedBricks = Array.from(state.selection)
            .map((id) => state.bricks[id])
            .filter((b): b is PlacedBrick => !!b)

          const otherBricks = Object.values(state.bricks).filter(
            (b) => !state.selection.has(b.id),
          )

          const moved = selectedBricks.map((b) => translateBrick(b, delta))

          if (!canPlaceGroup(moved, otherBricks, PART_CATALOG)) {
            return false
          }

          const nextBricks = { ...state.bricks }
          for (const b of moved) {
            nextBricks[b.id] = b
          }

          set({ bricks: nextBricks })
          return true
        },

        duplicateSelection: (delta) => {
          const state = get()
          if (state.selection.size === 0) return false

          const selectedBricks = Array.from(state.selection)
            .map((id) => state.bricks[id])
            .filter((b): b is PlacedBrick => !!b)

          const clones = selectedBricks.map((b) => {
            const id = createBrickId()
            return translateBrick({ ...b, id }, delta)
          })

          const allExisting = Object.values(state.bricks)

          if (!canPlaceGroup(clones, allExisting, PART_CATALOG)) {
            return false
          }

          const nextBricks = { ...state.bricks }
          const nextSelection = new Set<string>()
          for (const b of clones) {
            nextBricks[b.id] = b
            nextSelection.add(b.id)
          }

          set({ bricks: nextBricks, selection: nextSelection })
          return true
        },

        previewMoveSelection: (delta) => {
          const state = get()
          if (state.selection.size === 0) return false
          const selectedBricks = Array.from(state.selection)
            .map((id) => state.bricks[id])
            .filter((b): b is PlacedBrick => !!b)
          const otherBricks = Object.values(state.bricks).filter(
            (b) => !state.selection.has(b.id),
          )
          const moved = selectedBricks.map((b) => translateBrick(b, delta))
          return canPlaceGroup(moved, otherBricks, PART_CATALOG)
        },

        previewDuplicateSelection: (delta) => {
          const state = get()
          if (state.selection.size === 0) return false
          const selectedBricks = Array.from(state.selection)
            .map((id) => state.bricks[id])
            .filter((b): b is PlacedBrick => !!b)
          const clones = selectedBricks.map((b, i) => {
            return translateBrick({ ...b, id: `preview-${i}` }, delta)
          })
          const allExisting = Object.values(state.bricks)
          return canPlaceGroup(clones, allExisting, PART_CATALOG)
        },

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
