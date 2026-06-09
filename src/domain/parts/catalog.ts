import type { PartDef, PartCategory } from './types'
export { partDefSchema } from './types'
export type { PartDef, PartCategory } from './types'

/**
 * Physics-facing bounding-box shape for catalog record lookups.
 * Derived from PartDef and used by physics/placement modules.
 */
export interface PhysicsPartDef {
  width: number
  length: number
  height: number
  hasTopStuds: boolean
}

export type PartCatalog = Record<string, PhysicsPartDef>

export type PartType = 'brick' | 'plate' | 'tile' | 'slope' | 'round'

export const PART_TYPE_LABELS: Record<PartType, string> = {
  brick: 'Bricks',
  plate: 'Plates',
  tile: 'Tiles',
  slope: 'Slopes',
  round: 'Rounds & Specials',
}

export const PART_CATALOG: readonly PartDef[] = [
  // Bricks (heightY = 3 plate units, hasTopStuds = true)
  {
    id: 'brick-1x1',
    label: 'Brick 1×1',
    category: 'brick',
    widthX: 1,
    widthZ: 1,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'brick-1x2',
    label: 'Brick 1×2',
    category: 'brick',
    widthX: 1,
    widthZ: 2,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'brick-1x3',
    label: 'Brick 1×3',
    category: 'brick',
    widthX: 1,
    widthZ: 3,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'brick-1x4',
    label: 'Brick 1×4',
    category: 'brick',
    widthX: 1,
    widthZ: 4,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'brick-1x6',
    label: 'Brick 1×6',
    category: 'brick',
    widthX: 1,
    widthZ: 6,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'brick-1x8',
    label: 'Brick 1×8',
    category: 'brick',
    widthX: 1,
    widthZ: 8,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'brick-2x2',
    label: 'Brick 2×2',
    category: 'brick',
    widthX: 2,
    widthZ: 2,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'brick-2x3',
    label: 'Brick 2×3',
    category: 'brick',
    widthX: 2,
    widthZ: 3,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'brick-2x4',
    label: 'Brick 2×4',
    category: 'brick',
    widthX: 2,
    widthZ: 4,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'brick-2x6',
    label: 'Brick 2×6',
    category: 'brick',
    widthX: 2,
    widthZ: 6,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'brick-2x8',
    label: 'Brick 2×8',
    category: 'brick',
    widthX: 2,
    widthZ: 8,
    heightY: 3,
    hasTopStuds: true,
  },
  // Plates (heightY = 1, hasTopStuds = true)
  {
    id: 'plate-1x1',
    label: 'Plate 1×1',
    category: 'plate',
    widthX: 1,
    widthZ: 1,
    heightY: 1,
    hasTopStuds: true,
  },
  {
    id: 'plate-1x2',
    label: 'Plate 1×2',
    category: 'plate',
    widthX: 1,
    widthZ: 2,
    heightY: 1,
    hasTopStuds: true,
  },
  {
    id: 'plate-1x4',
    label: 'Plate 1×4',
    category: 'plate',
    widthX: 1,
    widthZ: 4,
    heightY: 1,
    hasTopStuds: true,
  },
  {
    id: 'plate-2x2',
    label: 'Plate 2×2',
    category: 'plate',
    widthX: 2,
    widthZ: 2,
    heightY: 1,
    hasTopStuds: true,
  },
  {
    id: 'plate-2x4',
    label: 'Plate 2×4',
    category: 'plate',
    widthX: 2,
    widthZ: 4,
    heightY: 1,
    hasTopStuds: true,
  },
  {
    id: 'plate-2x6',
    label: 'Plate 2×6',
    category: 'plate',
    widthX: 2,
    widthZ: 6,
    heightY: 1,
    hasTopStuds: true,
  },
  {
    id: 'plate-2x8',
    label: 'Plate 2×8',
    category: 'plate',
    widthX: 2,
    widthZ: 8,
    heightY: 1,
    hasTopStuds: true,
  },
  // Tiles (heightY = 1, smooth top — no top studs)
  {
    id: 'tile-1x1',
    label: 'Tile 1×1',
    category: 'tile',
    widthX: 1,
    widthZ: 1,
    heightY: 1,
    hasTopStuds: false,
  },
  {
    id: 'tile-1x2',
    label: 'Tile 1×2',
    category: 'tile',
    widthX: 1,
    widthZ: 2,
    heightY: 1,
    hasTopStuds: false,
  },
  {
    id: 'tile-2x2',
    label: 'Tile 2×2',
    category: 'tile',
    widthX: 2,
    widthZ: 2,
    heightY: 1,
    hasTopStuds: false,
  },
  {
    id: 'tile-2x4',
    label: 'Tile 2×4',
    category: 'tile',
    widthX: 2,
    widthZ: 4,
    heightY: 1,
    hasTopStuds: false,
  },
  // Slopes (heightY = 3, hasTopStuds = true)
  {
    id: 'slope-2x1',
    label: 'Slope 2×1',
    category: 'slope',
    widthX: 2,
    widthZ: 1,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'slope-2x2',
    label: 'Slope 2×2',
    category: 'slope',
    widthX: 2,
    widthZ: 2,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'slope-corner',
    label: 'Corner Slope',
    category: 'slope',
    widthX: 2,
    widthZ: 2,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'slope-inverted',
    label: 'Inverted Slope',
    category: 'slope',
    widthX: 2,
    widthZ: 1,
    heightY: 3,
    hasTopStuds: true,
  },
  // Rounds & specials
  {
    id: 'round-brick-1x1',
    label: 'Round Brick 1×1',
    category: 'round',
    widthX: 1,
    widthZ: 1,
    heightY: 3,
    hasTopStuds: true,
  },
  {
    id: 'round-plate-1x1',
    label: 'Round Plate 1×1',
    category: 'round',
    widthX: 1,
    widthZ: 1,
    heightY: 1,
    hasTopStuds: true,
  },
  {
    id: 'cone-1x1',
    label: 'Cone 1×1',
    category: 'round',
    widthX: 1,
    widthZ: 1,
    heightY: 3,
    hasTopStuds: true,
  },
  // Baseplate
  {
    id: 'baseplate-32x32',
    label: 'Baseplate 32×32',
    category: 'baseplate',
    widthX: 32,
    widthZ: 32,
    heightY: 1,
    hasTopStuds: true,
  },
]

/**
 * Physics-facing lookup map keyed by part id.
 * Uses legacy width/length/height field names expected by physics modules.
 */
export const CATALOG_BY_ID: PartCatalog = Object.fromEntries(
  PART_CATALOG.map((part) => [
    part.id,
    {
      width: part.widthX,
      length: part.widthZ,
      height: part.heightY,
      hasTopStuds: part.hasTopStuds,
    },
  ]),
)

export const DEFAULT_PART_ID = 'brick-2x4'

export function getPart(id: string): PartDef | undefined {
  return PART_CATALOG.find((p) => p.id === id)
}

export function isValidPartId(id: string): boolean {
  return PART_CATALOG.some((p) => p.id === id)
}

export function getPartsByCategory(
  category: PartCategory,
): readonly PartDef[] {
  return PART_CATALOG.filter((p) => p.category === category)
}
