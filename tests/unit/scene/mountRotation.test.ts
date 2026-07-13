import { describe, it, expect } from 'vitest'
import { mountRotation } from '@/scene/mountRotation'

describe('mountRotation', () => {
  it('returns correct rotation for px', () => {
    expect(mountRotation('px')).toEqual([0, 0, -Math.PI / 2])
  })

  it('returns correct rotation for nx', () => {
    expect(mountRotation('nx')).toEqual([0, 0, Math.PI / 2])
  })

  it('returns correct rotation for pz', () => {
    expect(mountRotation('pz')).toEqual([Math.PI / 2, 0, 0])
  })

  it('returns correct rotation for nz', () => {
    expect(mountRotation('nz')).toEqual([-Math.PI / 2, 0, 0])
  })

  it('returns default rotation for undefined', () => {
    expect(mountRotation(undefined)).toEqual([0, 0, 0])
  })

  it('returns default rotation for unknown value', () => {
    // @ts-expect-error Testing invalid input at runtime
    expect(mountRotation('invalid')).toEqual([0, 0, 0])
  })
})
