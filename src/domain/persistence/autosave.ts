import { safeParseBuild, serializeBuild } from '@/domain/model/build'
import type { Build } from '@/domain/model/build'

/**
 * Minimal subset of the Web Storage API used for persistence. Accepting this
 * interface (rather than reaching for `localStorage` directly) keeps the module
 * pure and testable, and lets callers inject alternative backends.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** localStorage key under which the autosaved build is stored. */
export const AUTOSAVE_STORAGE_KEY = 'blocky.build.autosave.v1'

/**
 * Resolve the default storage backend. Returns `null` when `localStorage` is
 * unavailable or access throws (private mode, disabled storage, SSR), so
 * callers degrade gracefully instead of crashing.
 */
const defaultStorage = (): KeyValueStorage | null => {
  try {
    if (typeof localStorage !== 'undefined') return localStorage
  } catch {
    // Accessing localStorage can throw in some sandboxed contexts.
  }
  return null
}

/**
 * Persist a build to storage.
 *
 * The build is validated and serialized *before* any write, and the write is a
 * single atomic `setItem`. If validation, serialization, or the write fails we
 * return `false` without touching storage — guaranteeing a save never corrupts
 * or partially overwrites the previously persisted build (PRD §10).
 */
export const saveBuild = (
  build: Build,
  storage: KeyValueStorage | null = defaultStorage(),
): boolean => {
  if (!storage) return false
  let payload: string
  try {
    payload = serializeBuild(build)
  } catch {
    return false
  }
  try {
    storage.setItem(AUTOSAVE_STORAGE_KEY, payload)
    return true
  } catch {
    return false
  }
}

/**
 * Load the autosaved build, or `null` if nothing is saved or the stored data is
 * missing/corrupted. Never throws.
 */
export const loadBuild = (
  storage: KeyValueStorage | null = defaultStorage(),
): Build | null => {
  if (!storage) return null
  let raw: string | null
  try {
    raw = storage.getItem(AUTOSAVE_STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) return null
  return safeParseBuild(raw)
}

/** Remove the autosaved build from storage. Never throws. */
export const clearBuild = (
  storage: KeyValueStorage | null = defaultStorage(),
): void => {
  if (!storage) return
  try {
    storage.removeItem(AUTOSAVE_STORAGE_KEY)
  } catch {
    // Nothing to recover; clearing is best-effort.
  }
}

export interface AutosaverOptions {
  /** Storage backend (defaults to localStorage). */
  storage?: KeyValueStorage | null
  /** Debounce window in milliseconds before a scheduled build is written. */
  delayMs?: number
}

export interface Autosaver {
  /** Queue a build to be saved after the debounce window. */
  schedule(build: Build): void
  /** Immediately save the pending build (if any). Returns whether a save ran. */
  flush(): boolean
  /** Discard any pending save. */
  cancel(): void
}

const DEFAULT_AUTOSAVE_DELAY_MS = 500

/**
 * Create a debounced autosaver: rapid edits coalesce into a single write of the
 * latest build once the build stops changing for `delayMs`. Intended to be
 * driven by the model store on every change.
 */
export const createAutosaver = (options: AutosaverOptions = {}): Autosaver => {
  const storage =
    options.storage === undefined ? defaultStorage() : options.storage
  const delayMs = options.delayMs ?? DEFAULT_AUTOSAVE_DELAY_MS

  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: Build | null = null

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  const cancel = (): void => {
    clearTimer()
    pending = null
  }

  const flush = (): boolean => {
    clearTimer()
    if (pending === null) return false
    const build = pending
    pending = null
    return saveBuild(build, storage)
  }

  const schedule = (build: Build): void => {
    pending = build
    clearTimer()
    timer = setTimeout(() => {
      timer = null
      const toSave = pending
      pending = null
      if (toSave !== null) saveBuild(toSave, storage)
    }, delayMs)
  }

  return { schedule, flush, cancel }
}
