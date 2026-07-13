import { describe, it, expect, vi, afterEach } from 'vitest'
import { createBrickId } from '@/domain/model/ids'

describe('createBrickId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns unique ids using crypto.randomUUID when available', () => {
    let call = 0
    const uuids = ['uuid-a', 'uuid-b']
    vi.stubGlobal('crypto', { randomUUID: () => uuids[call++] })
    const id1 = createBrickId()
    const id2 = createBrickId()
    expect(id1).toBe('uuid-a')
    expect(id2).toBe('uuid-b')
    expect(id1).not.toBe(id2)
  })

  it('falls back to brick-<counter> format when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {})
    const id1 = createBrickId()
    const id2 = createBrickId()
    expect(id1).toMatch(/^brick-\d+$/)
    expect(id2).toMatch(/^brick-\d+$/)
    expect(id1).not.toBe(id2)
  })
})
