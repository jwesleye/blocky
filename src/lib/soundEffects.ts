export type SoundEffectName = 'place' | 'delete' | 'collapse'

export const SOUND_EFFECTS_ENABLED_KEY = 'blocky.soundEffects.enabled.v1'

type SoundEffectsListener = (enabled: boolean) => void

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

type AudioParamLike = {
  setValueAtTime(value: number, startTime: number): void
  exponentialRampToValueAtTime(value: number, endTime: number): void
  linearRampToValueAtTime(value: number, endTime: number): void
}

type OscillatorLike = {
  type: OscillatorType
  frequency: AudioParamLike
  connect(node: unknown): void
  start(when?: number): void
  stop(when?: number): void
}

type GainNodeLike = {
  gain: AudioParamLike
  connect(node: unknown): void
}

type AudioContextLike = {
  currentTime: number
  destination: unknown
  resume?: () => Promise<void>
  createOscillator(): OscillatorLike
  createGain(): GainNodeLike
}

type SoundProfile = {
  frequency: number
  durationMs: number
  gain: number
  type: OscillatorType
}

type SoundEffectsControllerOptions = {
  createAudioContext?: (() => AudioContextLike | null) | null
  storage?: StorageLike | null
}

type WindowWithWebkitAudioContext = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

export type SoundEffectsController = {
  isEnabled(): boolean
  setEnabled(enabled: boolean): void
  subscribe(listener: SoundEffectsListener): () => void
  play(effect: SoundEffectName): void
}

const SOUND_PROFILES: Record<SoundEffectName, SoundProfile> = {
  place: {
    frequency: 660,
    durationMs: 0.06 * 1000,
    gain: 0.035,
    type: 'triangle',
  },
  delete: {
    frequency: 220,
    durationMs: 0.09 * 1000,
    gain: 0.04,
    type: 'sawtooth',
  },
  collapse: {
    frequency: 140,
    durationMs: 0.18 * 1000,
    gain: 0.05,
    type: 'square',
  },
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getBrowserAudioContext(): AudioContextLike | null {
  if (typeof window === 'undefined') return null

  const AudioContextCtor =
    window.AudioContext ??
    (window as WindowWithWebkitAudioContext).webkitAudioContext
  if (!AudioContextCtor) return null

  try {
    return new AudioContextCtor()
  } catch {
    return null
  }
}

function readEnabled(storage: StorageLike | null): boolean {
  if (!storage) return true

  try {
    return storage.getItem(SOUND_EFFECTS_ENABLED_KEY) !== 'false'
  } catch {
    return true
  }
}

export function createSoundEffectsController(
  options: SoundEffectsControllerOptions = {},
): SoundEffectsController {
  const storage = options.storage ?? getBrowserStorage()
  const createAudioContext =
    options.createAudioContext ?? getBrowserAudioContext
  const listeners = new Set<SoundEffectsListener>()

  let enabled = readEnabled(storage)
  let audioContext: AudioContextLike | null = null

  const ensureAudioContext = () => {
    if (audioContext) return audioContext
    audioContext = createAudioContext?.() ?? null
    return audioContext
  }

  return {
    isEnabled: () => enabled,

    setEnabled(nextEnabled) {
      enabled = nextEnabled
      try {
        storage?.setItem(SOUND_EFFECTS_ENABLED_KEY, String(nextEnabled))
      } catch {
        // Storage failures must not affect editing actions or UI interaction.
      }
      listeners.forEach((listener) => listener(enabled))
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    play(effect) {
      if (!enabled) return

      const context = ensureAudioContext()
      if (!context) return

      try {
        void context.resume?.().catch(() => undefined)

        const profile = SOUND_PROFILES[effect]
        const oscillator = context.createOscillator()
        const gainNode = context.createGain()
        const now = context.currentTime
        const durationSeconds = profile.durationMs / 1000

        oscillator.type = profile.type
        oscillator.frequency.setValueAtTime(profile.frequency, now)
        gainNode.gain.setValueAtTime(0.0001, now)
        gainNode.gain.exponentialRampToValueAtTime(profile.gain, now + 0.01)
        gainNode.gain.linearRampToValueAtTime(0.0001, now + durationSeconds)

        oscillator.connect(gainNode)
        gainNode.connect(context.destination)
        oscillator.start(now)
        oscillator.stop(now + durationSeconds)
      } catch {
        // Autoplay policy or Web Audio failures should silently degrade.
      }
    },
  }
}

const defaultController = createSoundEffectsController()

export function isSoundEffectsEnabled() {
  return defaultController.isEnabled()
}

export function setSoundEffectsEnabled(enabled: boolean) {
  defaultController.setEnabled(enabled)
}

export function subscribeToSoundEffectsEnabled(listener: SoundEffectsListener) {
  return defaultController.subscribe(listener)
}

export function playSoundEffect(effect: SoundEffectName) {
  defaultController.play(effect)
}
