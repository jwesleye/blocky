import { PART_CATALOG } from '@/domain/parts/catalog'
import { getBrickColor } from '@/domain/model/colors'
import { STUD_PITCH_MM, PLATE_HEIGHT_MM } from '@/domain/grid'
import type { PlacedBrick } from '@/domain/model/types'

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

  const sizeX = w * STUD_PITCH_MM
  const sizeY = h * PLATE_HEIGHT_MM
  const sizeZ = l * STUD_PITCH_MM

  // Center the box so its bottom sits at brick.y in plate units
  const posX = brick.x * STUD_PITCH_MM + sizeX / 2
  const posY = brick.y * PLATE_HEIGHT_MM + sizeY / 2
  const posZ = brick.z * STUD_PITCH_MM + sizeZ / 2

  const color = getBrickColor(brick.color)?.hex ?? '#888888'

  return (
    <mesh position={[posX, posY, posZ]}>
      <boxGeometry args={[sizeX, sizeY, sizeZ]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
