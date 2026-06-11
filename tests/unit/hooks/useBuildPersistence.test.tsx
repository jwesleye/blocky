import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useBuildPersistence } from '@/hooks/useBuildPersistence'
import type { PlacedBrick } from '@/domain/model/types'
import { useBuildStore } from '@/state/store'

const offsetBrick: PlacedBrick = {
  id: 'offset',
  partId: 'brick-1x1',
  color: 'yellow',
  x: 2,
  y: 0,
  z: 3,
  rot: 1,
  offset: { x: 1, z: 0 },
}

const classicBrick: PlacedBrick = {
  id: 'classic',
  partId: 'plate-1x2',
  color: 'green',
  x: 0,
  y: 1,
  z: 0,
  rot: 0,
}

/**
 * jsdom's Blob does not implement `.text()`, so stub the Blob constructor to
 * capture the serialized parts. URL.createObjectURL/revokeObjectURL and the
 * anchor download are also stubbed (jsdom implements none of them) to mirror
 * the export flow in src/hooks/useBuildPersistence.ts.
 */
class CapturingBlob {
  parts: BlobPart[]
  type: string
  constructor(parts: BlobPart[], options?: { type?: string }) {
    this.parts = parts
    this.type = options?.type ?? ''
  }
}

function exportedJSON(run: () => void): {
  version: number
  bricks: Record<string, unknown>[]
} {
  let captured: CapturingBlob | null = null
  const createObjectURL = vi.fn((blob: unknown) => {
    captured = blob as CapturingBlob
    return 'blob:mock'
  })
  vi.stubGlobal('Blob', CapturingBlob)
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {})

  run()

  clickSpy.mockRestore()
  vi.unstubAllGlobals()

  expect(createObjectURL).toHaveBeenCalledOnce()
  expect(captured).not.toBeNull()
  return JSON.parse((captured as unknown as CapturingBlob).parts.join(''))
}

describe('useBuildPersistence.exportToJSON (issue #101)', () => {
  beforeEach(() =>
    useBuildStore.setState({
      bricks: {},
      selection: new Set<string>(),
      lastCollapse: null,
      activeCollapse: null,
    }),
  )

  it('serializes a half-stud build as version 2 with the offset intact', () => {
    useBuildStore.setState({
      bricks: {
        [offsetBrick.id]: offsetBrick,
        [classicBrick.id]: classicBrick,
      },
    })
    const { result } = renderHook(() => useBuildPersistence())

    const build = exportedJSON(() => result.current.exportToJSON())

    expect(build.version).toBe(2)
    expect(build.bricks).toHaveLength(2)
    expect(build.bricks[0]).toMatchObject({
      partId: 'brick-1x1',
      color: 'yellow',
      x: 2,
      y: 0,
      z: 3,
      rot: 1,
      offset: { x: 1, z: 0 },
    })
    // The classic brick must not gain an offset on export.
    expect(build.bricks[1]).not.toHaveProperty('offset')
  })

  it('serializes a classic build (no offsets) as version 1', () => {
    useBuildStore.setState({
      bricks: {
        [classicBrick.id]: classicBrick,
      },
    })
    const { result } = renderHook(() => useBuildPersistence())

    const build = exportedJSON(() => result.current.exportToJSON())

    expect(build.version).toBe(1)
    expect(build.bricks[0]).not.toHaveProperty('offset')
  })

  it('serializes a SNOT build as version 3 with the mount intact', () => {
    const mountBrick: PlacedBrick = {
      id: 'mounted',
      partId: 'brick-1x1',
      color: 'red',
      x: 1,
      y: 0,
      z: 1,
      rot: 0,
      mount: 'px',
    }
    useBuildStore.setState({ bricks: { [mountBrick.id]: mountBrick } })
    const { result } = renderHook(() => useBuildPersistence())

    const build = exportedJSON(() => result.current.exportToJSON())

    expect(build.version).toBe(3)
    expect(build.bricks[0]).toMatchObject({ partId: 'brick-1x1', mount: 'px' })
  })

  it('serializes a hinge build as version 4 with the hinge intact', () => {
    const hingeBrick: PlacedBrick = {
      id: 'hinged',
      partId: 'brick-1x1',
      color: 'blue',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
      hinge: 'z',
    }
    useBuildStore.setState({ bricks: { [hingeBrick.id]: hingeBrick } })
    const { result } = renderHook(() => useBuildPersistence())

    const build = exportedJSON(() => result.current.exportToJSON())

    expect(build.version).toBe(4)
    expect(build.bricks[0]).toMatchObject({ partId: 'brick-1x1', hinge: 'z' })
  })
})
