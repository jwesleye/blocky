import { create } from 'zustand'

import type { BuildState, PlacedBrick } from '@/domain/model/types'
import { createBrickId } from '@/state/schema'

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
}

export type BuildStore = BuildState & BuildActions

export const useBuildStore = create<BuildStore>((set) => ({
  bricks: {},
  selection: new Set<string>(),

  placeBrick: (brick) => {
    const id = createBrickId()
    set((state) => ({ bricks: { ...state.bricks, [id]: { id, ...brick } } }))
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
      const selection = additive ? new Set(state.selection) : new Set<string>()
      selection.add(id)
      return { selection }
    }),

  clearSelection: () => set({ selection: new Set<string>() }),
}))
