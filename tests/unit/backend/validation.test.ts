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
        bricks: [
          { partId: 'brick-1x1', color: 'blue', x: 40, y: 0, z: 0, rot: 0 },
        ],
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
        bricks: [
          { partId: 'brick-1x1', color: 'blue', x: 48, y: 0, z: 0, rot: 0 },
        ],
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
        bricks: [
          { partId: 'brick-1x1', color: 'blue', x: 0, y: -1, z: -1, rot: 0 },
        ],
      },
    }

    expect(PublishRequestSchema.safeParse(request).success).toBe(false)
  })
})

describe('backend PublishRequestSchema mount contract', () => {
  it('accepts a version 3 build whose brick includes a valid mount', () => {
    const request = {
      ...validRequest,
      build: {
        version: 3 as const,
        baseplate: { size: 32 as const },
        bricks: [
          {
            partId: 'brick-1x1',
            color: 'blue',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
            mount: 'px' as const,
          },
        ],
      },
    }

    expect(PublishRequestSchema.safeParse(request).success).toBe(true)
  })

  it('rejects a version 3 build whose brick includes an unknown mount', () => {
    const request = {
      ...validRequest,
      build: {
        version: 3 as const,
        baseplate: { size: 32 as const },
        bricks: [
          {
            partId: 'brick-1x1',
            color: 'blue',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
            mount: 'bogus',
          },
        ],
      },
    }

    expect(PublishRequestSchema.safeParse(request).success).toBe(false)
  })

  it('rejects mount on a version 1 build', () => {
    const request = {
      ...validRequest,
      build: {
        ...validRequest.build,
        bricks: [
          {
            partId: 'brick-1x1',
            color: 'blue',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
            mount: 'px' as const,
          },
        ],
      },
    }

    expect(PublishRequestSchema.safeParse(request).success).toBe(false)
  })

  it('rejects mount on a version 2 build', () => {
    const request = {
      ...validRequest,
      build: {
        version: 2 as const,
        baseplate: { size: 32 as const },
        bricks: [
          {
            partId: 'brick-1x1',
            color: 'blue',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
            mount: 'px' as const,
          },
        ],
      },
    }

    expect(PublishRequestSchema.safeParse(request).success).toBe(false)
  })

  it('rejects offset on a version 1 build', () => {
    const request = {
      ...validRequest,
      build: {
        ...validRequest.build,
        bricks: [
          {
            partId: 'brick-1x1',
            color: 'blue',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
            offset: { x: 1 as const, z: 0 as const },
          },
        ],
      },
    }

    expect(PublishRequestSchema.safeParse(request).success).toBe(false)
  })
})

describe('backend PublishRequestSchema hinge contract', () => {
  it('accepts a version 4 build whose brick includes hinge x', () => {
    const request = {
      ...validRequest,
      build: {
        version: 4 as const,
        baseplate: { size: 32 as const },
        bricks: [
          {
            partId: 'brick-1x1',
            color: 'blue',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
            hinge: 'x' as const,
          },
        ],
      },
    }

    expect(PublishRequestSchema.safeParse(request).success).toBe(true)
  })

  it('accepts a version 4 build whose brick includes hinge z', () => {
    const request = {
      ...validRequest,
      build: {
        version: 4 as const,
        baseplate: { size: 32 as const },
        bricks: [
          {
            partId: 'brick-1x1',
            color: 'blue',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
            hinge: 'z' as const,
          },
        ],
      },
    }

    expect(PublishRequestSchema.safeParse(request).success).toBe(true)
  })

  it('rejects a version 4 build whose brick includes an unknown hinge value', () => {
    const request = {
      ...validRequest,
      build: {
        version: 4 as const,
        baseplate: { size: 32 as const },
        bricks: [
          {
            partId: 'brick-1x1',
            color: 'blue',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
            hinge: 'y',
          },
        ],
      },
    }

    expect(PublishRequestSchema.safeParse(request).success).toBe(false)
  })

  it('rejects hinge on a version 3 build', () => {
    const request = {
      ...validRequest,
      build: {
        version: 3 as const,
        baseplate: { size: 32 as const },
        bricks: [
          {
            partId: 'brick-1x1',
            color: 'blue',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
            hinge: 'x' as const,
          },
        ],
      },
    }

    expect(PublishRequestSchema.safeParse(request).success).toBe(false)
  })
})
