export interface BrickColor {
  id: string
  name: string
  hex: string
}

export const BRICK_COLORS: readonly BrickColor[] = [
  { id: 'red', name: 'Red', hex: '#C4282B' },
  { id: 'blue', name: 'Blue', hex: '#0057A6' },
  { id: 'yellow', name: 'Yellow', hex: '#F5CD2F' },
  { id: 'green', name: 'Green', hex: '#237841' },
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  { id: 'black', name: 'Black', hex: '#1B1B1B' },
  { id: 'light-gray', name: 'Light Gray', hex: '#A0A5A9' },
  { id: 'dark-gray', name: 'Dark Gray', hex: '#6C6E68' },
  { id: 'brown', name: 'Brown', hex: '#7B4F2E' },
  { id: 'orange', name: 'Orange', hex: '#FE8A18' },
  { id: 'tan', name: 'Tan', hex: '#E4CD9E' },
  { id: 'lime', name: 'Lime', hex: '#BBE90B' },
  { id: 'azure', name: 'Azure', hex: '#078BC9' },
  { id: 'magenta', name: 'Magenta', hex: '#C0006B' },
] as const

export const DEFAULT_COLOR_ID = 'red'

export function getBrickColor(id: string): BrickColor | undefined {
  return BRICK_COLORS.find((c) => c.id === id)
}

export function isValidColorId(id: string): boolean {
  return BRICK_COLORS.some((c) => c.id === id)
}
