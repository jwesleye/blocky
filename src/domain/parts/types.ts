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
  hasTopStuds: z.boolean(),
})

export type PartDef = z.infer<typeof partDefSchema>
