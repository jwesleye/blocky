import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SOUND_EFFECTS_ENABLED_KEY,
  createSoundEffectsController,
} from '@/lib/soundEffects'

type FakeAudioParam = {
  setValueAtTime: (value: number, startTime: number) => void
  exponentialRampToValueAtTime: (value: number, endTime: number) => void
  linearRampToValueAtTime: (value: number, endTime: number) => void
}

type FakeAudioContext = ReturnType<typeof createFakeAudioContext>

function createFakeAudioParam(): FakeAudioParam {
  return {
    setValueAtTime: vi.fn<(value: number, startTime: number) => void>(),
    exponentialRampToValueAtTime:
      vi.fn<(value: number, endTime: number) => void>(),
    linearRampToValueAtTime: vi.fn<(value: number, endTime: number) => void>(),
  }
}

function createFakeAudioContext() {
  const frequency = createFakeAudioParam()
  const gain = createFakeAudioParam()
  const oscillator = {
    type: 'sine' as OscillatorType,
    frequency,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  const gainNode = {
    gain,
    connect: vi.fn(),
  }

  return {
    currentTime: 1,
    destination: { name: 'destination' },
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gainNode),
    oscillator,
    gainNode,
  }
}

describe('soundEffects', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('defaults to enabled and persists toggles under the stable storage key', () => {
    const controller = createSoundEffectsController()

    expect(controller.isEnabled()).toBe(true)

    controller.setEnabled(false)
    expect(controller.isEnabled()).toBe(false)
    expect(localStorage.getItem(SOUND_EFFECTS_ENABLED_KEY)).toBe('false')

    controller.setEnabled(true)
    expect(localStorage.getItem(SOUND_EFFECTS_ENABLED_KEY)).toBe('true')
  })

  it('creates its AudioContext lazily only when an enabled sound is played', () => {
    const createAudioContext = vi.fn(createFakeAudioContext)
    const controller = createSoundEffectsController({ createAudioContext })

    expect(createAudioContext).not.toHaveBeenCalled()

    controller.play('place')

    expect(createAudioContext).toHaveBeenCalledTimes(1)
  })

  it('does not create or use audio when muted', () => {
    const createAudioContext = vi.fn(createFakeAudioContext)
    const controller = createSoundEffectsController({ createAudioContext })
    controller.setEnabled(false)

    controller.play('collapse')

    expect(createAudioContext).not.toHaveBeenCalled()
  })

  it('plays each named effect path with oscillator output', () => {
    const contexts: FakeAudioContext[] = []
    const controller = createSoundEffectsController({
      createAudioContext: () => {
        const context = createFakeAudioContext()
        contexts.push(context)
        return context
      },
    })

    controller.play('place')
    controller.play('delete')
    controller.play('collapse')

    expect(contexts).toHaveLength(1)
    expect(contexts[0].createOscillator).toHaveBeenCalledTimes(3)
    expect(contexts[0].createGain).toHaveBeenCalledTimes(3)
    expect(contexts[0].oscillator.start).toHaveBeenCalledTimes(3)
    expect(contexts[0].oscillator.stop).toHaveBeenCalledTimes(3)
  })
})
