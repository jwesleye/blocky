import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  loadScenePresetPreference,
  saveScenePresetPreference,
} from '@/domain/persistence/scenePresetPreference'
import { useScenePresetPreference } from '@/hooks/useScenePresetPreference'
import { useSceneSettingsStore } from '@/state/sceneSettings'

vi.mock('@/domain/persistence/scenePresetPreference', () => ({
  loadScenePresetPreference: vi.fn(),
  saveScenePresetPreference: vi.fn(),
}))

describe('useScenePresetPreference', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSceneSettingsStore.setState({
      selectedPresetId: 'studio', // Using a default value to avoid state pollution
    })
  })

  it('loads the preset preference on mount and hydrates', () => {
    vi.mocked(loadScenePresetPreference).mockReturnValue('studio')

    renderHook(() => useScenePresetPreference())

    expect(loadScenePresetPreference).toHaveBeenCalledTimes(1)
    expect(useSceneSettingsStore.getState().selectedPresetId).toBe('studio')
  })

  it('saves the preset preference when the selected preset changes after hydration', () => {
    vi.mocked(loadScenePresetPreference).mockReturnValue('daylight')

    renderHook(() => useScenePresetPreference())

    // On mount, it should load 'daylight' and hydrate
    expect(loadScenePresetPreference).toHaveBeenCalledTimes(1)
    expect(useSceneSettingsStore.getState().selectedPresetId).toBe('daylight')

    // At this point, saveScenePresetPreference should have been called during hydration
    // because the selected preset id changed to 'daylight' and hydration became true
    expect(saveScenePresetPreference).toHaveBeenCalledWith('daylight')

    vi.clearAllMocks() // Clear mock calls

    // Change the preset id
    act(() => {
      useSceneSettingsStore.getState().setSelectedPresetId('night')
    })

    expect(saveScenePresetPreference).toHaveBeenCalledTimes(1)
    expect(saveScenePresetPreference).toHaveBeenCalledWith('night')
  })

  it('does not save preference before hydration', () => {
    vi.mocked(loadScenePresetPreference).mockReturnValue('studio')

    // Set some state before running hook
    useSceneSettingsStore.setState({
      selectedPresetId: 'night',
    })

    renderHook(() => useScenePresetPreference())

    // In our implementation, hydration is instantaneous inside useEffect.
    // However, we verify it only saves the loaded preset and doesn't get called twice
    // accidentally.
    expect(saveScenePresetPreference).toHaveBeenCalledTimes(1)
    expect(saveScenePresetPreference).toHaveBeenCalledWith('studio')
  })
})
