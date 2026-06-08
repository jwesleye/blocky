import { z } from 'zod'

import { BuildSchema } from '@/domain/model/build'

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

export const SHARED_BUILD_CONTRACT_VERSION = 1

export const SharedBuildGalleryMetadataSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  visibility: z.union([z.literal('public'), z.literal('unlisted')]),
  author: authorIdentitySchema,
  publishedAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})

export const SharedBuildPayloadSchema = z.object({
  contractVersion: z.literal(SHARED_BUILD_CONTRACT_VERSION),
  buildId: z.string().trim().min(1).max(128),
  build: BuildSchema,
  gallery: SharedBuildGalleryMetadataSchema,
})

export type SharedBuildAuthorIdentity = z.infer<typeof authorIdentitySchema>
export type SharedBuildGalleryMetadata = z.infer<
  typeof SharedBuildGalleryMetadataSchema
>
export type SharedBuildPayload = z.infer<typeof SharedBuildPayloadSchema>

export const validateSharedBuildPayload = (data: unknown): SharedBuildPayload =>
  SharedBuildPayloadSchema.parse(data)

export const serializeSharedBuildPayload = (
  payload: SharedBuildPayload,
): string => JSON.stringify(validateSharedBuildPayload(payload))

export const parseSharedBuildPayload = (json: string): SharedBuildPayload =>
  validateSharedBuildPayload(JSON.parse(json))

export const safeParseSharedBuildPayload = (
  json: string,
): SharedBuildPayload | null => {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }

  const result = SharedBuildPayloadSchema.safeParse(data)
  return result.success ? result.data : null
}
