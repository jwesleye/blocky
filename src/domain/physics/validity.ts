import type { PlacedBrick } from '@/domain/model/types'
import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import { CATALOG_BY_ID, type PartCatalog } from '@/domain/parts/catalog'
import { canPlaceGroup } from './transform'

export function isValidPlacement(
  ghost: PlacedBrick,
  placed: PlacedBrick[],
  catalog: PartCatalog = CATALOG_BY_ID,
  baseplateSize: number = BASEPLATE_SIZE_STUDS,
): boolean {
  return canPlaceGroup([ghost], placed, catalog, baseplateSize)
}
