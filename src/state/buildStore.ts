import { createStore } from 'zustand/vanilla'
import type { PlacedBrick } from '@/domain/model/types'
import { PART_CATALOG, type PartCatalog } from '@/domain/parts/catalog'
import { canPlaceBrick } from '@/domain/physics'

export interface BuildState {
  bricks: PlacedBrick[]
  placeBrick: (candidate: PlacedBrick) => boolean
}

export function createBuildStore(
  initialBricks: readonly PlacedBrick[] = [],
  catalog: PartCatalog = PART_CATALOG,
) {
  return createStore<BuildState>()((set, get) => ({
    bricks: [...initialBricks],
    placeBrick(candidate) {
      if (!canPlaceBrick(candidate, get().bricks, catalog)) {
        return false
      }

      set((state) => ({
        bricks: [...state.bricks, candidate],
      }))
      return true
    },
  }))
}
