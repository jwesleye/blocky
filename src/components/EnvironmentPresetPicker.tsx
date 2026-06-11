import { useRef } from 'react'

import { SCENE_ENVIRONMENT_PRESETS } from '@/scene/environmentPresets'
import { useSceneSettingsStore } from '@/state/sceneSettings'

export function EnvironmentPresetPicker() {
  const selectedPresetId = useSceneSettingsStore((s) => s.selectedPresetId)
  const setSelectedPresetId = useSceneSettingsStore(
    (s) => s.setSelectedPresetId,
  )
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const count = SCENE_ENVIRONMENT_PRESETS.length
    const idx = SCENE_ENVIRONMENT_PRESETS.findIndex(
      (preset) => preset.id === selectedPresetId,
    )
    let nextIdx = idx

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault()
        nextIdx = (idx + 1) % count
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault()
        nextIdx = (idx - 1 + count) % count
        break
      case 'Home':
        e.preventDefault()
        nextIdx = 0
        break
      case 'End':
        e.preventDefault()
        nextIdx = count - 1
        break
      default:
        return
    }

    if (nextIdx !== idx) {
      setSelectedPresetId(SCENE_ENVIRONMENT_PRESETS[nextIdx].id)
      btnRefs.current[nextIdx]?.focus()
    }
  }

  return (
    <div
      className="environment-preset-picker"
      role="radiogroup"
      aria-label="Environment preset"
      onKeyDown={handleKeyDown}
    >
      {SCENE_ENVIRONMENT_PRESETS.map((preset, i) => {
        const selected = preset.id === selectedPresetId
        return (
          <button
            key={preset.id}
            ref={(el) => {
              btnRefs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`environment-preset-btn${selected ? ' environment-preset-btn--selected' : ''}`}
            data-preset-id={preset.id}
            data-testid={`environment-preset-${preset.id}`}
            onClick={() => setSelectedPresetId(preset.id)}
          >
            {preset.name}
          </button>
        )
      })}
    </div>
  )
}
