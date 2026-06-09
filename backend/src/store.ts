import type { SharedBuildPayload } from './validation.js'
import type { ReportRecord, ReportRequest } from './moderation.js'
import { buildReportRecord } from './moderation.js'

const builds = new Map<string, SharedBuildPayload>()
const deleted = new Set<string>()
const reports = new Map<string, ReportRecord[]>()

let counter = 0

export function generateBuildId(): string {
  counter += 1
  return `build_${Date.now().toString(36)}_${counter.toString(36)}`
}

export function storeBuild(payload: SharedBuildPayload): void {
  builds.set(payload.buildId, payload)
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

export function deleteBuild(id: string, requesterUserId: string): DeleteResult {
  const payload = builds.get(id)
  if (!payload) {
    return { success: false, reason: 'not-found' }
  }
  if (payload.gallery.author.identityMode !== 'authenticated') {
    return { success: false, reason: 'unauthorized' }
  }
  if (payload.gallery.author.userId !== requesterUserId) {
    return { success: false, reason: 'unauthorized' }
  }
  builds.delete(id)
  deleted.add(id)
  return { success: true }
}

export function addReport(buildId: string, request: ReportRequest): void {
  const record = buildReportRecord(buildId, request)
  const existing = reports.get(buildId) ?? []
  existing.push(record)
  reports.set(buildId, existing)
}

export function getReports(buildId: string): ReportRecord[] {
  return reports.get(buildId) ?? []
}

export function clearStore(): void {
  builds.clear()
  deleted.clear()
  reports.clear()
  counter = 0
}
