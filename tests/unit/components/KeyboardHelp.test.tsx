import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { KeyboardHelp } from '@/components/KeyboardHelp'

describe('KeyboardHelp', () => {
  it('opens a dialog listing documented shortcuts and closes on Escape', () => {
    render(<KeyboardHelp />)

    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }))

    expect(
      screen.getByRole('dialog', { name: 'Keyboard shortcuts' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Undo')).toBeInTheDocument()
    expect(screen.getByText('Ctrl+Z')).toBeInTheDocument()
    expect(screen.getByText('Redo')).toBeInTheDocument()
    expect(screen.getByText('Ctrl+Y')).toBeInTheDocument()
    expect(screen.getByText('Ctrl+Shift+Z')).toBeInTheDocument()
    expect(screen.getByText('Rotate')).toBeInTheDocument()
    expect(screen.getByText('R')).toBeInTheDocument()
    expect(screen.getByText('Reset View')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Place')).toBeInTheDocument()
    expect(screen.getByText('P')).toBeInTheDocument()
    expect(screen.getByText('Paint')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('Eyedropper')).toBeInTheDocument()
    expect(screen.getByText('I')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('includes a Theme entry documenting the toolbar selector', () => {
    render(<KeyboardHelp />)

    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }))

    expect(screen.getByText('Theme')).toBeInTheDocument()
    expect(screen.getByText(/Auto.*Light.*Dark|toolbar/i)).toBeInTheDocument()
  })
})
