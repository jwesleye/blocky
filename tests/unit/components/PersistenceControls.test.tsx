import { act, fireEvent, render, screen } from '@testing-library/react'
import Graph from 'graphology'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { PersistenceControls } from '@/components/PersistenceControls'
import {
  SHARE_URL_PARAM,
  decodeShareToken,
} from '@/domain/persistence/shareUrl'
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

  it('generates a share link carrying a compressed build token, not raw JSON', () => {
    render(<PersistenceControls />)
    // Seed the store with a recognizable brick.
    fireEvent.click(screen.getByRole('button', { name: 'Add Sample Brick' }))
    const placed = Object.values(useBuildStore.getState().bricks)
    expect(placed).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Share Link' }))

    const input = screen.getByTestId('share-url') as HTMLInputElement
    const url = new URL(input.value)
    const token = url.searchParams.get(SHARE_URL_PARAM)
    expect(token).not.toBeNull()
    expect(input.value).not.toContain('partId')

    const decoded = decodeShareToken(token as string)
    expect(decoded?.bricks).toHaveLength(1)
    expect(decoded?.bricks[0]).toMatchObject({
      partId: placed[0].partId,
      color: placed[0].color,
    })
  })
})

describe('PersistenceControls - screenshot export', () => {
  beforeEach(resetStore)

  it('renders an Export Screenshot button', () => {
    render(<PersistenceControls />)
    expect(
      screen.getByRole('button', { name: 'Export Screenshot' }),
    ).toBeInTheDocument()
  })

  it('Export Screenshot button is disabled when no capture function is provided', () => {
    render(<PersistenceControls />)
    expect(
      screen.getByRole('button', { name: 'Export Screenshot' }),
    ).toBeDisabled()
  })

  it('Export Screenshot button is enabled when a capture function is provided', () => {
    const onExportScreenshot = vi.fn().mockResolvedValue(undefined)
    render(<PersistenceControls onExportScreenshot={onExportScreenshot} />)
    expect(
      screen.getByRole('button', { name: 'Export Screenshot' }),
    ).toBeEnabled()
  })

  it('calls onExportScreenshot when the button is clicked', async () => {
    const onExportScreenshot = vi.fn().mockResolvedValue(undefined)
    render(<PersistenceControls onExportScreenshot={onExportScreenshot} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Export Screenshot' }))
    })

    expect(onExportScreenshot).toHaveBeenCalledOnce()
  })

  it('shows an error message when the capture function rejects', async () => {
    const onExportScreenshot = vi
      .fn()
      .mockRejectedValue(new Error('empty capture'))
    render(<PersistenceControls onExportScreenshot={onExportScreenshot} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Export Screenshot' }))
    })

    expect(
      await screen.findByText(/screenshot failed|empty capture/i),
    ).toBeInTheDocument()
  })
})

describe('PersistenceControls - publish failure paths', () => {
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
      fireEvent.click(
        screen.getByRole('button', { name: 'Publish to Gallery' }),
      )
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
      fireEvent.click(
        screen.getByRole('button', { name: 'Publish to Gallery' }),
      )
    })

    expect(
      await screen.findByText(/failed to fetch|network error/i),
    ).toBeInTheDocument()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)
  })

  it('shows error message when backend is unavailable with WebKit-style error (Load failed) without mutating bricks', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Load failed'))

    render(<PersistenceControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Sample Brick' }))
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Publish to Gallery' }),
      )
    })

    expect(
      await screen.findByText(/failed to fetch|network error|error/i),
    ).toBeInTheDocument()
    expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(1)
  })
})
