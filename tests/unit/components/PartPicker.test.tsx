import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PartPicker } from '@/components/PartPicker'

describe('PartPicker', () => {
  it('renders the default selected part as checked', () => {
    render(<PartPicker selected="brick-2x4" onSelect={() => undefined} />)
    const selectedPart = screen.getByRole('radio', { name: 'Brick 2×4' })

    expect(selectedPart).toHaveAttribute('aria-checked', 'true')
    expect(selectedPart).toHaveClass('part-btn--selected')
  })

  it('renders a decorative svg icon inside the Brick 2×4 radio button', () => {
    render(<PartPicker selected="brick-2x4" onSelect={() => undefined} />)
    const btn = screen.getByRole('radio', { name: 'Brick 2×4' })
    const icon = btn.querySelector('svg[aria-hidden="true"]')
    expect(icon).not.toBeNull()
  })

  it('renders a button for every inventory part in the catalog', () => {
    render(<PartPicker selected="brick-2x4" onSelect={() => undefined} />)
    expect(screen.getByRole('radio', { name: 'Tile 1×1' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Slope 2×1' })).toBeInTheDocument()
    expect(
      screen.getByRole('radio', { name: 'Round Brick 1×1' }),
    ).toBeInTheDocument()
  })

  it('does not render the baseplate as an inventory option', () => {
    render(<PartPicker selected="brick-2x4" onSelect={() => undefined} />)
    expect(
      screen.queryByRole('radio', { name: 'Baseplate 32×32' }),
    ).not.toBeInTheDocument()
  })

  it('calls onSelect with the part id when a part button is clicked', () => {
    const onSelect = vi.fn()
    render(<PartPicker selected="brick-2x4" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Plate 1×1' }))
    expect(onSelect).toHaveBeenCalledWith('plate-1x1')
  })

  it('marks non-selected parts as unchecked', () => {
    render(<PartPicker selected="brick-2x4" onSelect={() => undefined} />)
    const unselectedPart = screen.getByRole('radio', { name: 'Brick 1×1' })

    expect(unselectedPart).toHaveAttribute('aria-checked', 'false')
    expect(unselectedPart).not.toHaveClass('part-btn--selected')
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
