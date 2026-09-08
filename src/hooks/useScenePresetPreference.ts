import { useEffect, useState } from 'react'

import {
  loadScenePresetPreference,
  saveScenePresetPreference,
} from '@/domain/persistence/scenePresetPreference'
import { useSceneSettingsStore } from '@/state/sceneSettings'

export function useScenePresetPreference() {
  const selectedPresetId = useSceneSettingsStore((s) => s.selectedPresetId)
  const setSelectedPresetId = useSceneSettingsStore(
    (s) => s.setSelectedPresetId,
  )
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setSelectedPresetId(loadScenePresetPreference())
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount hydration flag, not a render loop
    setHydrated(true)
  }, [setSelectedPresetId])

  useEffect(() => {
    if (!hydrated) return
    saveScenePresetPreference(selectedPresetId)
  }, [hydrated, selectedPresetId])
}
