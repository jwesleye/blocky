import { create } from 'zustand'

import { DEFAULT_COLOR_ID } from '@/domain/model/colors'
import type {
  BrickHinge,
  BrickMount,
  HalfStudOffset,
} from '@/domain/model/types'
import { DEFAULT_PART_ID } from '@/domain/parts/catalog'

export type EditingTool = 'place' | 'select' | 'paint' | 'eyedropper'

const MOUNT_CYCLE: (BrickMount | undefined)[] = [
  undefined,
  'px',
  'nx',
  'pz',
  'nz',
]

interface CursorState {
  colorId: string
  partId: string
  rot: 0 | 1 | 2 | 3
  offset?: HalfStudOffset
  mount?: BrickMount
  hinge?: BrickHinge
  editingTool: EditingTool
  /** ID of the brick the pointer is currently hovering over, for touch delete. */
  hoveredBrickId: string | null
  setColor: (id: string) => void
  setPart: (id: string) => void
  rotate: () => void
  rotateCursor: () => void
  toggleOffset: () => void
  cycleMount: () => void
  /** Toggles the given hinge axis on/off. Activating one axis clears the other. */
  toggleHinge: (axis: BrickHinge) => void
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
  hinge: undefined,
  editingTool: 'place',
  hoveredBrickId: null,
  setColor: (id) => set({ colorId: id }),
  setPart: (id) => set({ partId: id }),
  rotate: () =>
    set((state) => {
      const rot = ((state.rot + 1) % 4) as 0 | 1 | 2 | 3
      return { rot }
    }),
  rotateCursor: () => get().rotate(),
  toggleOffset: () =>
    set((state) => {
      const newOffset = state.offset
        ? undefined
        : ({ x: 1, z: 0 } as HalfStudOffset)
      return { offset: newOffset }
    }),
  cycleMount: () =>
    set((state) => {
      const idx = MOUNT_CYCLE.indexOf(state.mount)
      const newMount = MOUNT_CYCLE[(idx + 1) % MOUNT_CYCLE.length]
      return { mount: newMount }
    }),
  toggleHinge: (axis) =>
    set((state) => ({ hinge: state.hinge === axis ? undefined : axis })),
  setEditingTool: (tool) => set({ editingTool: tool }),
  setHoveredBrickId: (id) => set({ hoveredBrickId: id }),
  sampleBrick: (brick) =>
    set({
      partId: brick.partId,
      colorId: brick.color,
    }),
}))
