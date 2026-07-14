import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import Graph from 'graphology'

import { BrickCount } from '@/components/BrickCount'
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

describe('BrickCount', () => {
  beforeEach(resetBuildStore)

  it('renders initial brick count as 0', () => {
    render(<BrickCount />)
    expect(screen.getByText('Bricks in build: 0')).toBeInTheDocument()
  })

  it('updates brick count when bricks are added', () => {
    useBuildStore.setState({
      bricks: {
        'brick-1': {
          id: 'brick-1',
          partId: 'brick-2x4',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
        'brick-2': {
          id: 'brick-2',
          partId: 'brick-2x2',
          color: 'blue',
          x: 2,
          y: 0,
          z: 0,
          rot: 0,
        },
      },
    })

    render(<BrickCount />)
    expect(screen.getByText('Bricks in build: 2')).toBeInTheDocument()
  })

  it('has aria-live="polite" attribute for accessibility', () => {
    render(<BrickCount />)
    const element = screen.getByText('Bricks in build: 0')
    expect(element).toHaveAttribute('aria-live', 'polite')
    expect(element).toHaveClass('brick-count')
  })
})
