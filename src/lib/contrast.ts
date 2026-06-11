export const HUD_COLORS = {
  buttonBackground: '#f8fafc',
  buttonText: '#111827',
  icon: '#111827',
} as const

const normalizeHex = (hex: string) => {
  const clean = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new Error(`Invalid hex color: ${hex}`)
  }
  return clean
}

const channelToLinear = (channel: number) => {
  const value = channel / 255
  return value <= 0.03928
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4)
}

export const relativeLuminance = (hex: string) => {
  const clean = normalizeHex(hex)
  const red = channelToLinear(parseInt(clean.slice(0, 2), 16))
  const green = channelToLinear(parseInt(clean.slice(2, 4), 16))
  const blue = channelToLinear(parseInt(clean.slice(4, 6), 16))

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export const contrastRatio = (foreground: string, background: string) => {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  )
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  )

  return (lighter + 0.05) / (darker + 0.05)
}
