import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ViewControls } from '@/components/ViewControls'

const mockResetCamera = vi.fn()

vi.mock('@/state/cameraStore', () => ({
  useCameraStore: Object.assign(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (selector: (state: any) => any) =>
      selector({ resetCamera: mockResetCamera }),
    {
      getState: vi.fn(() => ({
        resetCamera: mockResetCamera,
      })),
    },
  ),
}))

describe('ViewControls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls resetCamera when the button is clicked', () => {
    const { getByText } = render(<ViewControls />)
    const button = getByText(/reset view/i)
    fireEvent.click(button)
    expect(mockResetCamera).toHaveBeenCalledTimes(1)
  })

  it('does not reserve keyboard shortcuts directly', () => {
    render(<ViewControls />)
    fireEvent.keyDown(window, { key: 'Home' })
    fireEvent.keyDown(window, { key: 'r' })
    expect(mockResetCamera).not.toHaveBeenCalled()
  })
})
