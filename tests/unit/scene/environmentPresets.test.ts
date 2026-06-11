import { describe, expect, it } from 'vitest'

import { BRICK_COLORS } from '@/domain/model/colors'
import { contrastRatio } from '@/lib/contrast'
import {
  DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
  SCENE_ENVIRONMENT_PRESETS,
  getSceneEnvironmentPreset,
  isReadableBrickColorOnPreset,
  isSceneEnvironmentPresetId,
} from '@/scene/environmentPresets'

const cssHex = /^#[0-9A-Fa-f]{6}$/

describe('scene environment presets', () => {
  it('exposes multiple named presets and a valid default id', () => {
    expect(SCENE_ENVIRONMENT_PRESETS.length).toBeGreaterThanOrEqual(3)
    expect(
      isSceneEnvironmentPresetId(DEFAULT_SCENE_ENVIRONMENT_PRESET_ID),
    ).toBe(true)

    const ids = new Set(SCENE_ENVIRONMENT_PRESETS.map((preset) => preset.id))
    expect(ids.size).toBe(SCENE_ENVIRONMENT_PRESETS.length)
    for (const preset of SCENE_ENVIRONMENT_PRESETS) {
      expect(preset.name).toEqual(expect.any(String))
      expect(preset.name.length).toBeGreaterThan(0)
    }
  })

  it('falls back to the default preset for unknown ids', () => {
    expect(getSceneEnvironmentPreset('not-real').id).toBe(
      DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
    )
  })

  it('uses valid colors and positive light intensities', () => {
    for (const preset of SCENE_ENVIRONMENT_PRESETS) {
      expect(preset.backgroundColor).toMatch(cssHex)
      expect(preset.groundColor).toMatch(cssHex)
      expect(preset.hemisphereGroundColor).toMatch(cssHex)
      expect(preset.ambientIntensity).toBeGreaterThan(0)
      expect(preset.hemisphereIntensity).toBeGreaterThan(0)
      expect(preset.keyLight.intensity).toBeGreaterThan(0)
      expect(preset.keyLight.color).toMatch(cssHex)
      expect(preset.fillLight.intensity).toBeGreaterThan(0)
      expect(preset.fillLight.color).toMatch(cssHex)
    }
  })

  it('keeps every supported brick color readable against preset surfaces', () => {
    for (const preset of SCENE_ENVIRONMENT_PRESETS) {
      for (const color of BRICK_COLORS) {
        expect(isReadableBrickColorOnPreset(color.hex, preset)).toBe(true)
        expect(
          Math.max(
            contrastRatio(color.hex, preset.backgroundColor),
            contrastRatio(color.hex, preset.groundColor),
          ),
        ).toBeGreaterThanOrEqual(1.35)
      }
    }
  })
})
