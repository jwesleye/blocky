import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from '@/components/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders an accessible modal dialog with title and message', () => {
    render(
      <ConfirmDialog
        open
        title="Clear build"
        message="Remove every brick?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'Clear build' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Remove every brick?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('invokes confirm and cancel actions', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        open
        title="New build"
        message="Start over?"
        confirmLabel="Start new"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start new' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape and traps focus', () => {
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        open
        title="Clear build"
        message="Remove every brick?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )

    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const confirm = screen.getByRole('button', { name: 'Confirm' })

    confirm.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(cancel).toHaveFocus()

    cancel.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(confirm).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Clear build"
        message="Remove every brick?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
