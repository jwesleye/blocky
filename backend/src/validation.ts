import { z } from 'zod'

const buildVersionSchema = z.union([z.literal(1), z.literal(2)])

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

const serializedBrickSchema = z.object({
  partId: z.string(),
  color: z.string(),
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int(),
  rot: rotationSchema,
  offset: halfStudOffsetSchema.optional(),
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
    bricks: z.array(serializedBrickSchema),
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
