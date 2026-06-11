import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
)

const ARTIFACTS = [
  'dist',
  'build',
  'coverage',
  'playwright-report',
  'test-results',
  '.vite',
  '.cache',
  'logs',
  'tmp',
] as const

const CONFIG_FILES = {
  '.gitignore': '.gitignore',
  '.prettierignore': '.prettierignore',
  'eslint.config.js': 'eslint.config.js',
} as const

describe('toolchain artifact ignore sync', () => {
  for (const [label, relativePath] of Object.entries(CONFIG_FILES)) {
    describe(label, () => {
      const content = readFileSync(path.join(repoRoot, relativePath), 'utf8')

      for (const artifact of ARTIFACTS) {
        it(`includes ${artifact}`, () => {
          expect(content).toContain(artifact)
        })
      }
    })
  }
})
