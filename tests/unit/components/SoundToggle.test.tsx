import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { SoundToggle } from '@/components/SoundToggle'
import {
  isSoundEffectsEnabled,
  setSoundEffectsEnabled,
} from '@/lib/soundEffects'

describe('SoundToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    setSoundEffectsEnabled(true)
  })

  it('reflects the persisted enabled state on initial render', () => {
    setSoundEffectsEnabled(false)

    render(<SoundToggle />)

    expect(
      screen.getByRole('button', { name: 'Enable sound effects' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggles the persisted preference and accessible labeling', () => {
    render(<SoundToggle />)

    const button = screen.getByRole('button', { name: 'Disable sound effects' })
    expect(button).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(button)

    expect(isSoundEffectsEnabled()).toBe(false)
    expect(
      screen.getByRole('button', { name: 'Enable sound effects' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })
})
