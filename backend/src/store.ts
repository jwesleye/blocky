import type { SharedBuildPayload } from './validation.js'

const builds = new Map<string, SharedBuildPayload>()

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

export function listBuilds(): SharedBuildPayload[] {
  return Array.from(builds.values())
}
