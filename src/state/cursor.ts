import { create } from 'zustand'

import { DEFAULT_COLOR_ID } from '@/domain/model/colors'
import { DEFAULT_PART_ID } from '@/domain/parts/catalog'

interface CursorState {
  colorId: string
  partId: string
  setColor: (id: string) => void
  setPart: (id: string) => void
}

export const useCursorStore = create<CursorState>()((set) => ({
  colorId: DEFAULT_COLOR_ID,
  partId: DEFAULT_PART_ID,
  setColor: (id) => set({ colorId: id }),
  setPart: (id) => set({ partId: id }),
}))
