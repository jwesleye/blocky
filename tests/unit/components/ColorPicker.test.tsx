import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ColorPicker } from '@/components/ColorPicker'
import { BRICK_COLORS } from '@/domain/model/colors'

describe('ColorPicker', () => {
  it('renders a swatch for every palette color', () => {
    render(<ColorPicker selected="red" onSelect={() => undefined} />)
    for (const color of BRICK_COLORS) {
      expect(
        screen.getByRole('radio', { name: color.name }),
      ).toBeInTheDocument()
    }
  })

  it('exposes each color name as an accessible label (not color-only)', () => {
    render(<ColorPicker selected="red" onSelect={() => undefined} />)
    expect(
      screen.getByRole('radio', { name: 'Light Gray' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Dark Gray' })).toBeInTheDocument()
  })

  it('marks the selected color as checked', () => {
    render(<ColorPicker selected="blue" onSelect={() => undefined} />)
    expect(screen.getByRole('radio', { name: 'Blue' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('radio', { name: 'Red' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('calls onSelect with the color id when a swatch is clicked', () => {
    const onSelect = vi.fn()
    render(<ColorPicker selected="red" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Green' }))
    expect(onSelect).toHaveBeenCalledWith('green')
  })

  it('groups swatches under a radiogroup with an accessible label', () => {
    render(<ColorPicker selected="red" onSelect={() => undefined} />)
    expect(
      screen.getByRole('radiogroup', { name: 'Brick color' }),
    ).toBeInTheDocument()
  })

  it('supports keyboard navigation with arrow keys', () => {
    const onSelect = vi.fn()
    render(<ColorPicker selected="red" onSelect={onSelect} />)
    const redRadio = screen.getByRole('radio', { name: 'Red' })
    redRadio.focus()

    fireEvent.keyDown(redRadio, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenCalledWith('blue')
  })
})
