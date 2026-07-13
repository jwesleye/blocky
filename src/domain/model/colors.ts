export {
  COLOR_PALETTE as BRICK_COLORS,
  colorDefSchema,
  type ColorDef as BrickColor,
  type ColorId,
} from '../parts/colors'
import { getColorDef } from '../parts'
import type { ColorDef } from '../parts/colors'

export const DEFAULT_COLOR_ID = 'red'

export function getBrickColor(id: string): ColorDef | undefined {
  return getColorDef(id)
}

export function isValidColorId(id: string): boolean {
  return getColorDef(id) !== undefined
}

export function resolveBrickColorHex(id: string): string {
  return getBrickColor(id)?.hex ?? getBrickColor(DEFAULT_COLOR_ID)!.hex
}
