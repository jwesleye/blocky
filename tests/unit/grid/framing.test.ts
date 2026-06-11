import { getBaseplateFraming } from '@/domain/grid'

const distanceBetween = (
  [ax, ay, az]: [number, number, number],
  [bx, by, bz]: [number, number, number],
) => Math.hypot(ax - bx, ay - by, az - bz)

describe('getBaseplateFraming', () => {
  it('centers the target on the active baseplate', () => {
    expect(getBaseplateFraming(32).target).toEqual([16, 0, 16])
    expect(getBaseplateFraming(64).target).toEqual([32, 0, 32])
  })

  it('grows framing monotonically with larger baseplates', () => {
    const framing32 = getBaseplateFraming(32)
    const framing64 = getBaseplateFraming(64)

    expect(
      distanceBetween(framing64.cameraPosition, framing64.target),
    ).toBeGreaterThan(
      distanceBetween(framing32.cameraPosition, framing32.target),
    )
    expect(framing64.extent).toBeGreaterThan(framing32.extent)
  })

  it('returns a finite camera position tuple', () => {
    const framing = getBaseplateFraming(32)

    expect(framing.cameraPosition).toHaveLength(3)
    expect(framing.cameraPosition.every(Number.isFinite)).toBe(true)
  })

  it('rejects unsupported baseplate sizes with the canonical message', () => {
    expect(() => getBaseplateFraming(24)).toThrow(RangeError)
    expect(() => getBaseplateFraming(24)).toThrow(
      'Unsupported baseplate size: 24. Supported sizes are 16, 32, 48, 64.',
    )
  })
})
