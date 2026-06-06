/**
 * Part definitions for all placeable brick types.
 * width = stud cells along X (rot=0), length = stud cells along Z (rot=0).
 * height = vertical extent in plate units (1 brick = 3 plates).
 */
export interface PartDef {
  width: number
  length: number
  height: number
}

export type PartCatalog = Record<string, PartDef>

const B = (width: number, length: number): PartDef => ({ width, length, height: 3 })
const P = (width: number, length: number): PartDef => ({ width, length, height: 1 })

export const PART_CATALOG: PartCatalog = {
  // Bricks (height 3)
  'brick-1x1': B(1, 1),
  'brick-1x2': B(1, 2),
  'brick-1x3': B(1, 3),
  'brick-1x4': B(1, 4),
  'brick-1x6': B(1, 6),
  'brick-1x8': B(1, 8),
  'brick-2x2': B(2, 2),
  'brick-2x3': B(2, 3),
  'brick-2x4': B(2, 4),
  'brick-2x6': B(2, 6),
  'brick-2x8': B(2, 8),
  // Plates (height 1)
  'plate-1x1': P(1, 1),
  'plate-1x2': P(1, 2),
  'plate-1x4': P(1, 4),
  'plate-2x2': P(2, 2),
  'plate-2x4': P(2, 4),
  'plate-2x6': P(2, 6),
  'plate-2x8': P(2, 8),
  // Tiles (height 1, smooth top — same footprint as equivalent plate)
  'tile-1x1': P(1, 1),
  'tile-1x2': P(1, 2),
  'tile-2x2': P(2, 2),
  'tile-2x4': P(2, 4),
  // Slopes (height 3)
  'slope-2x1': B(2, 1),
  'slope-2x2': B(2, 2),
  'slope-corner': B(2, 2),
  'slope-inverted': B(2, 1),
  // Rounds / specials
  'round-brick-1x1': B(1, 1),
  'round-plate-1x1': P(1, 1),
  'cone-1x1': B(1, 1),
}
