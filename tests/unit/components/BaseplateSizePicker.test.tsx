import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Graph from 'graphology'

import { BaseplateSizePicker } from '@/components/BaseplateSizePicker'
import { SUPPORTED_BASEPLATE_SIZES } from '@/domain/grid'
import type { PlacedBrick } from '@/domain/model/types'
import { type BuildStoreWithTemporal, useBuildStore } from '@/state/store'

// A 2×4 brick anchored at (20, 20) occupies cells x∈[20,21], z∈[20,23]: inside a
// 32-stud plate (cells 0..31) but outside a 16-stud plate (cells 0..15).
const outsideOnShrinkBrick: PlacedBrick = {
  id: 'outside-on-shrink',
  partId: 'brick-2x4',
  color: 'red',
  x: 20,
  y: 0,
  z: 20,
  rot: 0,
}

const seedStore = (overrides: {
  baseplateSize: number
  bricks?: PlacedBrick[]
}) => {
  const temporal = (
    useBuildStore as unknown as BuildStoreWithTemporal
  ).temporal.getState()
  temporal.pause()
  useBuildStore.setState({
    bricks: Object.fromEntries((overrides.bricks ?? []).map((b) => [b.id, b])),
    selection: new Set<string>(),
    connectionGraph: new Graph({ type: 'undirected', allowSelfLoops: false }),
    lastCollapse: null,
    baseplateSize: overrides.baseplateSize,
  })
  temporal.clear()
  temporal.resume()
}

describe('BaseplateSizePicker', () => {
  beforeEach(() => {
    seedStore({ baseplateSize: 32 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a selectable control for every supported baseplate size', () => {
    render(<BaseplateSizePicker />)
    for (const size of SUPPORTED_BASEPLATE_SIZES) {
      expect(
        screen.getByRole('radio', { name: `${size} × ${size}` }),
      ).toBeInTheDocument()
    }
  })

  it('marks the active baseplate size as checked', () => {
    render(<BaseplateSizePicker />)
    expect(screen.getByRole('radio', { name: '32 × 32' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('radio', { name: '16 × 16' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('applies an equal-or-larger size immediately without confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    render(<BaseplateSizePicker />)

    fireEvent.click(screen.getByRole('radio', { name: '64 × 64' }))

    expect(useBuildStore.getState().baseplateSize).toBe(64)
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('shrinks immediately without confirmation when no bricks fall outside', () => {
    seedStore({ baseplateSize: 32 })
    const confirmSpy = vi.spyOn(window, 'confirm')
    render(<BaseplateSizePicker />)

    fireEvent.click(screen.getByRole('radio', { name: '16 × 16' }))

    expect(useBuildStore.getState().baseplateSize).toBe(16)
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('applies a destructive shrink when the confirmation is accepted', () => {
    seedStore({ baseplateSize: 32, bricks: [outsideOnShrinkBrick] })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<BaseplateSizePicker />)

    fireEvent.click(screen.getByRole('radio', { name: '16 × 16' }))

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(useBuildStore.getState().baseplateSize).toBe(16)
  })

  it('leaves the size unchanged when the destructive shrink is cancelled', () => {
    seedStore({ baseplateSize: 32, bricks: [outsideOnShrinkBrick] })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<BaseplateSizePicker />)

    fireEvent.click(screen.getByRole('radio', { name: '16 × 16' }))

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(useBuildStore.getState().baseplateSize).toBe(32)
  })

  it('moves selection forward with ArrowDown', () => {
    seedStore({ baseplateSize: SUPPORTED_BASEPLATE_SIZES[0] })
    render(<BaseplateSizePicker />)
    const group = screen.getByRole('radiogroup')

    fireEvent.keyDown(group, { key: 'ArrowDown' })

    expect(useBuildStore.getState().baseplateSize).toBe(
      SUPPORTED_BASEPLATE_SIZES[1],
    )
  })

  it('moves selection backward with ArrowUp', () => {
    seedStore({ baseplateSize: SUPPORTED_BASEPLATE_SIZES[1] })
    render(<BaseplateSizePicker />)
    const group = screen.getByRole('radiogroup')

    fireEvent.keyDown(group, { key: 'ArrowUp' })

    expect(useBuildStore.getState().baseplateSize).toBe(
      SUPPORTED_BASEPLATE_SIZES[0],
    )
  })

  it('jumps to first size with Home', () => {
    seedStore({
      baseplateSize:
        SUPPORTED_BASEPLATE_SIZES[SUPPORTED_BASEPLATE_SIZES.length - 1],
    })
    render(<BaseplateSizePicker />)
    const group = screen.getByRole('radiogroup')

    fireEvent.keyDown(group, { key: 'Home' })

    expect(useBuildStore.getState().baseplateSize).toBe(
      SUPPORTED_BASEPLATE_SIZES[0],
    )
  })

  it('jumps to last size with End', () => {
    seedStore({ baseplateSize: SUPPORTED_BASEPLATE_SIZES[0] })
    render(<BaseplateSizePicker />)
    const group = screen.getByRole('radiogroup')

    fireEvent.keyDown(group, { key: 'End' })

    expect(useBuildStore.getState().baseplateSize).toBe(
      SUPPORTED_BASEPLATE_SIZES[SUPPORTED_BASEPLATE_SIZES.length - 1],
    )
  })

  it('wraps around to last size when pressing ArrowUp on the first item', () => {
    seedStore({ baseplateSize: SUPPORTED_BASEPLATE_SIZES[0] })
    render(<BaseplateSizePicker />)
    const group = screen.getByRole('radiogroup')

    fireEvent.keyDown(group, { key: 'ArrowUp' })

    expect(useBuildStore.getState().baseplateSize).toBe(
      SUPPORTED_BASEPLATE_SIZES[SUPPORTED_BASEPLATE_SIZES.length - 1],
    )
  })

  it('keeps focus on the selected radio when a destructive keyboard shrink is cancelled', () => {
    seedStore({ baseplateSize: 32, bricks: [outsideOnShrinkBrick] })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<BaseplateSizePicker />)

    const group = screen.getByRole('radiogroup')
    const btn32 = screen.getByRole('radio', { name: '32 × 32' })
    btn32.focus()

    // ArrowUp tries 16×16 but user cancels — focus must not move
    fireEvent.keyDown(group, { key: 'ArrowUp' })

    expect(document.activeElement).toBe(btn32)
    expect(useBuildStore.getState().baseplateSize).toBe(32)

    // Second ArrowUp should still target 16×16 (derived from baseplateSize=32), not wrap
    fireEvent.keyDown(group, { key: 'ArrowUp' })

    expect(document.activeElement).toBe(btn32)
    expect(useBuildStore.getState().baseplateSize).toBe(32)
  })
})
