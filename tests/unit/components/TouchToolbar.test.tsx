import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TouchToolbar } from '@/components/TouchToolbar'
import { useCursorStore } from '@/state/cursor'
import { useBuildStore } from '@/state/store'

describe('TouchToolbar', () => {
  beforeEach(() => {
    act(() => {
      useCursorStore.setState({ hoveredBrickId: null })
      useBuildStore.setState({ bricks: {}, selection: new Set() })
    })
  })

  it('renders Rotate and Delete buttons', () => {
    render(<TouchToolbar />)
    expect(screen.getByTestId('touch-rotate')).toBeInTheDocument()
    expect(screen.getByTestId('touch-delete')).toBeInTheDocument()
  })

  it('calls rotateCursor when Rotate is clicked', () => {
    const rotateCursorSpy = vi.fn()
    act(() => {
      useCursorStore.setState({ rotateCursor: rotateCursorSpy })
    })

    render(<TouchToolbar />)
    fireEvent.click(screen.getByTestId('touch-rotate'))
    expect(rotateCursorSpy).toHaveBeenCalledTimes(1)
  })

  it('disables the Delete button when there is no hoveredBrickId', () => {
    render(<TouchToolbar />)
    expect(screen.getByTestId('touch-delete')).toBeDisabled()
  })

  it('enables the Delete button when a brick is hovered', () => {
    act(() => {
      useCursorStore.setState({ hoveredBrickId: 'brick-123' })
    })
    render(<TouchToolbar />)
    expect(screen.getByTestId('touch-delete')).not.toBeDisabled()
  })

  it('calls deleteBrick with hoveredBrickId when Delete is clicked', () => {
    const deleteBrickSpy = vi.fn()
    act(() => {
      useBuildStore.setState({ deleteBrick: deleteBrickSpy })
      useCursorStore.setState({ hoveredBrickId: 'brick-123' })
    })

    render(<TouchToolbar />)
    fireEvent.click(screen.getByTestId('touch-delete'))
    expect(deleteBrickSpy).toHaveBeenCalledWith('brick-123')
  })
})
