<<<<<<< HEAD
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ViewControls, RESET_VIEW_KEY } from '@/components/ViewControls'
=======
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ViewControls, RESET_VIEW_KEY } from '@/components/ViewControls';
>>>>>>> 231a395 (feat: place, delete, and rotate interactions (#10))

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

  it('calls resetCamera when the keyboard shortcut is pressed', () => {
    render(<ViewControls />)
    fireEvent.keyDown(window, { key: RESET_VIEW_KEY })
    expect(mockResetCamera).toHaveBeenCalledTimes(1)
  })

  it('does not call resetCamera if modifiers are pressed', () => {
    render(<ViewControls />)
    fireEvent.keyDown(window, { key: RESET_VIEW_KEY, shiftKey: true })
    expect(mockResetCamera).not.toHaveBeenCalled()
  })
})
