import { getBrickColor } from '@/domain/model/colors'
import { CATALOG_BY_ID as PART_CATALOG } from '@/domain/parts/catalog'
import type { PlacedBrick } from '@/domain/model/types'
import { getPartGeometry } from './parts/geometries'

interface Props {
  brick: PlacedBrick
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

  return (
    <mesh
      position={[posX, posY, posZ]}
      rotation={[0, brick.rot * (Math.PI / 2), 0]}
    >
      <primitive
        object={getPartGeometry(brick.partId, { w, h, d: l })}
        attach="geometry"
      />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
