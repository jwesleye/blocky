// @vitest-environment node
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const originalCwd = process.cwd()

afterEach(() => {
  process.chdir(originalCwd)
  vi.resetModules()
})

describe('playwright.perf.config.ts', () => {
  it('anchors the preview server cwd to the config file checkout', async () => {
    process.chdir(os.tmpdir())
    vi.resetModules()

    const imported = await import('../../../playwright.perf.config')
    const webServer = Array.isArray(imported.default.webServer)
      ? imported.default.webServer[0]
      : imported.default.webServer

    expect(webServer).toBeDefined()
    expect(webServer?.cwd).toBeDefined()
    expect(path.resolve(webServer?.cwd ?? '')).toBe(path.resolve(repoRoot))
  })
})
