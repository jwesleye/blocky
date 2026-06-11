import { BoxGeometry, type BufferGeometry } from 'three'
import { describe, expect, it } from 'vitest'

import { getPartGeometry } from '@/scene/parts/geometries'

function geometrySize(geometry: BufferGeometry) {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) {
    throw new Error('expected bounding box')
  }

  return {
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
    depth: box.max.z - box.min.z,
  }
}

describe('getPartGeometry', () => {
  it('builds studded brick geometry while preserving the brick bounds', () => {
    const geometry = getPartGeometry('brick', { w: 2, d: 4, h: 3 })
    const box = new BoxGeometry(2, 3, 4)

    expect(geometrySize(geometry)).toEqual({
      width: 2,
      height: 3,
      depth: 4,
    })
    expect(geometry.getAttribute('position').count).toBeGreaterThan(
      box.getAttribute('position').count,
    )
  })

  it('builds studded plate geometry while preserving the plate bounds', () => {
    const geometry = getPartGeometry('plate', { w: 2, d: 4, h: 1 })
    const box = new BoxGeometry(2, 1, 4)

    expect(geometrySize(geometry)).toEqual({
      width: 2,
      height: 1,
      depth: 4,
    })
    expect(geometry.getAttribute('position').count).toBeGreaterThan(
      box.getAttribute('position').count,
    )
  })

  it('falls back to a plain box for non-studded part types', () => {
    const geometry = getPartGeometry('tile', { w: 2, d: 4, h: 1 })
    const box = new BoxGeometry(2, 1, 4)

    expect(geometry.getAttribute('position').count).toBe(
      box.getAttribute('position').count,
    )
    expect(geometrySize(geometry)).toEqual({
      width: 2,
      height: 1,
      depth: 4,
    })
  })

  it('tile-2x2 returns studless geometry matching a plain box of the same footprint', () => {
    const tileGeo = getPartGeometry('tile', { w: 2, d: 2, h: 1 })
    const refBox = new BoxGeometry(2, 1, 2)

    expect(tileGeo.getAttribute('position').count).toBe(
      refBox.getAttribute('position').count,
    )
    expect(geometrySize(tileGeo)).toEqual({ width: 2, height: 1, depth: 2 })
  })

  it('tile-2x2 geometry is distinct from same-footprint plate-2x2 (fewer vertices — no studs)', () => {
    const tileGeo = getPartGeometry('tile', { w: 2, d: 2, h: 1 })
    const plateGeo = getPartGeometry('plate', { w: 2, d: 2, h: 1 })

    expect(tileGeo.getAttribute('position').count).toBeLessThan(
      plateGeo.getAttribute('position').count,
    )
  })

  it('tile-1x2 returns studless geometry matching a plain box of the same footprint', () => {
    const tileGeo = getPartGeometry('tile', { w: 1, d: 2, h: 1 })
    const refBox = new BoxGeometry(1, 1, 2)

    expect(tileGeo.getAttribute('position').count).toBe(
      refBox.getAttribute('position').count,
    )
    expect(geometrySize(tileGeo)).toEqual({ width: 1, height: 1, depth: 2 })
  })
})
