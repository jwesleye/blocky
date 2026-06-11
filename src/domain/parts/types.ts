import { z } from 'zod'

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
