import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import * as budgets from '../perf/budgets'

describe('Performance Budgets consistency', () => {
  const docPath = path.resolve(__dirname, '../../docs/perf-budgets.md')

  it('docs/perf-budgets.md exists', () => {
    expect(fs.existsSync(docPath)).toBe(true)
  })

  const docContent = fs.existsSync(docPath)
    ? fs.readFileSync(docPath, 'utf8')
    : ''

  it('exports BUDGET_DOC_URL pointing at this canonical document', () => {
    expect(budgets.BUDGET_DOC_URL).toBe('/docs/perf-budgets.md')
  })

  it('matches render p95 budget', () => {
    expect(docContent).toContain(`${budgets.P95_FRAME_BUDGET_MS}ms`)
  })

  it('matches collapse p95 budget', () => {
    // Both use the same constant currently
    expect(docContent).toContain(`${budgets.P95_FRAME_BUDGET_MS}ms`)
  })

  it('matches collapse max frame budget', () => {
    expect(docContent).toContain(`${budgets.LONG_FRAME_THRESHOLD_MS}ms`)
  })

  it('matches bundle size budget', () => {
    expect(docContent).toContain(`${budgets.BUNDLE_ENTRY_BUDGET_KIB}KB`)
  })

  it('matches TTI budget', () => {
    expect(docContent).toContain(`${budgets.FIRST_INTERACTION_BUDGET_MS}ms`)
  })

  it('matches browser targets', () => {
    for (const browser of budgets.BROWSER_TARGETS) {
      expect(docContent.toLowerCase()).toContain(browser.toLowerCase())
    }
  })

  it('documents the uncompressed chunk warning threshold separately from the gzip entry ceiling', () => {
    expect(docContent).toContain(`${budgets.BUNDLE_CHUNK_WARNING_LIMIT_KIB}`)
  })

  it('does not contain stale planned-#53 language', () => {
    expect(docContent).not.toMatch(/planned for|planned #53|lands with #53/i)
  })
})
