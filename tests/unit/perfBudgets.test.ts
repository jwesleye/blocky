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
})
