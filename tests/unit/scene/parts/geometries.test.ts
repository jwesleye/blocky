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

function geometryVertices(geometry: BufferGeometry) {
  const positions = geometry.getAttribute('position')
  const vertices: Array<{ x: number; y: number; z: number }> = []

  for (let index = 0; index < positions.count; index += 1) {
    vertices.push({
      x: positions.getX(index),
      y: positions.getY(index),
      z: positions.getZ(index),
    })
  }

  return vertices
}

describe('getPartGeometry', () => {
  it('builds studded brick geometry while preserving the brick bounds', () => {
    const geometry = getPartGeometry('brick-2x4', { w: 2, d: 4, h: 3 })
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
    const geometry = getPartGeometry('plate-2x4', { w: 2, d: 4, h: 1 })
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

  it('builds cylinder geometry for round brick and round plate parts', () => {
    const roundBrick = getPartGeometry('round-brick-1x1', { w: 1, d: 1, h: 3 })
    const roundPlate = getPartGeometry('round-plate-1x1', { w: 1, d: 1, h: 1 })

    expect(roundBrick.type).toBe('CylinderGeometry')
    expect(roundPlate.type).toBe('CylinderGeometry')
    expect(geometrySize(roundBrick)).toEqual({ width: 1, height: 3, depth: 1 })
    expect(geometrySize(roundPlate)).toEqual({ width: 1, height: 1, depth: 1 })
    expect((roundBrick as BoxGeometry & { parameters?: { radialSegments?: number } }).parameters?.radialSegments).toBe(16)
    expect((roundPlate as BoxGeometry & { parameters?: { radialSegments?: number } }).parameters?.radialSegments).toBe(16)
  })

  it('builds cone geometry for cone-1x1', () => {
    const cone = getPartGeometry('cone-1x1', { w: 1, d: 1, h: 3 })

    expect(cone.type).toBe('ConeGeometry')
    expect(geometrySize(cone)).toEqual({ width: 1, height: 3, depth: 1 })
    expect((cone as BoxGeometry & { parameters?: { radialSegments?: number } }).parameters?.radialSegments).toBe(16)
  })

  it('falls back to a plain box for non-studded part types', () => {
    const geometry = getPartGeometry('tile-2x4', { w: 2, d: 4, h: 1 })
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
    const tileGeo = getPartGeometry('tile-2x2', { w: 2, d: 2, h: 1 })
    const refBox = new BoxGeometry(2, 1, 2)

    expect(tileGeo.getAttribute('position').count).toBe(
      refBox.getAttribute('position').count,
    )
    expect(geometrySize(tileGeo)).toEqual({ width: 2, height: 1, depth: 2 })
  })

  it('tile-2x2 geometry is distinct from same-footprint plate-2x2 (fewer vertices - no studs)', () => {
    const tileGeo = getPartGeometry('tile-2x2', { w: 2, d: 2, h: 1 })
    const plateGeo = getPartGeometry('plate-2x2', { w: 2, d: 2, h: 1 })

    expect(tileGeo.getAttribute('position').count).toBeLessThan(
      plateGeo.getAttribute('position').count,
    )
  })

  it('tile-1x2 returns studless geometry matching a plain box of the same footprint', () => {
    const tileGeo = getPartGeometry('tile-1x2', { w: 1, d: 2, h: 1 })
    const refBox = new BoxGeometry(1, 1, 2)

    expect(tileGeo.getAttribute('position').count).toBe(
      refBox.getAttribute('position').count,
    )
    expect(geometrySize(tileGeo)).toEqual({ width: 1, height: 1, depth: 2 })
  })

  it('builds a wedge profile for slope-2x1 with the expected angled top', () => {
    const slopeGeo = getPartGeometry('slope-2x1', { w: 2, d: 1, h: 3 })
    const vertices = geometryVertices(slopeGeo)

    expect(geometrySize(slopeGeo)).toEqual({ width: 2, height: 3, depth: 1 })
    expect(slopeGeo.type).not.toBe('BoxGeometry')
    expect(
      vertices.some(
        ({ x, y }) => Math.abs(x + 1) < 1e-6 && Math.abs(y - 1.5) < 1e-6,
      ),
    ).toBe(true)
    expect(
      vertices.some(
        ({ x, y }) => Math.abs(x - 1) < 1e-6 && Math.abs(y + 1.5) < 1e-6,
      ),
    ).toBe(true)
    expect(
      vertices.some(
        ({ x, y }) => Math.abs(x - 1) < 1e-6 && Math.abs(y - 1.5) < 1e-6,
      ),
    ).toBe(false)
  })

  it('routes standard slopes to wedge geometry without changing corner or inverted slopes yet', () => {
    const slope2x1 = getPartGeometry('slope-2x1', { w: 2, d: 1, h: 3 })
    const slope2x2 = getPartGeometry('slope-2x2', { w: 2, d: 2, h: 3 })
    const cornerSlope = getPartGeometry('slope-corner', { w: 2, d: 2, h: 3 })
    const invertedSlope = getPartGeometry('slope-inverted', { w: 2, d: 1, h: 3 })
    const brickGeo = getPartGeometry('brick-2x4', { w: 2, d: 4, h: 3 })

    expect(geometrySize(slope2x1)).toEqual({ width: 2, height: 3, depth: 1 })
    expect(geometrySize(slope2x2)).toEqual({ width: 2, height: 3, depth: 2 })
    expect(slope2x1.getAttribute('position').count).not.toBe(
      brickGeo.getAttribute('position').count,
    )
    expect(slope2x2.getAttribute('position').count).not.toBe(
      brickGeo.getAttribute('position').count,
    )
    expect(cornerSlope.type).toBe('BoxGeometry')
    expect(invertedSlope.type).toBe('BoxGeometry')
  })
})
