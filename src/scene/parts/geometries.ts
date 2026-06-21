import {
  BufferAttribute,
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { getPartDef } from '@/domain/parts'
import type { PartDims } from '@/scene/instancing'

const STUD_HEIGHT = 0.18
const STUD_RADIUS = 0.3
const STUD_SEGMENTS = 16
const ROUND_SEGMENTS = 16
const STANDARD_SLOPE_IDS = new Set(['slope-2x1', 'slope-2x2'])
const ROUND_PART_IDS = new Set(['round-brick-1x1', 'round-plate-1x1'])

const geometryCache = new Map<string, BufferGeometry>()

function cacheKey(partId: string, dims: PartDims) {
  return `${partId}::${dims.w}::${dims.h}::${dims.d}${dims.hinge ? `::hinge_${dims.hinge}` : ''}`
}

function createBoxGeometry(dims: PartDims) {
  return new BoxGeometry(dims.w, dims.h, dims.d)
}

function createStuddedGeometry(dims: PartDims) {
  const bodyHeight = Math.max(dims.h - STUD_HEIGHT, 0.01)
  const body = new BoxGeometry(dims.w, bodyHeight, dims.d)
  body.translate(0, -STUD_HEIGHT / 2, 0)

  const geometries: BufferGeometry[] = [body]

  for (let x = 0; x < dims.w; x += 1) {
    for (let z = 0; z < dims.d; z += 1) {
      const stud = new CylinderGeometry(
        STUD_RADIUS,
        STUD_RADIUS,
        STUD_HEIGHT,
        STUD_SEGMENTS,
      )
      stud.translate(
        -dims.w / 2 + x + 0.5,
        dims.h / 2 - STUD_HEIGHT / 2,
        -dims.d / 2 + z + 0.5,
      )
      geometries.push(stud)
    }
  }

  return mergeGeometries(geometries, false) ?? createBoxGeometry(dims)
}

function createSlopeGeometry(dims: PartDims) {
  const profile = new Shape()
  profile.moveTo(-dims.w / 2, -dims.h / 2)
  profile.lineTo(-dims.w / 2, dims.h / 2)
  profile.lineTo(dims.w / 2, -dims.h / 2)
  profile.lineTo(-dims.w / 2, -dims.h / 2)

  const geometry = new ExtrudeGeometry(profile, {
    depth: dims.d,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  })
  geometry.translate(0, 0, -dims.d / 2)
  return geometry
}

function createInvertedSlopeGeometry(dims: PartDims) {
  const profile = new Shape()
  profile.moveTo(-dims.w / 2, -dims.h / 2)
  profile.lineTo(-dims.w / 2, dims.h / 2)
  profile.lineTo(dims.w / 2, dims.h / 2)
  profile.lineTo(-dims.w / 2, -dims.h / 2)

  const geometry = new ExtrudeGeometry(profile, {
    depth: dims.d,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  })
  geometry.translate(0, 0, -dims.d / 2)
  return geometry
}

function createCornerSlopeGeometry(dims: PartDims) {
  const xMin = -dims.w / 2
  const xMax = dims.w / 2
  const yMin = -dims.h / 2
  const yMax = dims.h / 2
  const zMin = -dims.d / 2
  const zMax = dims.d / 2

  const vertices = new Float32Array([
    xMin,
    yMin,
    zMin,
    xMax,
    yMin,
    zMin,
    xMax,
    yMin,
    zMax,
    xMin,
    yMin,
    zMax,
    xMin,
    yMax,
    zMin,
    xMin,
    yMax,
    zMax,
    xMax,
    yMax,
    zMin,
  ])

  const indices = [
    0, 3, 2, 0, 2, 1, 0, 4, 5, 0, 5, 3, 0, 1, 6, 0, 6, 4, 3, 5, 2, 1, 2, 6, 4,
    6, 5,
  ]

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  return geometry
}

function createGeometry(partId: string, dims: PartDims) {
  const part = getPartDef(partId)
  if (!part) {
    return createBoxGeometry(dims)
  }

  if (part.category === 'brick' || part.category === 'plate') {
    return createStuddedGeometry(dims)
  }

  if (ROUND_PART_IDS.has(partId)) {
    const radius = Math.min(dims.w, dims.d) / 2
    return new CylinderGeometry(radius, radius, dims.h, ROUND_SEGMENTS)
  }

  if (partId === 'cone-1x1') {
    const radius = Math.min(dims.w, dims.d) / 2
    return new ConeGeometry(radius, dims.h, ROUND_SEGMENTS)
  }

  if (
    part.category === 'slope' &&
    STANDARD_SLOPE_IDS.has(partId) &&
    dims.w === 2 &&
    dims.h === 3
  ) {
    return createSlopeGeometry(dims)
  }

  if (
    partId === 'slope-corner' &&
    dims.w === 2 &&
    dims.d === 2 &&
    dims.h === 3
  ) {
    return createCornerSlopeGeometry(dims)
  }

  if (partId === 'slope-inverted' && dims.w === 2 && dims.h === 3) {
    return createInvertedSlopeGeometry(dims)
  }

  return createBoxGeometry(dims)
}

export function getPartGeometry(partId: string, dims: PartDims) {
  const key = cacheKey(partId, dims)
  const cached = geometryCache.get(key)
  if (cached) {
    return cached
  }

  let geometry = createGeometry(partId, dims)
  if (dims.hinge === 'x') {
    const marker = new CylinderGeometry(0.22, 0.22, dims.w + 0.25, 8)
    marker.rotateZ(Math.PI / 2)
    const merged = mergeGeometries([geometry, marker], false)
    if (merged) {
      geometry.dispose()
      marker.dispose()
      geometry = merged
    }
  } else if (dims.hinge === 'z') {
    const marker = new CylinderGeometry(0.22, 0.22, dims.d + 0.25, 8)
    marker.rotateX(Math.PI / 2)
    const merged = mergeGeometries([geometry, marker], false)
    if (merged) {
      geometry.dispose()
      marker.dispose()
      geometry = merged
    }
  }

  geometry.computeVertexNormals()
  geometryCache.set(key, geometry)
  return geometry
}
