import { describe, expect, it } from 'vitest'
import {
  ReportRequestSchema,
  buildReportRecord,
} from '../../../backend/src/moderation'

describe('ReportRequestSchema', () => {
  it('accepts a valid report with reason only', () => {
    const result = ReportRequestSchema.safeParse({ reason: 'spam' })
    expect(result.success).toBe(true)
  })

  it('accepts a valid report with reason and details', () => {
    const result = ReportRequestSchema.safeParse({
      reason: 'abuse',
      details: 'Contains harmful content',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all valid reason values', () => {
    for (const reason of ['spam', 'abuse', 'copyright', 'other']) {
      expect(ReportRequestSchema.safeParse({ reason }).success).toBe(true)
    }
  })

  it('rejects an unknown reason', () => {
    const result = ReportRequestSchema.safeParse({ reason: 'violence' })
    expect(result.success).toBe(false)
  })

  it('rejects a report with no reason', () => {
    const result = ReportRequestSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects details exceeding 2000 characters', () => {
    const result = ReportRequestSchema.safeParse({
      reason: 'other',
      details: 'x'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts details at the 2000 character limit', () => {
    const result = ReportRequestSchema.safeParse({
      reason: 'other',
      details: 'x'.repeat(2000),
    })
    expect(result.success).toBe(true)
  })
})

describe('buildReportRecord', () => {
  it('carries the build id', () => {
    const record = buildReportRecord('build_abc', { reason: 'spam' })
    expect(record.buildId).toBe('build_abc')
  })

  it('carries the report reason', () => {
    const record = buildReportRecord('build_abc', { reason: 'copyright' })
    expect(record.reason).toBe('copyright')
  })

  it('carries optional details when provided', () => {
    const record = buildReportRecord('build_abc', {
      reason: 'other',
      details: 'Additional info',
    })
    expect(record.details).toBe('Additional info')
  })

  it('does not include details key when not provided', () => {
    const record = buildReportRecord('build_abc', { reason: 'spam' })
    expect('details' in record).toBe(false)
  })

  it('includes a reportedAt timestamp string', () => {
    const record = buildReportRecord('build_abc', { reason: 'abuse' })
    expect(typeof record.reportedAt).toBe('string')
    expect(record.reportedAt.length).toBeGreaterThan(0)
  })
})
