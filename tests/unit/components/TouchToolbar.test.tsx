import { fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TouchToolbar } from '@/components/TouchToolbar'
import { useCursorStore } from '@/state/cursor'
import { useBuildStore, type BuildStoreWithTemporal } from '@/state/store'

describe('TouchToolbar', () => {
  const originalCursorStore = useCursorStore.getState()
  const originalBuildStore = useBuildStore.getState()

  beforeEach(() => {
    // Reset temporal state for build store
    const temporal = (
      useBuildStore as unknown as BuildStoreWithTemporal
    ).temporal.getState()
    temporal.pause()
    act(() => {
      useBuildStore.setState(originalBuildStore, true)
      useCursorStore.setState(originalCursorStore, true)
      useBuildStore.setState({ bricks: {} })
      useCursorStore.setState({ hoveredBrickId: null })
    })
    temporal.clear()
    temporal.resume()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    act(() => {
      useBuildStore.setState(originalBuildStore, true)
      useCursorStore.setState(originalCursorStore, true)
    })
  })

  it('renders correctly', () => {
    render(<TouchToolbar />)
    expect(screen.getByTestId('touch-toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('touch-rotate')).toBeInTheDocument()
    expect(screen.getByTestId('touch-delete')).toBeInTheDocument()
  })

  it('calls rotateCursor on rotate button click', () => {
    let rotateCalled = false
    act(() => {
      useCursorStore.setState({
        rotateCursor: () => { rotateCalled = true }
      })
    })

    render(<TouchToolbar />)
    fireEvent.click(screen.getByTestId('touch-rotate'))

    expect(rotateCalled).toBe(true)
  })

  it('disables delete button when no brick is hovered', () => {
    render(<TouchToolbar />)
    expect(screen.getByTestId('touch-delete')).toBeDisabled()
  })

  it('enables delete button when a brick is hovered', () => {
    act(() => {
      useCursorStore.setState({ hoveredBrickId: 'brick-1' })
    })
    render(<TouchToolbar />)
    expect(screen.getByTestId('touch-delete')).not.toBeDisabled()
  })

  it('calls deleteBrick on delete button click when enabled', () => {
    let deletedId: string | null = null
    act(() => {
      useBuildStore.setState({
        deleteBrick: (id) => { deletedId = id }
      })
      useCursorStore.setState({ hoveredBrickId: 'brick-1' })
    })

    render(<TouchToolbar />)
    fireEvent.click(screen.getByTestId('touch-delete'))

    expect(deletedId).toBe('brick-1')
  })

  it('does not call deleteBrick on delete button click when not enabled (hoveredBrickId is null)', () => {
    let deleteCalled = false
    act(() => {
      useBuildStore.setState({
        deleteBrick: () => { deleteCalled = true }
      })
      useCursorStore.setState({ hoveredBrickId: null })
    })

    render(<TouchToolbar />)
    fireEvent.click(screen.getByTestId('touch-delete'))

    expect(deleteCalled).toBe(false)
  })
})
