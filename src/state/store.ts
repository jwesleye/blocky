import { create } from 'zustand'
import { temporal } from 'zundo'
import type { TemporalState } from 'zundo'
import { subscribeWithSelector } from 'zustand/middleware'
import type { StoreApi } from 'zustand/vanilla'
import Graph from 'graphology'

import type { BuildState, PlacedBrick } from '@/domain/model/types'
import { createBrickId } from '@/domain/model/ids'
import {
  buildConnectionGraph,
  canPlaceBrick,
  translateBrick,
  mirrorBricks,
  canPlaceGroup,
  selectCollapsingBricks,
  bricksToBodySnapshots,
  createCollapseTransaction,
  type CollapseTransaction,
} from '@/domain/physics'
import { CATALOG_BY_ID as PART_CATALOG } from '@/domain/parts/catalog'
import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'

export interface BuildActions {
  /**
   * Adds a brick to the model, assigning it a fresh id which is returned to the
   * caller. The brick is supplied without an id; the store owns id generation.
   */
  placeBrick: (brick: Omit<PlacedBrick, 'id'>) => string | null
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
  previewMoveSelection: (delta: {
    dx: number
    dy: number
    dz: number
  }) => boolean
  /** Returns true if duplicating the current selection at delta would be valid. */
  previewDuplicateSelection: (delta: {
    dx: number
    dy: number
    dz: number
  }) => boolean
  /**
   * Mirrors the current selection across the selection's bounding-box midline.
   * Returns true if the mirror is valid and was committed.
   */
  mirrorSelection: (axis: 'x' | 'z') => boolean
  /** Returns true if mirroring the current selection would be valid without mutating state. */
  previewMirrorSelection: (axis: 'x' | 'z') => boolean
  /**
   * Selects a brick. By default this replaces the current selection; pass
   * `additive` to extend it (e.g. shift-click multi-select).
   */
  selectBrick: (id: string, additive?: boolean) => void
  clearSelection: () => void
  /** Updates the active baseplate side length in studs. */
  setBaseplateSize: (size: number) => void
  /**
   * Removes every brick that should fall after a smart-shear edit (floating
   * bricks plus sheared unstable sub-regions) in a single zundo history entry,
   * so one undo restores the entire pre-collapse build and one redo re-applies
   * the stored diff. No-op (adds no history entry) when nothing collapses.
   */
  triggerCollapse: () => void
  /**
   * Clears the active Rapier collapse simulation once its dynamic bodies have
   * tumbled and faded out. Does not touch the build model; the sheared bricks
   * were already removed from `bricks` by {@link triggerCollapse}.
   */
  completeCollapse: () => void
  /** Undo the last state-changing action. */
  undo: () => void
  /** Redo the last undone action. */
  redo: () => void
}

/**
 * Transient simulation slice for the collapse animation. Holds the Rapier
 * dynamic-body transaction for the most recent {@link BuildActions.triggerCollapse}.
 * Deliberately kept out of the zundo history (see `partialize`) so it never adds
 * an undo step and never restores a stale animation on undo/redo.
 */
export interface CollapseSlice {
  activeCollapse: CollapseTransaction | null
}

export type BuildStore = BuildState & BuildActions & CollapseSlice

export interface BuildStoreWithTemporal extends BuildStore {
  temporal: StoreApi<TemporalState<Partial<BuildState>>>
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
        lastCollapse: null,
        baseplateSize: BASEPLATE_SIZE_STUDS,
        activeCollapse: null,

        placeBrick: (brick) => {
          const id = createBrickId()
          const candidate = { id, ...brick }

          if (
            !canPlaceBrick(candidate, Object.values(get().bricks), PART_CATALOG)
          ) {
            return null
          }

          set((state) => ({
            bricks: { ...state.bricks, [id]: candidate },
            lastCollapse: null,
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
            return { bricks, selection, lastCollapse: null }
          }),

        moveSelection: (delta) => {
          const state = get()
          if (state.selection.size === 0) return false

          const selectedBricks = Array.from(state.selection)
            .map((id) => state.bricks[id])
            .filter((brick): brick is PlacedBrick => !!brick)

          const otherBricks = Object.values(state.bricks).filter(
            (brick) => !state.selection.has(brick.id),
          )

          const moved = selectedBricks.map((brick) =>
            translateBrick(brick, delta),
          )

          if (
            !canPlaceGroup(
              moved,
              otherBricks,
              PART_CATALOG,
              get().baseplateSize,
            )
          ) {
            return false
          }

          const nextBricks = { ...state.bricks }
          for (const brick of moved) {
            nextBricks[brick.id] = brick
          }

          set({ bricks: nextBricks, lastCollapse: null })
          return true
        },

        duplicateSelection: (delta) => {
          const state = get()
          if (state.selection.size === 0) return false

          const selectedBricks = Array.from(state.selection)
            .map((id) => state.bricks[id])
            .filter((brick): brick is PlacedBrick => !!brick)

          const clones = selectedBricks.map((brick) => {
            const id = createBrickId()
            return translateBrick({ ...brick, id }, delta)
          })

          const allExisting = Object.values(state.bricks)

          if (
            !canPlaceGroup(
              clones,
              allExisting,
              PART_CATALOG,
              get().baseplateSize,
            )
          ) {
            return false
          }

          const nextBricks = { ...state.bricks }
          const nextSelection = new Set<string>()
          for (const brick of clones) {
            nextBricks[brick.id] = brick
            nextSelection.add(brick.id)
          }

          set({
            bricks: nextBricks,
            selection: nextSelection,
            lastCollapse: null,
          })
          return true
        },

        previewMoveSelection: (delta) => {
          const state = get()
          if (state.selection.size === 0) return false
          const selectedBricks = Array.from(state.selection)
            .map((id) => state.bricks[id])
            .filter((brick): brick is PlacedBrick => !!brick)
          const otherBricks = Object.values(state.bricks).filter(
            (brick) => !state.selection.has(brick.id),
          )
          const moved = selectedBricks.map((brick) =>
            translateBrick(brick, delta),
          )
          return canPlaceGroup(
            moved,
            otherBricks,
            PART_CATALOG,
            get().baseplateSize,
          )
        },

        previewDuplicateSelection: (delta) => {
          const state = get()
          if (state.selection.size === 0) return false
          const selectedBricks = Array.from(state.selection)
            .map((id) => state.bricks[id])
            .filter((brick): brick is PlacedBrick => !!brick)
          const clones = selectedBricks.map((brick, index) =>
            translateBrick({ ...brick, id: `preview-${index}` }, delta),
          )
          const allExisting = Object.values(state.bricks)
          return canPlaceGroup(
            clones,
            allExisting,
            PART_CATALOG,
            get().baseplateSize,
          )
        },

        mirrorSelection: (axis) => {
          const state = get()
          if (state.selection.size === 0) return false

          const selectedBricks = Array.from(state.selection)
            .map((id) => state.bricks[id])
            .filter((b): b is PlacedBrick => !!b)

          const otherBricks = Object.values(state.bricks).filter(
            (b) => !state.selection.has(b.id),
          )

          const mirrored = mirrorBricks(selectedBricks, axis, PART_CATALOG)

          if (!canPlaceGroup(mirrored, otherBricks, PART_CATALOG)) {
            return false
          }

          const nextBricks = { ...state.bricks }
          for (const b of mirrored) {
            nextBricks[b.id] = b
          }

          set({ bricks: nextBricks, lastCollapse: null })
          return true
        },

        previewMirrorSelection: (axis) => {
          const state = get()
          if (state.selection.size === 0) return false
          const selectedBricks = Array.from(state.selection)
            .map((id) => state.bricks[id])
            .filter((b): b is PlacedBrick => !!b)
          const otherBricks = Object.values(state.bricks).filter(
            (b) => !state.selection.has(b.id),
          )
          const mirrored = mirrorBricks(selectedBricks, axis, PART_CATALOG)
          return canPlaceGroup(mirrored, otherBricks, PART_CATALOG)
        },

        selectBrick: (id, additive = false) =>
          set((state) => {
            if (!(id in state.bricks)) return state
            const selection = additive
              ? new Set(state.selection)
              : new Set<string>()
            selection.add(id)
            return { selection, lastCollapse: null }
          }),

        clearSelection: () =>
          set({ selection: new Set<string>(), lastCollapse: null }),

        setBaseplateSize: (size) => set({ baseplateSize: size }),

        triggerCollapse: () =>
          set((state) => {
            const allBricks = Object.values(state.bricks)
            const collapsing = selectCollapsingBricks(allBricks)
            if (collapsing.size === 0) return state

            const bricks: Record<string, PlacedBrick> = {}
            for (const brick of allBricks) {
              if (!collapsing.has(brick.id)) bricks[brick.id] = brick
            }

            const selection = new Set(state.selection)
            for (const id of collapsing) selection.delete(id)

            const activeCollapse = createCollapseTransaction({
              allBricks,
              collapsingBodies: bricksToBodySnapshots(
                allBricks.filter((brick) => collapsing.has(brick.id)),
              ),
            })

            return {
              bricks,
              selection,
              lastCollapse: { count: collapsing.size, label: 'Undo collapse' },
              activeCollapse,
            }
          }),

        completeCollapse: () => set({ activeCollapse: null }),

        undo: () => {
          ;(useBuildStore as unknown as BuildStoreWithTemporal).temporal
            .getState()
            .undo()
          useBuildStore.setState({ activeCollapse: null })
        },

        redo: () => {
          ;(useBuildStore as unknown as BuildStoreWithTemporal).temporal
            .getState()
            .redo()
          useBuildStore.setState({ activeCollapse: null })
        },
      }),
      {
        limit: 50,
        partialize: (state) => {
          const { bricks, selection, lastCollapse, baseplateSize } = state
          return { bricks, selection, lastCollapse, baseplateSize }
        },
        equality: (pastState, currentState) =>
          pastState.bricks === currentState.bricks &&
          pastState.selection === currentState.selection,
      },
    ),
  ),
)

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
