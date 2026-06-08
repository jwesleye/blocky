import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PartPicker } from '@/components/PartPicker'

describe('PartPicker', () => {
  it('renders the default selected part as checked', () => {
    render(<PartPicker selected="brick-2x4" onSelect={() => undefined} />)
    expect(screen.getByRole('radio', { name: 'Brick 2×4' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('renders a button for every part in the catalog', () => {
    render(<PartPicker selected="brick-2x4" onSelect={() => undefined} />)
    expect(screen.getByRole('radio', { name: 'Tile 1×1' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Slope 2×1' })).toBeInTheDocument()
    expect(
      screen.getByRole('radio', { name: 'Round Brick 1×1' }),
    ).toBeInTheDocument()
  })

  it('calls onSelect with the part id when a part button is clicked', () => {
    const onSelect = vi.fn()
    render(<PartPicker selected="brick-2x4" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Plate 1×1' }))
    expect(onSelect).toHaveBeenCalledWith('plate-1x1')
  })

  it('marks non-selected parts as unchecked', () => {
    render(<PartPicker selected="brick-2x4" onSelect={() => undefined} />)
    expect(screen.getByRole('radio', { name: 'Brick 1×1' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('groups parts by type with accessible radiogroup labels', () => {
    render(<PartPicker selected="brick-2x4" onSelect={() => undefined} />)
    expect(
      screen.getByRole('radiogroup', { name: 'Bricks' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('radiogroup', { name: 'Plates' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('radiogroup', { name: 'Tiles' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('radiogroup', { name: 'Slopes' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('radiogroup', { name: 'Rounds & Specials' }),
    ).toBeInTheDocument()
  })
})
