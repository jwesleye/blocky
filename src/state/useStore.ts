import { create } from 'zustand'
import { temporal } from 'zundo'
import type { PlacedBrick } from '@/domain/model/types'

interface LegacyBuildState {
  bricks: PlacedBrick[]
  setBricks: (bricks: PlacedBrick[]) => void
  addBrick: (brick: PlacedBrick) => void
  removeBrick: (id: string) => void
}

export const useStore = create<LegacyBuildState>()(
  temporal((set) => ({
    bricks: [],
    setBricks: (bricks) => set({ bricks }),
    addBrick: (brick) => set((state) => ({ bricks: [...state.bricks, brick] })),
    removeBrick: (id) =>
      set((state) => ({ bricks: state.bricks.filter((b) => b.id !== id) })),
  })),
)
