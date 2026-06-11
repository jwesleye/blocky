import {
  createFixtureGalleryClient,
  createGalleryClient,
  type GalleryClient,
} from '@/domain/persistence/galleryClient'

export type GalleryMode = 'live' | 'demo'

export function resolveGalleryBaseUrl(): string {
  if (typeof import.meta.env === 'undefined') {
    return ''
  }

  return ((import.meta.env['VITE_GALLERY_URL'] as string | undefined) ?? '').trim()
}

export function isGalleryBackendConfigured(): boolean {
  return resolveGalleryBaseUrl().length > 0
}

export function resolveDefaultGalleryClient(): {
  client: GalleryClient
  mode: GalleryMode
} {
  const baseUrl = resolveGalleryBaseUrl()
  if (baseUrl.length > 0) {
    return {
      client: createGalleryClient(baseUrl),
      mode: 'live',
    }
  }

  // Demo fixtures remain the temporary post-v1 placeholder documented in
  // docs/design/community-sharing.md until a backend is explicitly configured.
  return {
    client: createFixtureGalleryClient(),
    mode: 'demo',
  }
}
