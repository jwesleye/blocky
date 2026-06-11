import { getBrickColor } from '@/domain/model/colors'
import { CATALOG_BY_ID as PART_CATALOG } from '@/domain/parts/catalog'
import type { BrickMount, PlacedBrick } from '@/domain/model/types'
import { getPartGeometry } from './parts/geometries'

interface Props {
  brick: PlacedBrick
}

function mountRotation(mount?: BrickMount): [number, number, number] {
  switch (mount) {
    case 'px':
      return [0, 0, -Math.PI / 2]
    case 'nx':
      return [0, 0, Math.PI / 2]
    case 'pz':
      return [Math.PI / 2, 0, 0]
    case 'nz':
      return [-Math.PI / 2, 0, 0]
    default:
      return [0, 0, 0]
  }
}

export function BrickMesh({ brick }: Props) {
  const partDef = PART_CATALOG[brick.partId]
  if (!partDef) return null

  const w = partDef.width
  const l = partDef.length
  const h = partDef.height
  const rotatedW = brick.rot === 1 || brick.rot === 3 ? l : w
  const rotatedL = brick.rot === 1 || brick.rot === 3 ? w : l
  const offsetX = (brick.offset?.x ?? 0) * 0.5
  const offsetZ = (brick.offset?.z ?? 0) * 0.5

  const posX = brick.x + offsetX + rotatedW / 2
  const posY = brick.y + h / 2
  const posZ = brick.z + offsetZ + rotatedL / 2
  const color = getBrickColor(brick.color)?.hex ?? '#888888'

  const [rx, , rz] = mountRotation(brick.mount)

  return (
    <mesh
      position={[posX, posY, posZ]}
      rotation={[rx, brick.rot * (Math.PI / 2), rz]}
    >
      <primitive
        object={getPartGeometry(brick.partId, { w, h, d: l })}
        attach="geometry"
      />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
