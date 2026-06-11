import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { EnvironmentPresetPicker } from '@/components/EnvironmentPresetPicker'
import {
  DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
  SCENE_ENVIRONMENT_PRESETS,
} from '@/scene/environmentPresets'
import { useSceneSettingsStore } from '@/state/sceneSettings'

describe('EnvironmentPresetPicker', () => {
  beforeEach(() => {
    useSceneSettingsStore.setState({
      selectedPresetId: DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
    })
  })

  it('renders an accessible option for every preset', () => {
    render(<EnvironmentPresetPicker />)

    for (const preset of SCENE_ENVIRONMENT_PRESETS) {
      expect(
        screen.getByRole('radio', { name: preset.name }),
      ).toBeInTheDocument()
    }
  })

  it('marks the selected preset as checked', () => {
    useSceneSettingsStore.getState().setSelectedPresetId('daylight')

    render(<EnvironmentPresetPicker />)

    expect(screen.getByRole('radio', { name: 'Daylight' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('radio', { name: 'Night' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('updates selection on click', () => {
    render(<EnvironmentPresetPicker />)

    fireEvent.click(screen.getByRole('radio', { name: 'Night' }))

    expect(useSceneSettingsStore.getState().selectedPresetId).toBe('night')
  })

  it('supports arrow-key selection', () => {
    render(<EnvironmentPresetPicker />)

    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' })

    expect(useSceneSettingsStore.getState().selectedPresetId).toBe('daylight')
  })
})
