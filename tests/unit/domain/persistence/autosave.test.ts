import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  AUTOSAVE_STORAGE_KEY,
  clearBuild,
  createAutosaver,
  loadBuild,
  saveBuild,
} from '@/domain/persistence/autosave'
import type { KeyValueStorage } from '@/domain/persistence/autosave'
import { BUILD_SCHEMA_VERSION, createEmptyBuild } from '@/domain/model/build'
import type { Build } from '@/domain/model/build'
import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'

function memoryStorage(): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v)
    },
    removeItem: (k) => {
      map.delete(k)
    },
  }
}

const buildWith = (color: string): Build => ({
  version: BUILD_SCHEMA_VERSION,
  baseplate: { size: BASEPLATE_SIZE_STUDS },
  bricks: [{ partId: 'brick-1x1', color, x: 0, y: 0, z: 0, rot: 0 }],
})

describe('saveBuild / loadBuild', () => {
  it('round-trips a build (reload restores it)', () => {
    const storage = memoryStorage()
    const build = buildWith('red')
    expect(saveBuild(build, storage)).toBe(true)
    expect(loadBuild(storage)).toEqual(build)
  })

  it('returns null when nothing has been saved', () => {
    expect(loadBuild(memoryStorage())).toBeNull()
  })

  it('returns null (does not throw) when stored data is corrupted', () => {
    const storage = memoryStorage()
    storage.map.set(AUTOSAVE_STORAGE_KEY, 'not-valid-json{')
    expect(loadBuild(storage)).toBeNull()
  })

  it('returns null when stored JSON fails schema validation', () => {
    const storage = memoryStorage()
    storage.map.set(
      AUTOSAVE_STORAGE_KEY,
      JSON.stringify({ version: 1, bricks: 'nope' }),
    )
    expect(loadBuild(storage)).toBeNull()
  })
})

describe('saveBuild never corrupts an existing good save', () => {
  it('refuses to write an invalid build and preserves the previous save', () => {
    const storage = memoryStorage()
    const good = buildWith('green')
    expect(saveBuild(good, storage)).toBe(true)

    // A structurally-invalid build must be rejected without touching storage.
    const invalid = {
      version: 1,
      baseplate: { size: 32 },
      bricks: [{ bad: true }],
    }
    expect(saveBuild(invalid as unknown as Build, storage)).toBe(false)

    expect(loadBuild(storage)).toEqual(good)
  })

  it('leaves the previous save intact when the storage write throws (e.g. quota)', () => {
    const storage = memoryStorage()
    const good = buildWith('blue')
    expect(saveBuild(good, storage)).toBe(true)

    const throwing: KeyValueStorage = {
      getItem: storage.getItem,
      setItem: () => {
        throw new DOMException('QuotaExceededError')
      },
      removeItem: storage.removeItem,
    }
    expect(saveBuild(buildWith('orange'), throwing)).toBe(false)
    expect(loadBuild(storage)).toEqual(good)
  })

  it('returns false when no storage is available', () => {
    expect(saveBuild(createEmptyBuild(), null)).toBe(false)
  })
})

describe('clearBuild', () => {
  it('removes the persisted build', () => {
    const storage = memoryStorage()
    saveBuild(buildWith('red'), storage)
    clearBuild(storage)
    expect(loadBuild(storage)).toBeNull()
  })
})

describe('default localStorage integration', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('persists to and restores from the real localStorage', () => {
    const build = buildWith('yellow')
    expect(saveBuild(build)).toBe(true)
    expect(loadBuild()).toEqual(build)
  })
})

describe('createAutosaver', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('debounces rapid changes and persists only the latest build', () => {
    const storage = memoryStorage()
    const autosaver = createAutosaver({ storage, delayMs: 100 })

    autosaver.schedule(buildWith('red'))
    autosaver.schedule(buildWith('green'))
    autosaver.schedule(buildWith('blue'))
    // Nothing written until the debounce window elapses.
    expect(loadBuild(storage)).toBeNull()

    vi.advanceTimersByTime(100)
    expect(loadBuild(storage)).toEqual(buildWith('blue'))
  })

  it('flush() persists the pending build immediately', () => {
    const storage = memoryStorage()
    const autosaver = createAutosaver({ storage, delayMs: 1000 })
    autosaver.schedule(buildWith('green'))
    expect(autosaver.flush()).toBe(true)
    expect(loadBuild(storage)).toEqual(buildWith('green'))
  })

  it('cancel() drops a pending save', () => {
    const storage = memoryStorage()
    const autosaver = createAutosaver({ storage, delayMs: 100 })
    autosaver.schedule(buildWith('red'))
    autosaver.cancel()
    vi.advanceTimersByTime(100)
    expect(loadBuild(storage)).toBeNull()
  })

  it('flush() with no pending change is a no-op', () => {
    const storage = memoryStorage()
    const autosaver = createAutosaver({ storage, delayMs: 100 })
    expect(autosaver.flush()).toBe(false)
  })
})
