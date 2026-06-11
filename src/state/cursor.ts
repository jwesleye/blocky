import { create } from 'zustand'

import { DEFAULT_COLOR_ID } from '@/domain/model/colors'
import { DEFAULT_PART_ID } from '@/domain/parts/catalog'
import type { BrickMount, HalfStudOffset } from '@/domain/model/types'

export type EditingTool = 'place' | 'paint' | 'eyedropper'

const MOUNT_CYCLE: (BrickMount | undefined)[] = [
  undefined,
  'px',
  'nx',
  'pz',
  'nz',
]

export interface CursorBrick {
  partId: string
  colorId: string
  rot: 0 | 1 | 2 | 3
  offset?: HalfStudOffset
  mount?: BrickMount
}

interface CursorState {
  colorId: string
  partId: string
  rot: 0 | 1 | 2 | 3
  offset?: HalfStudOffset
  mount?: BrickMount
  /**
   * Complete model for the ghost/preview brick being placed.
   * Derived from the selected scalars but provided as a single object
   * for the placement and physics layers to consume.
   */
  cursorBrick: CursorBrick
  editingTool: EditingTool
  /** ID of the brick the pointer is currently hovering over, for touch delete. */
  hoveredBrickId: string | null
  setColor: (id: string) => void
  setPart: (id: string) => void
  rotate: () => void
  rotateCursor: () => void
  toggleOffset: () => void
  cycleMount: () => void
  setEditingTool: (tool: EditingTool) => void
  setHoveredBrickId: (id: string | null) => void
  /** Copies a placed brick's partId and color into the cursor without mutating the build. */
  sampleBrick: (brick: { partId: string; color: string }) => void
}

export const useCursorStore = create<CursorState>()((set, get) => ({
  colorId: DEFAULT_COLOR_ID,
  partId: DEFAULT_PART_ID,
  rot: 0,
  offset: undefined,
  mount: undefined,
  cursorBrick: {
    partId: DEFAULT_PART_ID,
    colorId: DEFAULT_COLOR_ID,
    rot: 0,
    offset: undefined,
    mount: undefined,
  },
  editingTool: 'place',
  hoveredBrickId: null,
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
        cursorBrick: { ...state.cursorBrick, rot },
      }
    }),
  rotateCursor: () => get().rotate(),
  toggleOffset: () =>
    set((state) => {
      const newOffset = state.offset
        ? undefined
        : ({ x: 1, z: 0 } as HalfStudOffset)
      return {
        offset: newOffset,
        cursorBrick: { ...state.cursorBrick, offset: newOffset },
      }
    }),
  cycleMount: () =>
    set((state) => {
      const idx = MOUNT_CYCLE.indexOf(state.mount)
      const newMount = MOUNT_CYCLE[(idx + 1) % MOUNT_CYCLE.length]
      return {
        mount: newMount,
        cursorBrick: { ...state.cursorBrick, mount: newMount },
      }
    }),
  setEditingTool: (tool) => set({ editingTool: tool }),
  setHoveredBrickId: (id) => set({ hoveredBrickId: id }),
  sampleBrick: (brick) =>
    set((state) => ({
      partId: brick.partId,
      colorId: brick.color,
      cursorBrick: {
        ...state.cursorBrick,
        partId: brick.partId,
        colorId: brick.color,
      },
    })),
}))
