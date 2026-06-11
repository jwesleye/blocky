import { create } from 'zustand'

import {
  DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
  isSceneEnvironmentPresetId,
  type SceneEnvironmentPresetId,
} from '@/scene/environmentPresets'

export interface SceneSettingsState {
  selectedPresetId: SceneEnvironmentPresetId
  setSelectedPresetId: (presetId: string) => void
}

export const useSceneSettingsStore = create<SceneSettingsState>((set) => ({
  selectedPresetId: DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
  setSelectedPresetId: (presetId) =>
    set({
      selectedPresetId: isSceneEnvironmentPresetId(presetId)
        ? presetId
        : DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
    }),
}))
