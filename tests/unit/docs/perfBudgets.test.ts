/// <reference types="node" />
import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  BUNDLE_CHUNK_WARNING_LIMIT_KIB,
  BUNDLE_ENTRY_BUDGET_KIB,
  COLLAPSE_BRICK_COUNT,
  LONG_FRAME_THRESHOLD_MS,
  P95_FRAME_BUDGET_MS,
} from '../../perf/budgets'

const DOC_PATH = join(process.cwd(), 'docs/perf-budgets.md')

describe('docs/perf-budgets.md — perf-budget drift guard', () => {
  it('exists', () => {
    expect(existsSync(DOC_PATH), 'docs/perf-budgets.md not found').toBe(true)
  })

  it('docs/PERF_BUDGETS.md is not git-tracked', () => {
    const tracked = execSync('git ls-files docs/PERF_BUDGETS.md')
      .toString()
      .trim()
    expect(tracked, 'docs/PERF_BUDGETS.md must not be git-tracked').toBe('')
  })

  describe('render budget (issue #51)', () => {
    it('records p95 frame-time threshold', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(new RegExp(String(P95_FRAME_BUDGET_MS) + '\\s*ms'))
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
    it('records long-frame threshold', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(
        new RegExp(String(LONG_FRAME_THRESHOLD_MS) + '\\s*ms'),
      )
    })

    it('references collapse scenario brick count', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(
        new RegExp(String(COLLAPSE_BRICK_COUNT) + '\\s*brick', 'i'),
      )
    })

    it('owning spec file exists', () => {
      expect(
        existsSync(join(process.cwd(), 'tests/perf/collapse-perf.spec.ts')),
        'tests/perf/collapse-perf.spec.ts not found — doc references it',
      ).toBe(true)
    })
  })

  describe('bundle chunk warning budget', () => {
    it('documents the uncompressed chunk warning threshold', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(new RegExp(String(BUNDLE_CHUNK_WARNING_LIMIT_KIB)))
    })

    it('still documents the gzip entry ceiling', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(
        new RegExp(String(BUNDLE_ENTRY_BUDGET_KIB) + '\\s*KiB'),
      )
    })
  })

  describe('load budget (issue #53)', () => {
    it('does not contain stale planned-#53 language', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).not.toMatch(/planned for|planned #53|lands with #53/i)
    })

    it('does not claim npm run test:perf without the script and spec both existing', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(
        doc,
        'perf-budgets.md must reference the test:perf script',
      ).toMatch(/test:perf/)
      const pkg = JSON.parse(
        readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
      ) as {
        scripts?: Record<string, string>
      }
      expect(
        pkg.scripts?.['test:perf'],
        'package.json must define scripts["test:perf"]',
      ).toBeDefined()
      expect(
        existsSync(join(process.cwd(), 'tests/perf/load-perf.spec.ts')),
        'tests/perf/load-perf.spec.ts not found — owning spec for the load budget',
      ).toBe(true)
    })

    it('does not reference a nonexistent perf spec', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      const specRefs = [...doc.matchAll(/tests\/perf\/[\w-]+\.spec\.ts/g)].map(
        (m) => m[0],
      )
      for (const specRef of specRefs) {
        expect(
          existsSync(join(process.cwd(), specRef)),
          `doc references ${specRef} which does not exist on disk`,
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
