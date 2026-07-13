import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SOUND_EFFECTS_ENABLED_KEY,
  createSoundEffectsController,
  isSoundEffectsEnabled,
  setSoundEffectsEnabled,
  subscribeToSoundEffectsEnabled,
  playSoundEffect,
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

  describe('global default controller functions', () => {
    // We need to restore the global state after these tests
    // since the default controller is a singleton
    let originalEnabled: boolean

    beforeEach(() => {
      originalEnabled = isSoundEffectsEnabled()
    })

    afterEach(() => {
      setSoundEffectsEnabled(originalEnabled)
    })

    it('isSoundEffectsEnabled and setSoundEffectsEnabled work correctly', () => {
      setSoundEffectsEnabled(false)
      expect(isSoundEffectsEnabled()).toBe(false)
      expect(localStorage.getItem(SOUND_EFFECTS_ENABLED_KEY)).toBe('false')

      setSoundEffectsEnabled(true)
      expect(isSoundEffectsEnabled()).toBe(true)
      expect(localStorage.getItem(SOUND_EFFECTS_ENABLED_KEY)).toBe('true')
    })

    it('subscribeToSoundEffectsEnabled notifies on changes', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeToSoundEffectsEnabled(listener)

      setSoundEffectsEnabled(false)
      expect(listener).toHaveBeenCalledWith(false)

      unsubscribe()
    })

    it('playSoundEffect executes without throwing', () => {
      expect(() => playSoundEffect('place')).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('handles localStorage access errors safely', () => {
      const originalLocalStorage = Object.getOwnPropertyDescriptor(
        window,
        'localStorage',
      )
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('SecurityError')
        },
        configurable: true,
      })

      const controller = createSoundEffectsController()
      expect(controller.isEnabled()).toBe(true)

      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage)
      }
    })

    it('handles AudioContext creation errors safely', () => {
      const originalAudioContext = window.AudioContext
      window.AudioContext = function () {
        throw new Error('NotAllowedError')
      } as unknown as typeof AudioContext

      const controller = createSoundEffectsController()
      expect(() => controller.play('place')).not.toThrow()

      window.AudioContext = originalAudioContext
    })

    it('handles storage read and write errors safely', () => {
      const badStorage = {
        getItem: () => {
          throw new Error('QuotaExceeded')
        },
        setItem: () => {
          throw new Error('QuotaExceeded')
        },
      }

      const controller = createSoundEffectsController({
        storage: badStorage as unknown as Storage,
      })
      expect(controller.isEnabled()).toBe(true)
      expect(() => controller.setEnabled(false)).not.toThrow()
    })

    it('handles play errors safely', () => {
      const badAudioContext = {
        ...createFakeAudioContext(),
        createOscillator: () => {
          throw new Error('Failed to create oscillator')
        },
      }
      const controller = createSoundEffectsController({
        createAudioContext: () => badAudioContext as unknown as AudioContext,
      })
      expect(() => controller.play('place')).not.toThrow()
    })

    it('handles play execution safely when audio context initialization yields null', () => {
      // Provide an initializer that simply returns null
      const controller = createSoundEffectsController({
        createAudioContext: () => null,
      })
      expect(() => controller.play('place')).not.toThrow()
    })

    it('handles play execution safely when audio context resume fails', () => {
      const badAudioContext = {
        ...createFakeAudioContext(),
        resume: () => Promise.reject(new Error('Resume failed')),
      }
      const controller = createSoundEffectsController({
        createAudioContext: () => badAudioContext as unknown as AudioContext,
      })
      // Since the resume is voided and not awaited, it shouldn't throw synchronously
      expect(() => controller.play('place')).not.toThrow()
    })
  })

  describe('browser environment checks', () => {
    const originalWindow = global.window

    beforeEach(() => {
      // Restore global.window before each test in case a previous test broke it
      global.window = originalWindow
    })

    afterAll(() => {
      // Ensure global.window is fully restored when all tests are done
      global.window = originalWindow
    })

    it('handles missing window securely (undefined typeof)', () => {
      // JSDOM prevents true deletion of window, so we temporarily override
      // the global properties to trigger the branch in getBrowserStorage and getBrowserAudioContext
      const windowSpy = vi
        .spyOn(globalThis, 'window', 'get')
        .mockReturnValue(undefined as unknown as Window & typeof globalThis)

      const controller = createSoundEffectsController()

      // Storage falls back to null, readEnabled defaults to true
      expect(controller.isEnabled()).toBe(true)
      // Calling play without window shouldn't throw
      expect(() => controller.play('place')).not.toThrow()

      windowSpy.mockRestore()

      // Also hit the branch for catch blocks by throwing in getItem
      const errStorage = {
        getItem: () => {
          throw new Error()
        },
        setItem: () => {},
      }
      const windowSpy2 = vi
        .spyOn(globalThis, 'window', 'get')
        .mockReturnValue({ localStorage: errStorage } as unknown as Window &
          typeof globalThis)
      createSoundEffectsController()
      windowSpy2.mockRestore()
    })

    it('handles missing AudioContext and webkitAudioContext securely', () => {
      const originalWindow = global.window
      const windowCopy = { ...originalWindow }
      delete (windowCopy as Record<string, unknown>).AudioContext
      delete (windowCopy as Record<string, unknown>).webkitAudioContext

      global.window = windowCopy as unknown as Window & typeof globalThis

      const controller = createSoundEffectsController()
      expect(() => controller.play('place')).not.toThrow()

      global.window = originalWindow
    })
  })
})
