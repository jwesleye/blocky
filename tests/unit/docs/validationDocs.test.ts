/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf-8')

describe('validation-policy documentation drift guard', () => {
  describe('README.md — CI scope', () => {
    it('does not claim there is no GitHub Actions workflow', () => {
      const doc = read('README.md')
      expect(doc).not.toMatch(/no github actions workflow exists/i)
    })

    it('names typecheck, lint, and test as CI gates', () => {
      const doc = read('README.md')
      expect(doc).toMatch(/typecheck/i)
      expect(doc).toMatch(/lint/i)
      expect(doc).toMatch(/npm run test/i)
    })

    it('documents the cross-browser matrix as local-only', () => {
      const doc = read('README.md')
      expect(doc).toMatch(/local/i)
      expect(doc).toMatch(/test:e2e/i)
    })
  })

  describe('CONTRIBUTING.md — required vs local-only checks', () => {
    it('does not list npm run build as a hard PR gate without qualifying it', () => {
      const doc = read('CONTRIBUTING.md')
      // The doc must not say "Run `npm run build` on every PR" as an unqualified gate
      expect(doc).not.toMatch(/run `npm run build` on every pr/i)
    })

    it('does not list npm run test:perf as a hard PR gate without qualifying it', () => {
      const doc = read('CONTRIBUTING.md')
      expect(doc).not.toMatch(/run `npm run test:perf` on every pr/i)
    })

    it('names the three hard CI gates', () => {
      const doc = read('CONTRIBUTING.md')
      expect(doc).toMatch(/typecheck/i)
      expect(doc).toMatch(/npm run lint/i)
      expect(doc).toMatch(/npm run test/i)
    })
  })

  describe('docs/PERF_BUDGETS.md — load budget (issue #53)', () => {
    it('does not describe test:perf or load-perf.spec.ts as future work landing with #53', () => {
      const doc = read('docs/PERF_BUDGETS.md')
      expect(doc).not.toMatch(/lands?\s+with\s+#53/i)
      expect(doc).not.toMatch(/planned\s+for\s+#53/i)
    })

    it('documents npm run test:perf as current local validation', () => {
      const doc = read('docs/PERF_BUDGETS.md')
      expect(doc).toMatch(/npm run test:perf/)
    })

    it('references load-perf.spec.ts as the owning spec', () => {
      const doc = read('docs/PERF_BUDGETS.md')
      expect(doc).toMatch(/load-perf\.spec\.ts/)
    })
  })
})
