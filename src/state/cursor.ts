import { create } from 'zustand'

import { DEFAULT_COLOR_ID } from '@/domain/model/colors'
import { DEFAULT_PART_ID } from '@/domain/parts/catalog'

export interface CursorBrick {
  partId: string
  colorId: string
  rot: 0 | 1 | 2 | 3
}

interface CursorState {
  colorId: string
  partId: string
  rot: 0 | 1 | 2 | 3
  /**
   * Complete model for the ghost/preview brick being placed.
   * Derived from the selected scalars but provided as a single object
   * for the placement and physics layers to consume.
   */
  cursorBrick: CursorBrick
  setColor: (id: string) => void
  setPart: (id: string) => void
  rotate: () => void
}

export const useCursorStore = create<CursorState>()((set) => ({
  colorId: DEFAULT_COLOR_ID,
  partId: DEFAULT_PART_ID,
  rot: 0,
  cursorBrick: {
    partId: DEFAULT_PART_ID,
    colorId: DEFAULT_COLOR_ID,
    rot: 0,
  },
  setColor: (id) =>
    set((state) => ({
      colorId: id,
      cursorBrick: { ...state.cursorBrick, colorId: id },
    })),
  setPart: (id) =>
    set((state) => ({
      partId: id,
      cursorBrick: { ...state.cursorBrick, partId: id },
    })),
  rotate: () =>
    set((state) => {
      const rot = ((state.rot + 1) % 4) as 0 | 1 | 2 | 3
      return { rot, cursorBrick: { ...state.cursorBrick, rot } }
    }),
}))
