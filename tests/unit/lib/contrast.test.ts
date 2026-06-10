import { describe, expect, it } from 'vitest'

import { HUD_COLORS, contrastRatio } from '@/lib/contrast'

describe('contrastRatio', () => {
  it('computes the WCAG contrast ratio for black and white', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1)
  })

  it('keeps HUD controls above WCAG AA contrast thresholds', () => {
    expect(
      contrastRatio(HUD_COLORS.buttonText, HUD_COLORS.buttonBackground),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrastRatio(HUD_COLORS.icon, HUD_COLORS.buttonBackground),
    ).toBeGreaterThanOrEqual(3)
  })
})
