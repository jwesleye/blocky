import { z } from 'zod'

export const REPORT_REASON_VALUES = [
  'spam',
  'abuse',
  'copyright',
  'other',
] as const

export type ReportReason = (typeof REPORT_REASON_VALUES)[number]

export const ReportRequestSchema = z.object({
  reason: z.enum(REPORT_REASON_VALUES),
  details: z.string().max(2000).optional(),
})

export type ReportRequest = z.infer<typeof ReportRequestSchema>

export interface ReportRecord {
  buildId: string
  reason: ReportReason
  details?: string
  reportedAt: string
}

export function buildReportRecord(
  buildId: string,
  request: ReportRequest,
): ReportRecord {
  return {
    buildId,
    reason: request.reason,
    ...(request.details !== undefined ? { details: request.details } : {}),
    reportedAt: new Date().toISOString(),
  }
}
