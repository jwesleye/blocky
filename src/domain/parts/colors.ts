import { z } from 'zod'

export const colorDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
})

export type ColorDef = z.infer<typeof colorDefSchema>
export type ColorId = ColorDef['id']

export const COLOR_PALETTE: readonly ColorDef[] = [
  { id: 'red', label: 'Red', hex: '#c4281b' },
  { id: 'blue', label: 'Blue', hex: '#0d5ec4' },
  { id: 'yellow', label: 'Yellow', hex: '#f5c518' },
  { id: 'green', label: 'Green', hex: '#237841' },
  { id: 'white', label: 'White', hex: '#f4f4f4' },
  { id: 'black', label: 'Black', hex: '#1b1b1b' },
  { id: 'light-gray', label: 'Light Gray', hex: '#a0a5a9' },
  { id: 'dark-gray', label: 'Dark Gray', hex: '#6c6e68' },
  { id: 'brown', label: 'Brown', hex: '#694228' },
  { id: 'orange', label: 'Orange', hex: '#fe8a18' },
  { id: 'tan', label: 'Tan', hex: '#e4cd9e' },
  { id: 'lime', label: 'Lime', hex: '#bbe90b' },
  { id: 'azure', label: 'Azure', hex: '#1e90c4' },
  { id: 'magenta', label: 'Magenta', hex: '#c8308a' },
]
