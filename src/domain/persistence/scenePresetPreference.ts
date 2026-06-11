import type { KeyValueStorage } from '@/domain/persistence/autosave'
import {
  DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
  isSceneEnvironmentPresetId,
  type SceneEnvironmentPresetId,
} from '@/scene/environmentPresets'

export const SCENE_PRESET_STORAGE_KEY = 'blocky.scene.environmentPreset.v1'

const defaultStorage = (): KeyValueStorage | null => {
  try {
    if (typeof localStorage !== 'undefined') return localStorage
  } catch {
    // Storage access can throw in sandboxed browser contexts.
  }
  return null
}

export const saveScenePresetPreference = (
  presetId: SceneEnvironmentPresetId,
  storage: KeyValueStorage | null = defaultStorage(),
): boolean => {
  if (!storage) return false
  try {
    storage.setItem(SCENE_PRESET_STORAGE_KEY, presetId)
    return true
  } catch {
    return false
  }
}

export const loadScenePresetPreference = (
  storage: KeyValueStorage | null = defaultStorage(),
): SceneEnvironmentPresetId => {
  if (!storage) return DEFAULT_SCENE_ENVIRONMENT_PRESET_ID
  try {
    const value = storage.getItem(SCENE_PRESET_STORAGE_KEY)
    return value && isSceneEnvironmentPresetId(value)
      ? value
      : DEFAULT_SCENE_ENVIRONMENT_PRESET_ID
  } catch {
    return DEFAULT_SCENE_ENVIRONMENT_PRESET_ID
  }
}

export const clearScenePresetPreference = (
  storage: KeyValueStorage | null = defaultStorage(),
): void => {
  if (!storage) return
  try {
    storage.removeItem(SCENE_PRESET_STORAGE_KEY)
  } catch {
    // Clearing a UI preference is best-effort.
  }
}
