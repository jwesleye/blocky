import type { PlacedBrick } from '@/domain/model/types'
import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import { CATALOG_BY_ID, type PartCatalog } from '@/domain/parts/catalog'
import { canPlaceGroup } from './transform'
import { isUnsupportedHingeGrammar } from './hinge'

export function isValidPlacement(
  ghost: PlacedBrick,
  placed: PlacedBrick[],
  catalog: PartCatalog = CATALOG_BY_ID,
  baseplateSize: number = BASEPLATE_SIZE_STUDS,
): boolean {
  return getPlacementValidity(ghost, placed, catalog, baseplateSize).valid
}

export type PlacementInvalidReason = 'unsupported-hinge' | 'invalid-placement'
export type PlacementValidity =
  { valid: true } | { valid: false; reason: PlacementInvalidReason }

export function getPlacementValidity(
  ghost: PlacedBrick,
  placed: PlacedBrick[],
  catalog: PartCatalog = CATALOG_BY_ID,
  baseplateSize: number = BASEPLATE_SIZE_STUDS,
): PlacementValidity {
  if (canPlaceGroup([ghost], placed, catalog, baseplateSize))
    return { valid: true }

  // Explain an elevated hinge, or a rigid brick whose only support would be
  // a hinge. Unrelated hinges must not relabel ordinary invalid placements.
  const unsupported =
    (isUnsupportedHingeGrammar(ghost) && ghost.y > 0) ||
    (placed.some(isUnsupportedHingeGrammar) &&
      canPlaceGroup(
        [ghost],
        placed.map((brick) => ({ ...brick, hinge: undefined })),
        catalog,
        baseplateSize,
      ))
  return {
    valid: false,
    reason: unsupported ? 'unsupported-hinge' : 'invalid-placement',
  }
}
