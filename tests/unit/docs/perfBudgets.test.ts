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
  })

  describe('load budget (issue #53)', () => {
    it('mentions the test:perf verification command', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/test:perf/)
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
  })
})
