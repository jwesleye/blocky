import { describe, expect, it, beforeEach } from 'vitest'
import { useCursorStore } from '@/state/cursor'
import { DEFAULT_COLOR_ID } from '@/domain/model/colors'
import { DEFAULT_PART_ID } from '@/domain/parts/catalog'

describe('useCursorStore', () => {
  beforeEach(() => {
    useCursorStore.setState({
      colorId: DEFAULT_COLOR_ID,
      partId: DEFAULT_PART_ID,
      rot: 0,
      cursorBrick: { partId: DEFAULT_PART_ID, colorId: DEFAULT_COLOR_ID, rot: 0 },
    })
  })

  it('initializes with default values', () => {
    const state = useCursorStore.getState()
    expect(state.colorId).toBe(DEFAULT_COLOR_ID)
    expect(state.partId).toBe(DEFAULT_PART_ID)
    expect(state.cursorBrick).toEqual({
      partId: DEFAULT_PART_ID,
      colorId: DEFAULT_COLOR_ID,
      rot: 0,
    })
  })

  it('initializes rotation to 0', () => {
    const state = useCursorStore.getState()
    expect(state.rot).toBe(0)
    expect(state.cursorBrick.rot).toBe(0)
  })

  it('rotate() advances 0 -> 1 -> 2 -> 3 -> 0', () => {
    const { rotate } = useCursorStore.getState()
    rotate()
    expect(useCursorStore.getState().rot).toBe(1)
    expect(useCursorStore.getState().cursorBrick.rot).toBe(1)
    rotate()
    expect(useCursorStore.getState().rot).toBe(2)
    expect(useCursorStore.getState().cursorBrick.rot).toBe(2)
    rotate()
    expect(useCursorStore.getState().rot).toBe(3)
    expect(useCursorStore.getState().cursorBrick.rot).toBe(3)
    rotate()
    expect(useCursorStore.getState().rot).toBe(0)
    expect(useCursorStore.getState().cursorBrick.rot).toBe(0)
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
    setPart('brick-1x1')
    const state = useCursorStore.getState()
    expect(state.partId).toBe('brick-1x1')
    expect(state.cursorBrick.partId).toBe('brick-1x1')
  })
})
