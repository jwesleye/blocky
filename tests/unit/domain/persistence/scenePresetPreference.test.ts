import { describe, expect, it } from 'vitest'

import type { KeyValueStorage } from '@/domain/persistence/autosave'
import {
  SCENE_PRESET_STORAGE_KEY,
  clearScenePresetPreference,
  loadScenePresetPreference,
  saveScenePresetPreference,
} from '@/domain/persistence/scenePresetPreference'
import { DEFAULT_SCENE_ENVIRONMENT_PRESET_ID } from '@/scene/environmentPresets'

function memoryStorage(): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

describe('scene preset preference persistence', () => {
  it('saves and loads a selected preset id', () => {
    const storage = memoryStorage()

    expect(saveScenePresetPreference('night', storage)).toBe(true)

    expect(storage.map.get(SCENE_PRESET_STORAGE_KEY)).toBe('night')
    expect(loadScenePresetPreference(storage)).toBe('night')
  })

  it('falls back to the default preset for missing or invalid values', () => {
    const storage = memoryStorage()
    expect(loadScenePresetPreference(storage)).toBe(
      DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
    )

    storage.map.set(SCENE_PRESET_STORAGE_KEY, 'not-real')
    expect(loadScenePresetPreference(storage)).toBe(
      DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
    )
  })

  it('clears the saved preference without throwing', () => {
    const storage = memoryStorage()
    saveScenePresetPreference('daylight', storage)

    clearScenePresetPreference(storage)

    expect(storage.map.has(SCENE_PRESET_STORAGE_KEY)).toBe(false)
  })

  it('degrades gracefully when storage is unavailable or throws', () => {
    expect(saveScenePresetPreference('studio', null)).toBe(false)
    expect(loadScenePresetPreference(null)).toBe(
      DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
    )

    const throwing: KeyValueStorage = {
      getItem: () => {
        throw new DOMException('blocked')
      },
      setItem: () => {
        throw new DOMException('blocked')
      },
      removeItem: () => {
        throw new DOMException('blocked')
      },
    }

    expect(saveScenePresetPreference('studio', throwing)).toBe(false)
    expect(loadScenePresetPreference(throwing)).toBe(
      DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
    )
    expect(() => clearScenePresetPreference(throwing)).not.toThrow()
  })
})
