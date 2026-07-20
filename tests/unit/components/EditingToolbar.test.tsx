import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EditingToolbar } from '@/components/EditingToolbar'

describe('EditingToolbar', () => {
  it('renders Place, Select, Paint, and Eyedropper buttons', () => {
    render(<EditingToolbar activeTool="place" onToolChange={() => undefined} />)
    expect(screen.getByTestId('tool-place')).toBeInTheDocument()
    expect(screen.getByTestId('tool-select')).toBeInTheDocument()
    expect(screen.getByTestId('tool-paint')).toBeInTheDocument()
    expect(screen.getByTestId('tool-eyedropper')).toBeInTheDocument()
  })

  it('sets aria-pressed=true only on the active tool', () => {
    render(<EditingToolbar activeTool="paint" onToolChange={() => undefined} />)
    expect(screen.getByTestId('tool-paint')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByTestId('tool-place')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByTestId('tool-eyedropper')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('calls onToolChange with place when Place is clicked', () => {
    const onToolChange = vi.fn()
    render(<EditingToolbar activeTool="paint" onToolChange={onToolChange} />)
    fireEvent.click(screen.getByTestId('tool-place'))
    expect(onToolChange).toHaveBeenCalledWith('place')
  })

  it('calls onToolChange with paint when Paint is clicked', () => {
    const onToolChange = vi.fn()
    render(<EditingToolbar activeTool="place" onToolChange={onToolChange} />)
    fireEvent.click(screen.getByTestId('tool-paint'))
    expect(onToolChange).toHaveBeenCalledWith('paint')
  })

  it('calls onToolChange with eyedropper when Eyedropper is clicked', () => {
    const onToolChange = vi.fn()
    render(<EditingToolbar activeTool="place" onToolChange={onToolChange} />)
    fireEvent.click(screen.getByTestId('tool-eyedropper'))
    expect(onToolChange).toHaveBeenCalledWith('eyedropper')
  })

  it('reflects eyedropper as active tool', () => {
    render(
      <EditingToolbar activeTool="eyedropper" onToolChange={() => undefined} />,
    )
    expect(screen.getByTestId('tool-eyedropper')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByTestId('tool-place')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByTestId('tool-paint')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('active tool button carries a non-color visual cue: fontWeight 700 and outline', () => {
    render(<EditingToolbar activeTool="paint" onToolChange={() => undefined} />)
    const activeBtn = screen.getByTestId('tool-paint')
    const inactiveBtn = screen.getByTestId('tool-place')

    expect(activeBtn).toHaveStyle('font-weight: 700')
    expect(inactiveBtn).not.toHaveStyle('font-weight: 700')

    const activeOutline = activeBtn.style.outline
    expect(activeOutline).toBeTruthy()
    expect(activeBtn.style.outline).not.toBe('')
  })

  it('each button has an accessible name', () => {
    render(<EditingToolbar activeTool="place" onToolChange={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Place' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Paint' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Eyedropper' }),
    ).toBeInTheDocument()
  })
})
