export type PartType = 'brick' | 'plate' | 'tile' | 'slope' | 'round'

export interface PartDefinition {
  id: string
  name: string
  type: PartType
  footprint: ReadonlyArray<readonly [x: number, z: number]>
  height: number
}

function rect(w: number, d: number): ReadonlyArray<readonly [number, number]> {
  const cells: Array<readonly [number, number]> = []
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      cells.push([x, z])
    }
  }
  return cells
}

export const PARTS_CATALOG: readonly PartDefinition[] = [
  // Bricks (height = 3 plate units)
  {
    id: 'brick-1x1',
    name: 'Brick 1×1',
    type: 'brick',
    footprint: rect(1, 1),
    height: 3,
  },
  {
    id: 'brick-1x2',
    name: 'Brick 1×2',
    type: 'brick',
    footprint: rect(1, 2),
    height: 3,
  },
  {
    id: 'brick-1x3',
    name: 'Brick 1×3',
    type: 'brick',
    footprint: rect(1, 3),
    height: 3,
  },
  {
    id: 'brick-1x4',
    name: 'Brick 1×4',
    type: 'brick',
    footprint: rect(1, 4),
    height: 3,
  },
  {
    id: 'brick-1x6',
    name: 'Brick 1×6',
    type: 'brick',
    footprint: rect(1, 6),
    height: 3,
  },
  {
    id: 'brick-1x8',
    name: 'Brick 1×8',
    type: 'brick',
    footprint: rect(1, 8),
    height: 3,
  },
  {
    id: 'brick-2x2',
    name: 'Brick 2×2',
    type: 'brick',
    footprint: rect(2, 2),
    height: 3,
  },
  {
    id: 'brick-2x3',
    name: 'Brick 2×3',
    type: 'brick',
    footprint: rect(2, 3),
    height: 3,
  },
  {
    id: 'brick-2x4',
    name: 'Brick 2×4',
    type: 'brick',
    footprint: rect(2, 4),
    height: 3,
  },
  {
    id: 'brick-2x6',
    name: 'Brick 2×6',
    type: 'brick',
    footprint: rect(2, 6),
    height: 3,
  },
  {
    id: 'brick-2x8',
    name: 'Brick 2×8',
    type: 'brick',
    footprint: rect(2, 8),
    height: 3,
  },
  // Plates (height = 1 plate unit)
  {
    id: 'plate-1x1',
    name: 'Plate 1×1',
    type: 'plate',
    footprint: rect(1, 1),
    height: 1,
  },
  {
    id: 'plate-1x2',
    name: 'Plate 1×2',
    type: 'plate',
    footprint: rect(1, 2),
    height: 1,
  },
  {
    id: 'plate-1x4',
    name: 'Plate 1×4',
    type: 'plate',
    footprint: rect(1, 4),
    height: 1,
  },
  {
    id: 'plate-2x2',
    name: 'Plate 2×2',
    type: 'plate',
    footprint: rect(2, 2),
    height: 1,
  },
  {
    id: 'plate-2x4',
    name: 'Plate 2×4',
    type: 'plate',
    footprint: rect(2, 4),
    height: 1,
  },
  {
    id: 'plate-2x6',
    name: 'Plate 2×6',
    type: 'plate',
    footprint: rect(2, 6),
    height: 1,
  },
  {
    id: 'plate-2x8',
    name: 'Plate 2×8',
    type: 'plate',
    footprint: rect(2, 8),
    height: 1,
  },
  // Tiles (height = 1, smooth top — no top studs)
  {
    id: 'tile-1x1',
    name: 'Tile 1×1',
    type: 'tile',
    footprint: rect(1, 1),
    height: 1,
  },
  {
    id: 'tile-1x2',
    name: 'Tile 1×2',
    type: 'tile',
    footprint: rect(1, 2),
    height: 1,
  },
  {
    id: 'tile-2x2',
    name: 'Tile 2×2',
    type: 'tile',
    footprint: rect(2, 2),
    height: 1,
  },
  {
    id: 'tile-2x4',
    name: 'Tile 2×4',
    type: 'tile',
    footprint: rect(2, 4),
    height: 1,
  },
  // Slopes (height = 3)
  {
    id: 'slope-2x1',
    name: 'Slope 2×1',
    type: 'slope',
    footprint: rect(2, 1),
    height: 3,
  },
  {
    id: 'slope-2x2',
    name: 'Slope 2×2',
    type: 'slope',
    footprint: rect(2, 2),
    height: 3,
  },
  {
    id: 'slope-corner',
    name: 'Corner Slope',
    type: 'slope',
    footprint: rect(2, 2),
    height: 3,
  },
  {
    id: 'slope-inverted',
    name: 'Inverted Slope',
    type: 'slope',
    footprint: rect(2, 1),
    height: 3,
  },
  // Rounds & specials
  {
    id: 'round-brick-1x1',
    name: 'Round Brick 1×1',
    type: 'round',
    footprint: rect(1, 1),
    height: 3,
  },
  {
    id: 'round-plate-1x1',
    name: 'Round Plate 1×1',
    type: 'round',
    footprint: rect(1, 1),
    height: 1,
  },
  {
    id: 'cone-1x1',
    name: 'Cone 1×1',
    type: 'round',
    footprint: rect(1, 1),
    height: 3,
  },
]

export const DEFAULT_PART_ID = 'brick-2x4'

export const PART_TYPE_LABELS: Record<PartType, string> = {
  brick: 'Bricks',
  plate: 'Plates',
  tile: 'Tiles',
  slope: 'Slopes',
  round: 'Rounds & Specials',
}

export function getPart(id: string): PartDefinition | undefined {
  return PARTS_CATALOG.find((p) => p.id === id)
}

export function isValidPartId(id: string): boolean {
  return PARTS_CATALOG.some((p) => p.id === id)
}

export function getPartsByType(type: PartType): readonly PartDefinition[] {
  return PARTS_CATALOG.filter((p) => p.type === type)
}

/**
 * Rectangular bounding-box view of a part used by the physics/footprint layer.
 * width = stud cells along X (rot=0), length = stud cells along Z (rot=0).
 * height = vertical extent in plate units (1 brick = 3 plates).
 */
export interface PartDef {
  width: number
  length: number
  height: number
  hasTopStuds: boolean
}

export type PartCatalog = Record<string, PartDef>

function boundingBox(footprint: PartDefinition['footprint']): {
  width: number
  length: number
} {
  let width = 0
  let length = 0
  for (const [x, z] of footprint) {
    width = Math.max(width, x + 1)
    length = Math.max(length, z + 1)
  }
  return { width, length }
}

/**
 * Record keyed by part id exposing the bounding-box dimensions consumed by the
 * physics modules (graph/balance/collapse). Derived from {@link PARTS_CATALOG}
 * so the two views never drift apart.
 */
export const PART_CATALOG: PartCatalog = Object.fromEntries(
  PARTS_CATALOG.map((part) => {
    const { width, length } = boundingBox(part.footprint)
    return [
      part.id,
      {
        width,
        length,
        height: part.height,
        hasTopStuds: part.type !== 'tile',
      },
    ]
  }),
)
