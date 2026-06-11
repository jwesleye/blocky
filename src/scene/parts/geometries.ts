import {
  BoxGeometry,
  BufferAttribute,
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
const CORNER_SLOPE_IDS = new Set(['slope-corner'])
const INVERTED_SLOPE_IDS = new Set(['slope-inverted'])

const geometryCache = new Map<string, BufferGeometry>()

function cacheKey(partId: string, dims: PartDims) {
  return `${partId}::${dims.w}::${dims.h}::${dims.d}`
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

function createCornerSlopeGeometry(dims: PartDims) {
  const hw = dims.w / 2
  const hh = dims.h / 2
  const hd = dims.d / 2

  const positions = new Float32Array([
    -hw, -hh, -hd,  hw, -hh, -hd,  hw, -hh,  hd,
    -hw, -hh, -hd,  hw, -hh,  hd, -hw, -hh,  hd,
    -hw, -hh, -hd, -hw,  hh, -hd,  hw, -hh, -hd,
    -hw, -hh, -hd, -hw, -hh,  hd, -hw,  hh, -hd,
    -hw, -hh,  hd,  hw, -hh,  hd, -hw,  hh, -hd,
     hw, -hh,  hd,  hw, -hh, -hd, -hw,  hh, -hd,
  ])

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
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

  if (part.category === 'slope' && CORNER_SLOPE_IDS.has(partId) && dims.h === 3) {
    return createCornerSlopeGeometry(dims)
  }

  if (part.category === 'slope' && INVERTED_SLOPE_IDS.has(partId) && dims.h === 3) {
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

  const geometry = createGeometry(partId, dims)
  geometry.computeVertexNormals()
  geometryCache.set(key, geometry)
  return geometry
}
