/// <reference types="node" />
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DOC_PATH = join(process.cwd(), 'docs/PERF_BUDGETS.md')

describe('docs/PERF_BUDGETS.md — perf-budget drift guard', () => {
  it('exists', () => {
    expect(existsSync(DOC_PATH), 'docs/PERF_BUDGETS.md not found').toBe(true)
  })

  describe('render budget (issue #51)', () => {
    it('records 17 ms p95 frame-time threshold', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/17\s*ms/)
    })

    it('references 2 000-brick stress build', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/2[\s,]?000\s*brick/i)
    })

    it('owning spec file exists', () => {
      expect(
        existsSync(join(process.cwd(), 'tests/perf/render-perf.spec.ts')),
        'tests/perf/render-perf.spec.ts not found — doc references it',
      ).toBe(true)
    })
  })

  describe('collapse smoothness budget (issue #52)', () => {
    it('records 50 ms long-frame threshold', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/50\s*ms/)
    })

    it('references ~300-brick collapse scenario', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/300\s*brick/i)
    })

    it('owning spec file exists', () => {
      expect(
        existsSync(join(process.cwd(), 'tests/perf/collapse-perf.spec.ts')),
        'tests/perf/collapse-perf.spec.ts not found — doc references it',
      ).toBe(true)
    })
  })

  describe('load budget (issue #53)', () => {
    it('notes that load-budget spec and test:perf script land with #53', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/#53/)
    })

    it('does not claim npm run test:perf without the script and spec both existing', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      // Guard: if the doc lists `npm run test:perf` as a runnable command, both the
      // package.json script and the owning spec must be present on this branch.
      if (doc.match(/`npm run test:perf`/)) {
        const pkg = JSON.parse(
          readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
        ) as {
          scripts?: Record<string, string>
        }
        expect(
          pkg.scripts?.['test:perf'],
          'doc claims `npm run test:perf` but script is absent from package.json',
        ).toBeDefined()
        expect(
          existsSync(join(process.cwd(), 'tests/perf/load-budget.spec.ts')),
          'doc claims `npm run test:perf` but tests/perf/load-budget.spec.ts is absent',
        ).toBe(true)
      }
    })
  })

  describe('cross-browser compatibility (issue #54)', () => {
    it('names Firefox', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/firefox/i)
    })

    it('names WebKit/Safari', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/webkit/i)
    })

    it('mentions WebGL2', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/WebGL2/i)
    })

    it('owning spec file exists', () => {
      expect(
        existsSync(join(process.cwd(), 'tests/e2e/webgl2.spec.ts')),
        'tests/e2e/webgl2.spec.ts not found — doc references it',
      ).toBe(true)
    })
  })
})
