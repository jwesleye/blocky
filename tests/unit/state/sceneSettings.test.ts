import { describe, expect, it } from 'vitest'
import Graph from 'graphology'

import type { PlacedBrick } from '@/domain/model/types'
import { DEFAULT_SCENE_ENVIRONMENT_PRESET_ID } from '@/scene/environmentPresets'
import { useSceneSettingsStore } from '@/state/sceneSettings'
import { type BuildStoreWithTemporal, useBuildStore } from '@/state/store'

const seedBrick: PlacedBrick = {
  id: 'seed-brick',
  partId: 'brick-2x4',
  color: 'red',
  x: 0,
  y: 0,
  z: 0,
  rot: 0,
}

const resetBuildStore = () => {
  const temporal = (
    useBuildStore as unknown as BuildStoreWithTemporal
  ).temporal.getState()
  temporal.pause()
  useBuildStore.setState({
    bricks: { [seedBrick.id]: seedBrick },
    selection: new Set<string>(),
    connectionGraph: new Graph({ type: 'undirected', allowSelfLoops: false }),
    lastCollapse: null,
    baseplateSize: 32,
    activeCollapse: null,
  })
  temporal.clear()
  temporal.resume()
}

describe('scene settings store', () => {
  it('defaults to the default scene preset', () => {
    useSceneSettingsStore.setState({
      selectedPresetId: DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
    })

    expect(useSceneSettingsStore.getState().selectedPresetId).toBe(
      DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
    )
  })

  it('updates the selected preset without mutating build data', () => {
    resetBuildStore()
    const beforeBricks = useBuildStore.getState().bricks

    useSceneSettingsStore.getState().setSelectedPresetId('night')

    expect(useSceneSettingsStore.getState().selectedPresetId).toBe('night')
    expect(useBuildStore.getState().bricks).toBe(beforeBricks)
  })

  it('falls back to the default preset for invalid ids', () => {
    useSceneSettingsStore.getState().setSelectedPresetId('invalid')

    expect(useSceneSettingsStore.getState().selectedPresetId).toBe(
      DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
    )
  })
})
