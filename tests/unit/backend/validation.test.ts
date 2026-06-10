import { describe, expect, it } from 'vitest'
import { PublishRequestSchema } from '../../../backend/src/validation'

const validRequest = {
  build: {
    version: 1 as const,
    baseplate: { size: 32 as const },
    bricks: [],
  },
  gallery: {
    title: 'Test Build',
    visibility: 'public' as const,
    author: { identityMode: 'anonymous' as const },
  },
}

describe('backend PublishRequestSchema baseplate contract', () => {
  it('accepts a build with the contract baseplate size (32)', () => {
    expect(PublishRequestSchema.safeParse(validRequest).success).toBe(true)
  })

  it('accepts a build with a supported larger baseplate size', () => {
    const request = {
      ...validRequest,
      build: {
        ...validRequest.build,
        baseplate: { size: 48 },
        bricks: [{ partId: 'brick-1x1', color: 'blue', x: 40, y: 0, z: 0, rot: 0 }],
      },
    }
    expect(PublishRequestSchema.safeParse(request).success).toBe(true)
  })

  it('rejects a build with brick coordinates outside the baseplate size', () => {
    const request = {
      ...validRequest,
      build: {
        ...validRequest.build,
        baseplate: { size: 48 },
        bricks: [{ partId: 'brick-1x1', color: 'blue', x: 48, y: 0, z: 0, rot: 0 }],
      },
    }

    expect(PublishRequestSchema.safeParse(request).success).toBe(false)
  })

  it('rejects a build with an unsupported baseplate size', () => {
    const request = {
      ...validRequest,
      build: { ...validRequest.build, baseplate: { size: 33 } },
    }
    expect(PublishRequestSchema.safeParse(request).success).toBe(false)
  })

  it('rejects a build with baseplate size 0', () => {
    const request = {
      ...validRequest,
      build: { ...validRequest.build, baseplate: { size: 0 } },
    }
    expect(PublishRequestSchema.safeParse(request).success).toBe(false)
  })

  it('rejects negative y and z coordinates', () => {
    const request = {
      ...validRequest,
      build: {
        ...validRequest.build,
        bricks: [{ partId: 'brick-1x1', color: 'blue', x: 0, y: -1, z: -1, rot: 0 }],
      },
    }

    expect(PublishRequestSchema.safeParse(request).success).toBe(false)
  })
})
