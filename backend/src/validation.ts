import { z } from 'zod'

// Must match MAX_BRICKS_PER_BUILD / MAX_BRICK_STRING_LENGTH from src/domain/model/build.ts.
const MAX_BRICKS_PER_BUILD = 50_000
const MAX_BRICK_STRING_LENGTH = 64

const buildVersionSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
])

const rotationSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
])

const halfStudOffsetSchema = z.object({
  x: z.union([z.literal(0), z.literal(1)]),
  z: z.union([z.literal(0), z.literal(1)]),
})

const brickMountSchema = z.union([
  z.literal('px'),
  z.literal('nx'),
  z.literal('pz'),
  z.literal('nz'),
])

const brickHingeSchema = z.union([z.literal('x'), z.literal('z')])

const serializedBrickSchema = z.object({
  partId: z.string().max(MAX_BRICK_STRING_LENGTH),
  color: z.string().max(MAX_BRICK_STRING_LENGTH),
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int(),
  rot: rotationSchema,
  offset: halfStudOffsetSchema.optional(),
  mount: brickMountSchema.optional(),
  hinge: brickHingeSchema.optional(),
})

// Must match SUPPORTED_BASEPLATE_SIZES from the frontend contract.
const supportedBaseplateSizeSchema = z.union([
  z.literal(16),
  z.literal(32),
  z.literal(48),
  z.literal(64),
])

const BuildSchema = z
  .object({
    version: buildVersionSchema,
    baseplate: z.object({ size: supportedBaseplateSizeSchema }),
    bricks: z.array(serializedBrickSchema).max(MAX_BRICKS_PER_BUILD),
  })
  .superRefine((build, ctx) => {
    const maxCoordinate = build.baseplate.size - 1

    for (const [index, brick] of build.bricks.entries()) {
      if (brick.x < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bricks', index, 'x'],
          message: 'x must be greater than or equal to 0',
        })
      } else if (brick.x > maxCoordinate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bricks', index, 'x'],
          message: `x must be less than or equal to ${maxCoordinate}`,
        })
      }

      if (brick.y < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bricks', index, 'y'],
          message: 'y must be greater than or equal to 0',
        })
      }

      if (brick.z < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bricks', index, 'z'],
          message: 'z must be greater than or equal to 0',
        })
      } else if (brick.z > maxCoordinate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bricks', index, 'z'],
          message: `z must be less than or equal to ${maxCoordinate}`,
        })
      }

      if (brick.offset !== undefined && build.version < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bricks', index, 'offset'],
          message: `offset requires version 2 or later; envelope is version ${build.version}`,
        })
      }

      if (brick.mount !== undefined && build.version < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bricks', index, 'mount'],
          message: `mount requires version 3; envelope is version ${build.version}`,
        })
      }

      if (brick.hinge !== undefined && build.version < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bricks', index, 'hinge'],
          message: `hinge requires version 4; envelope is version ${build.version}`,
        })
      }
    }
  })

const isoTimestampSchema = z.string().datetime({ offset: true })

const authorIdentitySchema = z.discriminatedUnion('identityMode', [
  z.object({
    identityMode: z.literal('anonymous'),
    displayName: z.string().trim().min(1).max(80).optional(),
  }),
  z.object({
    identityMode: z.literal('authenticated'),
    userId: z.string().trim().min(1).max(128),
    displayName: z.string().trim().min(1).max(80),
  }),
])

const GalleryMetaInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  visibility: z.union([z.literal('public'), z.literal('unlisted')]),
  author: authorIdentitySchema,
})

export const PublishRequestSchema = z.object({
  build: BuildSchema,
  gallery: GalleryMetaInputSchema,
})

export const SHARED_BUILD_CONTRACT_VERSION = 1

export const SharedBuildPayloadSchema = z.object({
  contractVersion: z.literal(SHARED_BUILD_CONTRACT_VERSION),
  buildId: z.string().trim().min(1).max(128),
  build: BuildSchema,
  gallery: GalleryMetaInputSchema.extend({
    publishedAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
  }),
})

export type PublishRequest = z.infer<typeof PublishRequestSchema>
export type SharedBuildPayload = z.infer<typeof SharedBuildPayloadSchema>
