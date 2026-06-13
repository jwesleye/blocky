import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
)

const pickersCss = readFileSync(
  path.join(repoRoot, 'src/styles/pickers.css'),
  'utf8',
)

const partAndColorPickerRules = pickersCss.slice(
  pickersCss.indexOf('/* Color picker */'),
  pickersCss.indexOf('/* Baseplate size picker */'),
)

describe('picker token styling', () => {
  it('keeps part and color picker chrome on the shared design tokens', () => {
    for (const token of [
      '--color-muted',
      '--color-panel',
      '--color-text',
      '--color-line',
      '--color-grid',
      '--color-focus',
    ]) {
      expect(partAndColorPickerRules).toContain(token)
    }
  })

  it('uses grid and focus tokens for the selected swatch ring', () => {
    expect(partAndColorPickerRules).toMatch(
      /\.color-swatch--selected\s*\{[^}]*border-color:\s*var\(--color-grid\)/s,
    )
    expect(partAndColorPickerRules).toMatch(
      /\.color-swatch--selected\s*\{[^}]*outline:\s*2px solid var\(--color-focus\)/s,
    )
  })

  it('does not reintroduce legacy hardcoded picker chrome hexes', () => {
    for (const legacyHex of [
      '#888',
      '#4a9eff',
      '#1a3a5c',
      '#2a2a2a',
      '#fff',
      '#333',
      '#555',
      '#e0e0e0',
      '#3a3a3a',
    ]) {
      expect(partAndColorPickerRules.toLowerCase()).not.toContain(legacyHex)
    }
  })
})
