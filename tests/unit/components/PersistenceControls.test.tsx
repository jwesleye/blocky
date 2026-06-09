import { fireEvent, render, screen } from '@testing-library/react'
import Graph from 'graphology'
import { beforeEach, describe, expect, it } from 'vitest'

import { PersistenceControls } from '@/components/PersistenceControls'
import { type BuildStoreWithTemporal, useBuildStore } from '@/state/store'

const resetStore = () => {
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
  })
  temporal.clear()
  temporal.resume()
}

describe('PersistenceControls', () => {
  beforeEach(resetStore)

  it('adds a sample brick to the canonical build store', () => {
    render(<PersistenceControls />)

    fireEvent.click(screen.getByRole('button', { name: 'Add Sample Brick' }))

    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)
  })
})
