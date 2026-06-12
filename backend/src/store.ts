import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { randomBytes } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import type { SharedBuildPayload } from './validation.js'
import type { ReportRecord, ReportRequest } from './moderation.js'
import { buildReportRecord } from './moderation.js'

export const MAX_STORED_BUILDS = 1000
const STORE_VERSION = 1
const DEFAULT_DATA_DIR = resolve('backend/.gallery-data')
const STORE_FILE_NAME = 'store.json'

const builds = new Map<string, SharedBuildPayload>()
const deleted = new Set<string>()
const reports = new Map<string, ReportRecord[]>()

interface PersistedStore {
  version: number
  builds: SharedBuildPayload[]
  deleted: string[]
  reports: Record<string, ReportRecord[]>
}

function getStoreFilePath(): string {
  const dataDir = process.env['GALLERY_DATA_DIR']
    ? resolve(process.env['GALLERY_DATA_DIR'])
    : DEFAULT_DATA_DIR
  return join(dataDir, STORE_FILE_NAME)
}

function snapshotStore(): PersistedStore {
  return {
    version: STORE_VERSION,
    builds: Array.from(builds.values()),
    deleted: Array.from(deleted),
    reports: Object.fromEntries(reports.entries()),
  }
}

function hydrateStore(state: PersistedStore): void {
  builds.clear()
  deleted.clear()
  reports.clear()

  for (const payload of state.builds) {
    builds.set(payload.buildId, payload)
  }
  for (const buildId of state.deleted) {
    deleted.add(buildId)
  }
  for (const [buildId, reportEntries] of Object.entries(state.reports)) {
    reports.set(buildId, reportEntries)
  }
}

function emptyStore(): void {
  builds.clear()
  deleted.clear()
  reports.clear()
}

function persistStore(): void {
  const storeFile = getStoreFilePath()
  mkdirSync(dirname(storeFile), { recursive: true })

  const tempFile = `${storeFile}.tmp`
  writeFileSync(tempFile, JSON.stringify(snapshotStore()), 'utf8')
  renameSync(tempFile, storeFile)
}

export function reloadStore(): void {
  const storeFile = getStoreFilePath()
  if (!existsSync(storeFile)) {
    emptyStore()
    return
  }

  try {
    const parsed = JSON.parse(readFileSync(storeFile, 'utf8')) as PersistedStore
    hydrateStore(parsed)
  } catch (err) {
    console.error(
      '[store] failed to parse store file, starting with empty state:',
      err,
    )
    emptyStore()
  }
}

/**
 * Generates an unguessable build id from 128 bits of cryptographic entropy.
 *
 * `unlisted` builds are hidden from listings but loadable by direct id, so the
 * id is the only thing protecting them. A high-entropy random token (rather than
 * a sequential counter) keeps neighbouring ids from being derived or enumerated.
 */
export function generateBuildId(): string {
  let candidate: string
  do {
    candidate = `build_${randomBytes(16).toString('base64url')}`
  } while (builds.has(candidate) || deleted.has(candidate))
  return candidate
}

export function storeBuild(payload: SharedBuildPayload): void {
  builds.set(payload.buildId, payload)
  if (builds.size > MAX_STORED_BUILDS) {
    const oldestBuildId = builds.keys().next().value
    if (oldestBuildId !== undefined) {
      builds.delete(oldestBuildId)
      reports.delete(oldestBuildId)
    }
  }
  persistStore()
}

export function getBuild(id: string): SharedBuildPayload | undefined {
  return builds.get(id)
}

export function isBuildDeleted(id: string): boolean {
  return deleted.has(id)
}

export function listBuilds(): SharedBuildPayload[] {
  return Array.from(builds.values())
}

/**
 * Builds discoverable through `GET /builds`: only `public` builds are listed.
 * `unlisted` builds remain loadable by direct id but are hidden from listings,
 * and tombstoned (deleted) builds are already absent from the `builds` map.
 */
export function listDiscoverableBuilds(): SharedBuildPayload[] {
  return Array.from(builds.values()).filter(
    (payload) => payload.gallery.visibility === 'public',
  )
}

export type DeleteResult =
  | { success: true }
  | { success: false; reason: 'not-found' | 'unauthorized' }

export interface AuthenticatedPrincipal {
  userId: string
}

export function deleteBuild(
  id: string,
  principal?: AuthenticatedPrincipal,
): DeleteResult {
  const payload = builds.get(id)
  if (!payload) {
    return { success: false, reason: 'not-found' }
  }
  if (!principal) {
    return { success: false, reason: 'unauthorized' }
  }
  if (payload.gallery.author.identityMode !== 'authenticated') {
    return { success: false, reason: 'unauthorized' }
  }
  if (payload.gallery.author.userId !== principal.userId) {
    return { success: false, reason: 'unauthorized' }
  }
  builds.delete(id)
  deleted.add(id)
  while (deleted.size > MAX_STORED_BUILDS) {
    const oldestDeletedId = deleted.values().next().value
    if (oldestDeletedId === undefined) {
      break
    }
    deleted.delete(oldestDeletedId)
  }
  persistStore()
  return { success: true }
}

export function addReport(buildId: string, request: ReportRequest): void {
  const record = buildReportRecord(buildId, request)
  const existing = reports.get(buildId) ?? []
  existing.push(record)
  reports.set(buildId, existing)
  persistStore()
}

export function getReports(buildId: string): ReportRecord[] {
  return reports.get(buildId) ?? []
}

export function clearStore(): void {
  emptyStore()
  rmSync(getStoreFilePath(), { force: true })
}

reloadStore()
