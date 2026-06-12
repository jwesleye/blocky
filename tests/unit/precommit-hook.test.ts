import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const HOOK_PATH = join(ROOT, '.husky/pre-commit')
const PRE_PUSH_PATH = join(ROOT, '.husky/pre-push')
const PACKAGE_PATH = join(ROOT, 'package.json')

type PackageJson = {
  scripts?: Record<string, string>
  devDependencies?: Record<string, string>
  'lint-staged'?: Record<string, string | string[]>
}

const readPackageJson = (): PackageJson =>
  JSON.parse(readFileSync(PACKAGE_PATH, 'utf-8')) as PackageJson

describe('husky pre-commit hook (issue #293)', () => {
  describe('.husky/pre-commit', () => {
    it('exists', () => {
      expect(existsSync(HOOK_PATH), '.husky/pre-commit not found').toBe(true)
    })

    it('runs lint-staged and typecheck', () => {
      const hook = readFileSync(HOOK_PATH, 'utf-8')
      expect(hook).toMatch(/lint-staged/)
      expect(hook).toMatch(/typecheck/)
    })

    it('has a failure message for lint-staged', () => {
      const hook = readFileSync(HOOK_PATH, 'utf-8')
      expect(
        hook,
        'pre-commit hook must print a clear error when lint-staged fails',
      ).toMatch(
        /lint-staged.*fail|fail.*lint-staged|pre-commit.*fail|lint.*fail/i,
      )
    })

    it('has a failure message for typecheck', () => {
      const hook = readFileSync(HOOK_PATH, 'utf-8')
      expect(
        hook,
        'pre-commit hook must print a clear error when typecheck fails',
      ).toMatch(/typecheck.*fail|fail.*typecheck|type.*check.*fail/i)
    })
  })

  describe('.husky/pre-push (issue #469)', () => {
    it('exists', () => {
      expect(existsSync(PRE_PUSH_PATH), '.husky/pre-push not found').toBe(true)
    })

    it('runs npm run test', () => {
      const hook = readFileSync(PRE_PUSH_PATH, 'utf-8')
      expect(hook, 'pre-push hook must run npm run test').toMatch(
        /npm run test/,
      )
    })

    it('has a failure message for test failures', () => {
      const hook = readFileSync(PRE_PUSH_PATH, 'utf-8')
      expect(
        hook,
        'pre-push hook must print a clear error when tests fail',
      ).toMatch(/test.*fail|fail.*test|pre-push.*fail/i)
    })
  })

  describe('package.json wiring', () => {
    it('declares husky and lint-staged as dev dependencies', () => {
      const pkg = readPackageJson()
      expect(pkg.devDependencies?.husky).toBeDefined()
      expect(pkg.devDependencies?.['lint-staged']).toBeDefined()
    })

    it('has a prepare script that runs husky', () => {
      const pkg = readPackageJson()
      expect(pkg.scripts?.prepare).toBe('husky')
    })

    it('configures lint-staged with eslint and prettier entries', () => {
      const pkg = readPackageJson()
      const config = pkg['lint-staged']
      expect(config, 'lint-staged config block missing').toBeDefined()

      const entries = Object.entries(config ?? {})
      const commands = entries.map(([, value]) =>
        Array.isArray(value) ? value.join(' ') : String(value),
      )

      const hasTsEslint = entries.some(
        ([pattern, value]) =>
          /ts,?\s*tsx/.test(pattern) &&
          (Array.isArray(value) ? value.join(' ') : String(value)).includes(
            'eslint',
          ),
      )
      expect(hasTsEslint, 'expected an eslint entry for *.{ts,tsx}').toBe(true)
      expect(
        commands.some((command) => command.includes('prettier')),
        'expected a prettier entry',
      ).toBe(true)
    })
  })
})
