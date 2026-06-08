import { PartCategory, partDefSchema, type PartCatalog, type PartDef } from './types'

export type { PartCatalog, PartDef } from './types'

function createPartDef(
  id: string,
  category: PartCategory,
  widthX: number,
  widthZ: number,
  heightY: number,
  hasTopStuds: boolean,
): PartDef {
  return partDefSchema.parse({ id, category, widthX, widthZ, heightY, hasTopStuds })
}

const B = (id: string, widthX: number, widthZ: number): PartDef =>
  createPartDef(id, PartCategory.brick, widthX, widthZ, 3, true)
const P = (id: string, widthX: number, widthZ: number): PartDef =>
  createPartDef(id, PartCategory.plate, widthX, widthZ, 1, true)
const T = (id: string, widthX: number, widthZ: number): PartDef =>
  createPartDef(id, PartCategory.tile, widthX, widthZ, 1, false)
const S = (id: string, widthX: number, widthZ: number): PartDef =>
  createPartDef(id, PartCategory.slope, widthX, widthZ, 3, true)
const R = (
  id: string,
  widthX: number,
  widthZ: number,
  heightY: number,
  hasTopStuds: boolean,
): PartDef => createPartDef(id, PartCategory.round, widthX, widthZ, heightY, hasTopStuds)

export const PART_CATALOG: PartCatalog = {
  'brick-1x1': B('brick-1x1', 1, 1),
  'brick-1x2': B('brick-1x2', 1, 2),
  'brick-1x3': B('brick-1x3', 1, 3),
  'brick-1x4': B('brick-1x4', 1, 4),
  'brick-1x6': B('brick-1x6', 1, 6),
  'brick-1x8': B('brick-1x8', 1, 8),
  'brick-2x2': B('brick-2x2', 2, 2),
  'brick-2x3': B('brick-2x3', 2, 3),
  'brick-2x4': B('brick-2x4', 2, 4),
  'brick-2x6': B('brick-2x6', 2, 6),
  'brick-2x8': B('brick-2x8', 2, 8),
  'plate-1x1': P('plate-1x1', 1, 1),
  'plate-1x2': P('plate-1x2', 1, 2),
  'plate-1x4': P('plate-1x4', 1, 4),
  'plate-2x2': P('plate-2x2', 2, 2),
  'plate-2x4': P('plate-2x4', 2, 4),
  'plate-2x6': P('plate-2x6', 2, 6),
  'plate-2x8': P('plate-2x8', 2, 8),
  'tile-1x1': T('tile-1x1', 1, 1),
  'tile-1x2': T('tile-1x2', 1, 2),
  'tile-2x2': T('tile-2x2', 2, 2),
  'tile-2x4': T('tile-2x4', 2, 4),
  'slope-2x1': S('slope-2x1', 2, 1),
  'slope-2x2': S('slope-2x2', 2, 2),
  'slope-corner': S('slope-corner', 2, 2),
  'slope-inverted': S('slope-inverted', 2, 1),
  'round-brick-1x1': R('round-brick-1x1', 1, 1, 3, true),
  'round-plate-1x1': R('round-plate-1x1', 1, 1, 1, true),
  'cone-1x1': R('cone-1x1', 1, 1, 3, false),
}
