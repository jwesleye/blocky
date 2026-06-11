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

  // Swap width/length for 90°/270° rotation
  const w = brick.rot === 1 || brick.rot === 3 ? partDef.length : partDef.width
  const l = brick.rot === 1 || brick.rot === 3 ? partDef.width : partDef.length
  const h = partDef.height

  // Half-stud offset: offset.x/z ∈ {0, 1} → 0 or 0.5 stud shift (matches brickToBodySnapshot)
  const offsetX = (brick.offset?.x ?? 0) * 0.5
  const offsetZ = (brick.offset?.z ?? 0) * 0.5

  const posX = brick.x + offsetX + w / 2
  const posY = brick.y + h / 2
  const posZ = brick.z + offsetZ + l / 2

  const color = getBrickColor(brick.color)?.hex ?? '#888888'

  return (
    <mesh position={[posX, posY, posZ]}>
      <primitive object={getPartGeometry(brick.partId, { w, h, d: l })} attach="geometry" />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
