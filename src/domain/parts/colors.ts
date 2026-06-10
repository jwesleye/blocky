import { z } from 'zod'

export const colorDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
})

export type ColorDef = z.infer<typeof colorDefSchema>
export type ColorId = ColorDef['id']

export const COLOR_PALETTE: readonly ColorDef[] = [
  { id: 'red', label: 'Red', hex: '#C4282B' },
  { id: 'blue', label: 'Blue', hex: '#0057A6' },
  { id: 'yellow', label: 'Yellow', hex: '#F5CD2F' },
  { id: 'green', label: 'Green', hex: '#237841' },
  { id: 'white', label: 'White', hex: '#FFFFFF' },
  { id: 'black', label: 'Black', hex: '#1B1B1B' },
  { id: 'light-gray', label: 'Light Gray', hex: '#A0A5A9' },
  { id: 'dark-gray', label: 'Dark Gray', hex: '#6C6E68' },
  { id: 'brown', label: 'Brown', hex: '#7B4F2E' },
  { id: 'orange', label: 'Orange', hex: '#FE8A18' },
  { id: 'tan', label: 'Tan', hex: '#E4CD9E' },
  { id: 'lime', label: 'Lime', hex: '#BBE90B' },
  { id: 'azure', label: 'Azure', hex: '#078BC9' },
  { id: 'magenta', label: 'Magenta', hex: '#C0006B' },
]
