export {
  COLOR_PALETTE as BRICK_COLORS,
  colorDefSchema,
  type ColorDef as BrickColor,
  type ColorId,
} from '../parts/colors'
import { COLOR_PALETTE } from '../parts/colors'
import type { ColorDef } from '../parts/colors'

export const DEFAULT_COLOR_ID = 'red'

export function getBrickColor(id: string): ColorDef | undefined {
  return COLOR_PALETTE.find((c) => c.id === id)
}

const VALID_COLOR_IDS = new Set(COLOR_PALETTE.map((c) => c.id))

export function isValidColorId(id: string): boolean {
  return VALID_COLOR_IDS.has(id)
}

export function resolveBrickColorHex(id: string): string {
  return getBrickColor(id)?.hex ?? getBrickColor(DEFAULT_COLOR_ID)!.hex
}
