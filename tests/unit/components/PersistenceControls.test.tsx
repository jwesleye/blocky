import { act, fireEvent, render, screen } from '@testing-library/react'
import Graph from 'graphology'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

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

describe('PersistenceControls — publish failure paths', () => {
  beforeEach(() => {
    resetStore()
    vi.spyOn(window, 'prompt').mockReturnValue('Test Build')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows error message on rejected publish (422) without mutating bricks', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'Invalid publish request', details: [] }),
        { status: 422 },
      ),
    )

    render(<PersistenceControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Sample Brick' }))
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish to Gallery' }))
    })

    expect(
      await screen.findByText(/publish rejected|validation|server error/i),
    ).toBeInTheDocument()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)
  })

  it('shows error message when backend is unavailable (network error) without mutating bricks', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Failed to fetch'))

    render(<PersistenceControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Sample Brick' }))
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Publish to Gallery' }))
    })

    expect(
      await screen.findByText(/failed to fetch|network error/i),
    ).toBeInTheDocument()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)
  })
})
