import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ColorPicker } from '@/components/ColorPicker'
import { COLOR_PALETTE } from '@/domain/parts/colors'

describe('ColorPicker', () => {
  it('renders a swatch for every palette color', () => {
    render(<ColorPicker selected="red" onSelect={() => undefined} />)
    for (const color of COLOR_PALETTE) {
      expect(
        screen.getByRole('radio', { name: color.label }),
      ).toBeInTheDocument()
    }
  })

  it('exposes each color label as an accessible name (not color-only)', () => {
    render(<ColorPicker selected="red" onSelect={() => undefined} />)
    expect(
      screen.getByRole('radio', { name: 'Light Gray' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Dark Gray' })).toBeInTheDocument()
  })

  it('marks the selected color as checked with the palette color styling', () => {
    render(<ColorPicker selected="blue" onSelect={() => undefined} />)
    const blueSwatch = screen.getByRole('radio', { name: 'Blue' })

    expect(blueSwatch).toHaveAttribute('aria-checked', 'true')
    expect(blueSwatch).toHaveClass('color-swatch--selected')
    expect(blueSwatch).toHaveStyle({
      backgroundColor: COLOR_PALETTE.find((color) => color.id === 'blue')!.hex,
    })
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
