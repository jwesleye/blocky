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
      selectedPresetId: 'studio',
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

    expect(loadScenePresetPreference).toHaveBeenCalledTimes(1)
    expect(useSceneSettingsStore.getState().selectedPresetId).toBe('daylight')

    expect(saveScenePresetPreference).toHaveBeenCalledWith('daylight')

    vi.clearAllMocks()

    act(() => {
      useSceneSettingsStore.getState().setSelectedPresetId('night')
    })

    expect(saveScenePresetPreference).toHaveBeenCalledTimes(1)
    expect(saveScenePresetPreference).toHaveBeenCalledWith('night')
  })

  it('does not save preference before hydration', () => {
    vi.mocked(loadScenePresetPreference).mockReturnValue('studio')

    useSceneSettingsStore.setState({
      selectedPresetId: 'night',
    })

    renderHook(() => useScenePresetPreference())

    expect(saveScenePresetPreference).toHaveBeenCalledTimes(1)
    expect(saveScenePresetPreference).toHaveBeenCalledWith('studio')
  })
})
