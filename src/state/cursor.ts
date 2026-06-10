import { create } from 'zustand'

import { DEFAULT_COLOR_ID } from '@/domain/model/colors'
import { DEFAULT_PART_ID } from '@/domain/parts/catalog'
import type { HalfStudOffset } from '@/domain/model/types'

export interface CursorBrick {
  partId: string
  colorId: string
  rot: 0 | 1 | 2 | 3
  offset?: HalfStudOffset
}

interface CursorState {
  colorId: string
  partId: string
  rot: 0 | 1 | 2 | 3
  rotation: 0 | 90 | 180 | 270
  offset?: HalfStudOffset
  /**
   * Complete model for the ghost/preview brick being placed.
   * Derived from the selected scalars but provided as a single object
   * for the placement and physics layers to consume.
   */
  cursorBrick: CursorBrick
  setColor: (id: string) => void
  setPart: (id: string) => void
  rotate: () => void
  rotateCursor: () => void
  toggleOffset: () => void
}

const nextRotation = (rot: 0 | 1 | 2 | 3) => (rot * 90) as 0 | 90 | 180 | 270

export const useCursorStore = create<CursorState>()((set, get) => ({
  colorId: DEFAULT_COLOR_ID,
  partId: DEFAULT_PART_ID,
  rot: 0,
  rotation: 0,
  offset: undefined,
  cursorBrick: {
    partId: DEFAULT_PART_ID,
    colorId: DEFAULT_COLOR_ID,
    rot: 0,
    offset: undefined,
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
      return {
        rot,
        rotation: nextRotation(rot),
        cursorBrick: { ...state.cursorBrick, rot },
      }
    }),
  rotateCursor: () => get().rotate(),
  toggleOffset: () =>
    set((state) => {
      const newOffset = state.offset ? undefined : { x: 1, z: 0 } as HalfStudOffset
      return {
        offset: newOffset,
        cursorBrick: { ...state.cursorBrick, offset: newOffset },
      }
    }),
}))
