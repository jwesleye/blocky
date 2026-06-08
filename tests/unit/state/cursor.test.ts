import { describe, expect, it } from 'vitest'
import { useCursorStore } from '@/state/cursor'
import { DEFAULT_COLOR_ID } from '@/domain/model/colors'
import { DEFAULT_PART_ID } from '@/domain/parts/catalog'

describe('useCursorStore', () => {
  it('initializes with default values', () => {
    const state = useCursorStore.getState()
    expect(state.colorId).toBe(DEFAULT_COLOR_ID)
    expect(state.partId).toBe(DEFAULT_PART_ID)
    expect(state.cursorBrick).toEqual({
      partId: DEFAULT_PART_ID,
      colorId: DEFAULT_COLOR_ID,
    })
  })

  it('updates cursorBrick when color is changed', () => {
    const { setColor } = useCursorStore.getState()
    setColor('blue')
    const state = useCursorStore.getState()
    expect(state.colorId).toBe('blue')
    expect(state.cursorBrick.colorId).toBe('blue')
  })

  it('updates cursorBrick when part is changed', () => {
    const { setPart } = useCursorStore.getState()
    setPart('plate-1x1')
    const state = useCursorStore.getState()
    expect(state.partId).toBe('plate-1x1')
    expect(state.cursorBrick.partId).toBe('plate-1x1')
  })
})
