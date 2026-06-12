import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPORT_REASON_VALUES } from '../../../backend/src/moderation'

const DOC_PATH = join(process.cwd(), 'docs/design/community-sharing.md')

describe('docs/design/community-sharing.md — community sharing hardening guard', () => {
  it('exists', () => {
    expect(
      existsSync(DOC_PATH),
      'docs/design/community-sharing.md not found',
    ).toBe(true)
  })

  describe('moderation and reporting', () => {
    it('documents moderation or abuse-reporting behavior', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/moderation|abuse.report|report.*abuse/i)
    })

    it('documents accepted report reasons', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      const reasons = REPORT_REASON_VALUES.filter((r) => r !== 'other')
      for (const reason of reasons) {
        expect(doc).toMatch(new RegExp(reason, 'i'))
      }
    })

    it('documents that invalid reports are rejected (422)', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/422|invalid.*report|reject.*report/i)
    })
  })

  describe('privacy, ownership, and deletion', () => {
    it('documents ownership or authorship', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/ownership|author|owner/i)
    })

    it('documents deletion behavior', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/delet/i)
    })

    it('does not describe x-user-id as sufficient delete authorization', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).not.toMatch(/x-user-id/i)
      expect(doc).toMatch(/authenticated principal|disabled until auth/i)
    })

    it('documents that deleted builds return 410 (tombstone)', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/410|tombstone|deleted.*build|build.*deleted/i)
    })

    it('documents privacy or visibility settings', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/privacy|visibility|public|unlisted/i)
    })
  })

  describe('deployment', () => {
    it('documents the backend service', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/backend.*service|gallery.*backend|node.*server/i)
    })

    it('documents storage', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/storage|volume/i)
    })

    it('documents environment variables', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/VITE_GALLERY_URL|PORT|env/i)
    })

    it('documents the migration path from static-only hosting', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/migration|static.*only|static.*spa/i)
    })
  })

  describe('operational failure paths', () => {
    it('documents unavailable backend behavior', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/unavailable|backend.*down|offline|network.*error/i)
    })

    it('documents rejected publish behavior', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/rejected.*publish|publish.*rejected|publish.*fail/i)
    })

    it('documents that failures do not corrupt local state', () => {
      const doc = readFileSync(DOC_PATH, 'utf-8')
      expect(doc).toMatch(/local.*build|autosave|local.*state|local.*persist/i)
    })
  })
})
