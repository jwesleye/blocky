import { useEffect, useState } from 'react'

import {
  isSoundEffectsEnabled,
  setSoundEffectsEnabled,
  subscribeToSoundEffectsEnabled,
} from '@/lib/soundEffects'

export function SoundToggle() {
  const [enabled, setEnabled] = useState(() => isSoundEffectsEnabled())

  useEffect(() => subscribeToSoundEffectsEnabled(setEnabled), [])

  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? 'Disable sound effects' : 'Enable sound effects'}
      data-testid="sound-toggle"
      onClick={() => setSoundEffectsEnabled(!enabled)}
      style={{ width: '100%', padding: '6px 8px', cursor: 'pointer' }}
    >
      Sound: {enabled ? 'On' : 'Off'}
    </button>
  )
}
