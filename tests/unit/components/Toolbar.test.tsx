import { render, screen, act } from '@testing-library/react'
import { Toolbar } from '../../../src/components/Toolbar'
import {
  type BuildStoreWithTemporal,
  useBuildStore,
} from '../../../src/state/store'
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
})
