export {
  PART_CATALOG,
  partDefSchema,
  type PartDef,
  type PartCategory,
} from './catalog'
export {
  COLOR_PALETTE,
  colorDefSchema,
  type ColorDef,
  type ColorId,
} from './colors'

import { PART_CATALOG } from './catalog'
import { COLOR_PALETTE } from './colors'
import type { PartDef } from './catalog'
import type { ColorDef, ColorId } from './colors'

const _partById = new Map<string, PartDef>(PART_CATALOG.map((p) => [p.id, p]))
const _colorById = new Map<string, ColorDef>(
  COLOR_PALETTE.map((c) => [c.id, c]),
)

export function getPartDef(partId: string): PartDef | undefined {
  return _partById.get(partId)
}

export function getColorDef(colorId: ColorId | string): ColorDef | undefined {
  return _colorById.get(colorId)
}
