import { create } from 'zustand'
import { temporal } from 'zundo'

import type { BuildState, PlacedBrick } from '@/domain/model/types'
import { createBrickId } from '@/domain/model/ids'
import { playSoundEffect } from '@/lib/soundEffects'
import {
  buildConnectionGraph,
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
  /** Recolors an existing brick in place without changing any other field. No-op for unknown ids. */
  recolorBrick: (id: string, color: string) => void
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
   * Atomically removes all collapsing bricks, recording a single undo step.
   * Undoing restores the entire pre-collapse build.
   */
  commitCollapse: (collapsingIds: ReadonlySet<string>) => void
  /**
   * Selects a brick. By default this replaces the current selection; pass
   * `additive` to extend it (e.g. shift-click multi-select).
   */
  selectBrick: (id: string, additive?: boolean) => void
  clearSelection: () => void
  /** Removes every brick and clears transient build state. */
  clearBricks: () => void
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

export const useBuildStore = create<BuildStore>()(
  temporal(
    (set) => ({
      bricks: {},
      selection: new Set<string>(),

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

      commitCollapse: (collapsingIds) =>
        set((state) => {
          const bricks: Record<string, PlacedBrick> = {}
          for (const [id, brick] of Object.entries(state.bricks)) {
            if (!collapsingIds.has(id)) bricks[id] = brick
          }
          const selection = new Set(state.selection)
          for (const id of collapsingIds) selection.delete(id)
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
    }),
    // Only the build itself is tracked for undo/redo; the transient selection is
    // excluded so selecting bricks never creates an undo step.
    { partialize: (state) => ({ bricks: state.bricks }) },
  ),
)
