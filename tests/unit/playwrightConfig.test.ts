// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import defaultConfig from '../../playwright.config'
import perfConfig from '../../playwright.perf.config'

const LOAD_PERF_POSIX = 'tests/perf/load-perf.spec.ts'
const LOAD_PERF_WIN = 'tests\\perf\\load-perf.spec.ts'
const WEBGL2_E2E = 'tests/e2e/webgl2.spec.ts'

type PackageJson = {
  scripts?: Record<string, string>
}

const PACKAGE_PATH = join(process.cwd(), 'package.json')

const readPackageJson = (): PackageJson =>
  JSON.parse(readFileSync(PACKAGE_PATH, 'utf-8')) as PackageJson

function matchesTestIgnore(testIgnore: unknown, path: string): boolean {
  if (testIgnore == null) return false
  const patterns = Array.isArray(testIgnore) ? testIgnore : [testIgnore]
  return patterns.some(p => {
    if (p instanceof RegExp) return p.test(path)
    if (typeof p === 'string') return p === path
    return false
  })
}

describe('playwright e2e defaults (issue #191)', () => {
  it('uses the preview server instead of the Vite dev server', () => {
    expect(defaultConfig.workers).toBe(4)
    expect(defaultConfig.use?.baseURL).toBe('http://127.0.0.1:4174')
    expect(defaultConfig.webServer).toMatchObject({
      command:
        'npm run build -- --mode e2e && npm run preview -- --host 127.0.0.1 --port 4174',
      url: 'http://127.0.0.1:4174',
      timeout: 120_000,
    })
  })

  it('installs Playwright browsers before test:e2e runs', () => {
    const pkg = readPackageJson()
    expect(pkg.scripts?.['pretest:e2e']).toBe('playwright install')
    expect(pkg.scripts?.['test:e2e']).toBe('playwright test')
  })
})

describe('playwright.config.ts default matrix', () => {
  it('defines chromium, firefox, webkit, and tablet projects', () => {
    const names = defaultConfig.projects?.map(p => p.name) ?? []
    expect(names).toContain('chromium')
    expect(names).toContain('firefox')
    expect(names).toContain('webkit')
    expect(names).toContain('tablet')
  })

  it('chromium project does not exclude load-perf.spec.ts', () => {
    const chromium = defaultConfig.projects?.find(p => p.name === 'chromium')
    expect(matchesTestIgnore(chromium?.testIgnore, LOAD_PERF_POSIX)).toBe(false)
    expect(matchesTestIgnore(chromium?.testIgnore, LOAD_PERF_WIN)).toBe(false)
  })

  describe('firefox, webkit, and tablet exclude the CDP-only load-perf spec', () => {
    const nonChromiumProjects = ['firefox', 'webkit', 'tablet'] as const

    for (const projectName of nonChromiumProjects) {
      it(`${projectName}: testIgnore matches POSIX path ${LOAD_PERF_POSIX}`, () => {
        const project = defaultConfig.projects?.find(p => p.name === projectName)
        expect(project, `project "${projectName}" not found`).toBeDefined()
        expect(matchesTestIgnore(project!.testIgnore, LOAD_PERF_POSIX)).toBe(true)
      })

      it(`${projectName}: testIgnore matches Windows path ${LOAD_PERF_WIN}`, () => {
        const project = defaultConfig.projects?.find(p => p.name === projectName)
        expect(project, `project "${projectName}" not found`).toBeDefined()
        expect(matchesTestIgnore(project!.testIgnore, LOAD_PERF_WIN)).toBe(true)
      })

      it(`${projectName}: testIgnore does not suppress E2E spec ${WEBGL2_E2E}`, () => {
        const project = defaultConfig.projects?.find(p => p.name === projectName)
        expect(matchesTestIgnore(project?.testIgnore, WEBGL2_E2E)).toBe(false)
      })
    }
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
