import { z } from 'zod'

export enum PartCategory {
  brick = 'brick',
  plate = 'plate',
  tile = 'tile',
  slope = 'slope',
  round = 'round',
  baseplate = 'baseplate',
}

export const partDefSchema = z.object({
  id: z.string(),
  category: z.nativeEnum(PartCategory),
  widthX: z.number(),
  widthZ: z.number(),
  heightY: z.number(),
export const partCategorySchema = z.enum([
  'brick',
  'plate',
  'tile',
  'slope',
  'round',
  'baseplate',
])

export type PartCategory = z.infer<typeof partCategorySchema>

export const partDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: partCategorySchema,
  widthX: z.number().int().positive(),
  widthZ: z.number().int().positive(),
  heightY: z.number().int().positive(),
  hasTopStuds: z.boolean(),
})

export type PartDef = z.infer<typeof partDefSchema>

export type PartCatalog = Record<string, PartDef>
