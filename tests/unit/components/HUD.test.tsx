import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import Graph from 'graphology'

import { HUD } from '@/components/HUD'
import { useBuildStore, type BuildStoreWithTemporal } from '@/state/store'

const resetBuildStore = () => {
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
}

const placeBrick = () => {
  const id = useBuildStore.getState().placeBrick({
    partId: 'brick-2x4',
    color: 'red',
    x: 0,
    y: 0,
    z: 0,
    rot: 0,
  })
  expect(id).not.toBeNull()
}

describe('HUD', () => {
  beforeEach(resetBuildStore)

  it('requires confirmation before starting a new build', () => {
    act(placeBrick)
    render(<HUD />)

    expect(screen.getByText('Bricks in build: 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'New' }))
    expect(
      screen.getByRole('dialog', { name: 'New build' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Bricks in build: 1')).toBeInTheDocument()
  })

  it('clears the build after Clear is confirmed', () => {
    act(placeBrick)
    render(<HUD />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear build' }))

    expect(screen.getByText('Bricks in build: 0')).toBeInTheDocument()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(0)
  })

  it('exposes keyboard help and operable toolbar controls', () => {
    render(<HUD />)

    expect(screen.getByRole('button', { name: 'New' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeEnabled()
    expect(
      screen.getByRole('button', { name: 'Keyboard shortcuts' }),
    ).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }))
    expect(
      screen.getByRole('dialog', { name: 'Keyboard shortcuts' }),
    ).toBeInTheDocument()
  })
})
