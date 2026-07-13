import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

const Host = ({
  handlers,
  enabled = true,
}: {
  handlers: Parameters<typeof useKeyboardShortcuts>[0]
  enabled?: boolean
}) => {
  useKeyboardShortcuts(handlers, { enabled })
  return (
    <div>
      <input aria-label="Name" />
      <textarea aria-label="Notes" />
      <div contentEditable aria-label="Editor" />
    </div>
  )
}

describe('useKeyboardShortcuts', () => {
  it('maps documented keys to handlers', () => {
    const handlers = {
      undo: vi.fn(),
      redo: vi.fn(),
      rotate: vi.fn(),
      resetView: vi.fn(),
    }

    render(<Host handlers={handlers} />)

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true })
    fireEvent.keyDown(window, { key: 'r' })
    fireEvent.keyDown(window, { key: 'R' })
    fireEvent.keyDown(window, { key: 'Home' })

    expect(handlers.undo).toHaveBeenCalledTimes(1)
    expect(handlers.redo).toHaveBeenCalledTimes(2)
    expect(handlers.rotate).toHaveBeenCalledTimes(2)
    expect(handlers.resetView).toHaveBeenCalledTimes(1)
  })

  it('ignores editable targets and disabled shortcut handling', () => {
    const handlers = {
      undo: vi.fn(),
      rotate: vi.fn(),
    }

    const { getByLabelText, getByRole, rerender } = render(<Host handlers={handlers} />)

    fireEvent.keyDown(getByRole('textbox', { name: 'Name' }), {
      key: 'z',
      ctrlKey: true,
    })
    fireEvent.keyDown(getByRole('textbox', { name: 'Notes' }), { key: 'r' })

    const editorEl = getByLabelText('Editor');
    // JSDOM doesn't fully support isContentEditable, so we have to mock it for the test
    Object.defineProperty(editorEl, 'isContentEditable', { value: true, configurable: true });

    fireEvent.keyDown(editorEl, {
      key: 'z',
      ctrlKey: true,
    })

    expect(handlers.undo).not.toHaveBeenCalled()
    expect(handlers.rotate).not.toHaveBeenCalled()

    rerender(<Host handlers={handlers} enabled={false} />)
    fireEvent.keyDown(window, { key: 'r' })
    expect(handlers.rotate).not.toHaveBeenCalled()
  })

  it('maps p/b/i to tool-switch handlers', () => {
    const handlers = {
      setPlaceTool: vi.fn(),
      setPaintTool: vi.fn(),
      setEyedropperTool: vi.fn(),
    }

    render(<Host handlers={handlers} />)

    fireEvent.keyDown(window, { key: 'p' })
    fireEvent.keyDown(window, { key: 'b' })
    fireEvent.keyDown(window, { key: 'i' })
    fireEvent.keyDown(window, { key: 'x' })

    expect(handlers.setPlaceTool).toHaveBeenCalledTimes(1)
    expect(handlers.setPaintTool).toHaveBeenCalledTimes(1)
    expect(handlers.setEyedropperTool).toHaveBeenCalledTimes(1)
    // No other handlers exist to test 'x' against here directly, but the main file should branch false gracefully
  })

  it('unmapped keys are ignored', () => {
    const handlers = {
      undo: vi.fn(),
      rotate: vi.fn(),
      setPlaceTool: vi.fn(),
    }

    render(<Host handlers={handlers} />)

    fireEvent.keyDown(window, { key: 'x' })

    expect(handlers.undo).not.toHaveBeenCalled()
    expect(handlers.rotate).not.toHaveBeenCalled()
    expect(handlers.setPlaceTool).not.toHaveBeenCalled()
  })

  it('p/b/i are ignored when the event target is an editable element', () => {
    const handlers = {
      setPlaceTool: vi.fn(),
      setPaintTool: vi.fn(),
      setEyedropperTool: vi.fn(),
    }

    const { getByRole } = render(<Host handlers={handlers} />)

    fireEvent.keyDown(getByRole('textbox', { name: 'Name' }), { key: 'p' })
    fireEvent.keyDown(getByRole('textbox', { name: 'Notes' }), { key: 'b' })
    fireEvent.keyDown(getByRole('textbox', { name: 'Name' }), { key: 'i' })

    expect(handlers.setPlaceTool).not.toHaveBeenCalled()
    expect(handlers.setPaintTool).not.toHaveBeenCalled()
    expect(handlers.setEyedropperTool).not.toHaveBeenCalled()
  })

  it('p/b/i are ignored when enabled is false', () => {
    const handlers = {
      setPlaceTool: vi.fn(),
      setPaintTool: vi.fn(),
      setEyedropperTool: vi.fn(),
    }

    render(<Host handlers={handlers} enabled={false} />)

    fireEvent.keyDown(window, { key: 'p' })
    fireEvent.keyDown(window, { key: 'b' })
    fireEvent.keyDown(window, { key: 'i' })

    expect(handlers.setPlaceTool).not.toHaveBeenCalled()
    expect(handlers.setPaintTool).not.toHaveBeenCalled()
    expect(handlers.setEyedropperTool).not.toHaveBeenCalled()
  })

  it('p/b/i are ignored when a modifier key is held', () => {
    const handlers = {
      setPlaceTool: vi.fn(),
      setPaintTool: vi.fn(),
      setEyedropperTool: vi.fn(),
    }

    render(<Host handlers={handlers} />)

    fireEvent.keyDown(window, { key: 'p', shiftKey: true })
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'i', altKey: true })

    expect(handlers.setPlaceTool).not.toHaveBeenCalled()
    expect(handlers.setPaintTool).not.toHaveBeenCalled()
    expect(handlers.setEyedropperTool).not.toHaveBeenCalled()
  })
})
