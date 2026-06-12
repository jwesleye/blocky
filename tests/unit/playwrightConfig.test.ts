// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import playwrightConfig from '../../playwright.config'
import perfConfig from '../../playwright.perf.config'

type PackageJson = {
  scripts?: Record<string, string>
}

const PACKAGE_PATH = join(process.cwd(), 'package.json')
const LOAD_PERF_POSIX = 'tests/perf/load-perf.spec.ts'
const LOAD_PERF_WIN = 'tests\\perf\\load-perf.spec.ts'
const WEBGL2_E2E = 'tests/e2e/webgl2.spec.ts'

const readPackageJson = (): PackageJson =>
  JSON.parse(readFileSync(PACKAGE_PATH, 'utf-8')) as PackageJson

function matchesTestIgnore(testIgnore: unknown, path: string): boolean {
  if (testIgnore == null) return false
  const patterns = Array.isArray(testIgnore) ? testIgnore : [testIgnore]
  return patterns.some((p) => {
    if (p instanceof RegExp) return p.test(path)
    if (typeof p === 'string') return p === path
    return false
  })
}

describe('playwright e2e defaults (issue #191)', () => {
  it('uses the preview server instead of the Vite dev server', () => {
    expect(playwrightConfig.workers).toBe(4)
    expect(playwrightConfig.use?.baseURL).toBe('http://localhost:4174')
    expect(playwrightConfig.webServer).toMatchObject({
      command:
        'npm run build -- --mode e2e && npm run preview -- --host localhost --port 4174',
      url: 'http://localhost:4174',
      timeout: 120_000,
    })
  })

  it('always starts a fresh server (issue #303)', () => {
    expect(playwrightConfig.webServer).toMatchObject({
      reuseExistingServer: false,
    })
  })

  it('does not run playwright install before test:e2e (issue #479)', () => {
    const pkg = readPackageJson()
    expect(pkg.scripts?.['pretest:e2e']).toBeUndefined()
    expect(pkg.scripts?.['test:e2e']).toBe('playwright test')
  })
})

describe('playwright.config.ts default matrix', () => {
  it('defines chromium, firefox, webkit, and tablet projects', () => {
    const names = playwrightConfig.projects?.map((p) => p.name) ?? []
    expect(names).toContain('chromium')
    expect(names).toContain('firefox')
    expect(names).toContain('webkit')
    expect(names).toContain('tablet')
  })

  it('testMatch selects only e2e specs, not perf specs (issue #479)', () => {
    const testMatch = playwrightConfig.testMatch
    expect(testMatch).toBeDefined()
    const patterns = Array.isArray(testMatch) ? testMatch : [testMatch]
    const strings = patterns.map((p) =>
      p instanceof RegExp ? p.source : String(p),
    )
    expect(strings.some((s) => s.includes('e2e'))).toBe(true)
    expect(strings.every((s) => !s.includes('perf'))).toBe(true)
  })

  it('no project has testIgnore for perf specs — perf is excluded at suite level (issue #479)', () => {
    for (const project of playwrightConfig.projects ?? []) {
      expect(
        matchesTestIgnore(project.testIgnore, LOAD_PERF_POSIX),
        `project "${project.name}" should not testIgnore load-perf`,
      ).toBe(false)
      expect(
        matchesTestIgnore(project.testIgnore, LOAD_PERF_WIN),
        `project "${project.name}" should not testIgnore load-perf`,
      ).toBe(false)
    }
  })

  describe('no project suppresses e2e specs', () => {
    const allProjects = ['chromium', 'firefox', 'webkit', 'tablet'] as const

    for (const projectName of allProjects) {
      it(`${projectName}: testIgnore does not suppress E2E spec ${WEBGL2_E2E}`, () => {
        const project = playwrightConfig.projects?.find(
          (p) => p.name === projectName,
        )
        expect(project, `project "${projectName}" not found`).toBeDefined()
        expect(matchesTestIgnore(project!.testIgnore, WEBGL2_E2E)).toBe(false)
      })
    }
  })
})

describe('playwright.perf.config.ts fresh server (issue #303)', () => {
  it('always starts a fresh server', () => {
    expect(perfConfig.webServer).toMatchObject({
      reuseExistingServer: false,
    })
  })
})

describe('playwright.perf.config.ts dedicated perf matrix', () => {
  it('has exactly one project: chromium', () => {
    expect(perfConfig.projects).toHaveLength(1)
    expect(perfConfig.projects![0].name).toBe('chromium')
  })

  it('testMatch targets load-perf.spec.ts', () => {
    const testMatch = perfConfig.testMatch
    expect(testMatch).toBeDefined()
    const pattern = Array.isArray(testMatch) ? testMatch[0] : testMatch
    if (pattern instanceof RegExp) {
      expect(pattern.test('load-perf.spec.ts')).toBe(true)
    } else {
      expect(String(pattern)).toContain('load-perf')
    }
  })
})
