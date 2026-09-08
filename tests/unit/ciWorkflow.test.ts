// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8')

describe('CI delivery gates', () => {
  it('validates the production bundle after the existing quality gates', () => {
    for (const command of ['typecheck', 'lint', 'test', 'build']) {
      expect(workflow).toContain(`run: npm run ${command}`)
    }
    expect(workflow.indexOf('run: npm run build')).toBeGreaterThan(
      workflow.indexOf('run: npm run test'),
    )
  })

  it('uses the same checked-in Node version for both jobs', () => {
    expect(readFileSync('.nvmrc', 'utf8').trim()).toBe('22.22.0')
    expect(workflow.match(/node-version-file: '.nvmrc'/g)).toHaveLength(2)
  })

  it('runs Chromium E2E tests and keeps failure reports', () => {
    expect(workflow).toContain('npx playwright install --with-deps chromium')
    expect(workflow).toContain('npm run test:e2e -- --project=chromium')
    expect(workflow).toContain('uses: actions/upload-artifact@v4')
    expect(workflow).toContain('if: failure()')
    expect(workflow).toContain('playwright-report/')
    expect(workflow).not.toContain('continue-on-error: true')
  })
})
