import { render, screen, act, fireEvent } from '@testing-library/react'
import { Toolbar } from '../../../src/components/Toolbar'
import {
  type BuildStoreWithTemporal,
  useBuildStore,
} from '../../../src/state/store'
import { useCursorStore } from '../../../src/state/cursor'
import { BrickCount } from '../../../src/components/BrickCount'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Graph from 'graphology'

function installMatchMedia(initialMatches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      get matches() {
        return initialMatches
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('HUD Components', () => {
  beforeEach(() => {
    installMatchMedia(false)
    const temporal = (
      useBuildStore as unknown as BuildStoreWithTemporal
    ).temporal.getState()
    temporal.pause()
    useBuildStore.setState({
      bricks: {},
      selection: new Set<string>(),
      connectionGraph: new Graph({ type: 'undirected', allowSelfLoops: false }),
      lastCollapse: null,
      baseplateSize: 32,
      activeCollapse: null,
    })
    temporal.clear()
    temporal.resume()
  })

  it('renders all toolbar buttons', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: /Rotate/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Undo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Redo/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Save\/Share/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Reset View/i }),
    ).toBeInTheDocument()
  })

  it('disables Undo and Redo when history is empty', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: /Undo/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Redo/i })).toBeDisabled()
  })

  it('updates brick count', () => {
    render(<BrickCount />)
    expect(screen.getByText('Bricks in build: 0')).toBeInTheDocument()

    act(() => {
      useBuildStore.getState().placeBrick({
        partId: 'brick-2x4',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
      })
    })

    expect(screen.getByText('Bricks in build: 1')).toBeInTheDocument()
  })

  it('includes the theme toggle with Auto, Light, and Dark buttons', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Auto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument()
  })

  it('renders the Toggle X-Axis Hinge button', () => {
    render(<Toolbar />)
    expect(
      screen.getByRole('button', { name: /Toggle X-Axis Hinge/i }),
    ).toBeInTheDocument()
  })

  it('clicking Toggle X-Axis Hinge sets cursor hinge to x', () => {
    act(() => {
      useCursorStore.setState({ hinge: undefined })
    })
    render(<Toolbar />)
    const hingeBtn = screen.getByRole('button', { name: /Toggle X-Axis Hinge/i })
    fireEvent.click(hingeBtn)
    expect(useCursorStore.getState().hinge).toBe('x')
  })

  it('clicking Toggle X-Axis Hinge again clears hinge back to undefined', () => {
    act(() => {
      useCursorStore.setState({ hinge: undefined })
    })
    render(<Toolbar />)
    const hingeBtn = screen.getByRole('button', { name: /Toggle X-Axis Hinge/i })
    fireEvent.click(hingeBtn)
    fireEvent.click(hingeBtn)
    expect(useCursorStore.getState().hinge).toBeUndefined()
  })

  it('offset and mount controls still work alongside hinge control', () => {
    act(() => {
      useCursorStore.setState({ hinge: undefined, offset: undefined, mount: undefined })
    })
    render(<Toolbar />)
    const offsetBtn = screen.getByTestId('toggle-half-stud')
    const mountBtn = screen.getByTestId('cycle-mount')
    fireEvent.click(offsetBtn)
    expect(useCursorStore.getState().offset).toBeDefined()
    fireEvent.click(mountBtn)
    expect(useCursorStore.getState().mount).toBeDefined()
  })
})
