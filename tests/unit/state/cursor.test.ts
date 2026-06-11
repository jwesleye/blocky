import { beforeEach, describe, expect, it } from 'vitest'
import { useCursorStore } from '@/state/cursor'
import { DEFAULT_COLOR_ID } from '@/domain/model/colors'
import { DEFAULT_PART_ID } from '@/domain/parts/catalog'

const resetCursor = () => {
  useCursorStore.setState({
    colorId: DEFAULT_COLOR_ID,
    partId: DEFAULT_PART_ID,
    rot: 0,
    offset: undefined,
    mount: undefined,
    editingTool: 'place',
  })
}

describe('useCursorStore', () => {
  beforeEach(resetCursor)

  it('initializes with default values', () => {
    const state = useCursorStore.getState()
    expect(state.colorId).toBe(DEFAULT_COLOR_ID)
    expect(state.partId).toBe(DEFAULT_PART_ID)
    expect(state.offset).toBeUndefined()
    expect(state.mount).toBeUndefined()
  })

  it('initializes rotation to 0', () => {
    const state = useCursorStore.getState()
    expect(state.rot).toBe(0)
  })

  it('rotateCursor() advances 0 -> 1 -> 2 -> 3 -> 0', () => {
    const { rotateCursor } = useCursorStore.getState()
    rotateCursor()
    expect(useCursorStore.getState().rot).toBe(1)
    rotateCursor()
    expect(useCursorStore.getState().rot).toBe(2)
    rotateCursor()
    expect(useCursorStore.getState().rot).toBe(3)
    rotateCursor()
    expect(useCursorStore.getState().rot).toBe(0)
  })

  it('updates colorId when color is changed', () => {
    const { setColor } = useCursorStore.getState()
    setColor('blue')
    const state = useCursorStore.getState()
    expect(state.colorId).toBe('blue')
  })

  it('updates partId when part is changed', () => {
    const { setPart } = useCursorStore.getState()
    setPart('plate-1x1')
    const state = useCursorStore.getState()
    expect(state.partId).toBe('plate-1x1')
  })

  it('exposes an offset that toggleOffset flips on/off', () => {
    expect(useCursorStore.getState().offset).toBeUndefined()

    useCursorStore.getState().toggleOffset()
    expect(useCursorStore.getState().offset).toEqual({ x: 1, z: 0 })

    useCursorStore.getState().toggleOffset()
    expect(useCursorStore.getState().offset).toBeUndefined()
  })

  describe('editingTool', () => {
    it('defaults to place', () => {
      expect(useCursorStore.getState().editingTool).toBe('place')
    })

    it('setEditingTool switches to paint', () => {
      useCursorStore.getState().setEditingTool('paint')
      expect(useCursorStore.getState().editingTool).toBe('paint')
    })

    it('setEditingTool switches to eyedropper', () => {
      useCursorStore.getState().setEditingTool('eyedropper')
      expect(useCursorStore.getState().editingTool).toBe('eyedropper')
    })

    it('setEditingTool switches back to place', () => {
      useCursorStore.getState().setEditingTool('paint')
      useCursorStore.getState().setEditingTool('place')
      expect(useCursorStore.getState().editingTool).toBe('place')
    })
  })

  describe('cycleMount', () => {
    it('advances undefined -> px -> nx -> pz -> nz -> undefined', () => {
      const sequence = [undefined, 'px', 'nx', 'pz', 'nz', undefined] as const
      for (let i = 0; i < sequence.length - 1; i++) {
        useCursorStore.getState().cycleMount()
        const state = useCursorStore.getState()
        expect(state.mount).toBe(sequence[i + 1])
      }
    })
  })

  describe('sampleBrick', () => {
    it('copies partId and color into cursor state without changing rot', () => {
      useCursorStore.getState().sampleBrick({
        partId: 'plate-1x1',
        color: 'green',
      })
      const state = useCursorStore.getState()
      expect(state.partId).toBe('plate-1x1')
      expect(state.colorId).toBe('green')
      expect(state.rot).toBe(0)
    })

    it('does not change editingTool when sampling', () => {
      useCursorStore.getState().setEditingTool('eyedropper')
      useCursorStore.getState().sampleBrick({
        partId: 'plate-1x1',
        color: 'green',
      })
      expect(useCursorStore.getState().editingTool).toBe('eyedropper')
    })

    it('setColor and setPart remain independent after sampleBrick', () => {
      useCursorStore.getState().sampleBrick({
        partId: 'plate-1x1',
        color: 'green',
      })
      useCursorStore.getState().setColor('red')
      const state = useCursorStore.getState()
      expect(state.colorId).toBe('red')
      expect(state.partId).toBe('plate-1x1')
    })
  })
})
