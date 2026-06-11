import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string'

import { safeParseBuild, serializeBuild } from '@/domain/model/build'
import type { Build } from '@/domain/model/build'

/**
 * Client-only shareable build links (PRD §7.3).
 *
 * A share link carries the entire `Build` JSON, compressed with `lz-string` into
 * a URL-safe token, in a query parameter. There is no backend: producing a link
 * and loading one are both pure functions of the build and the URL. These
 * helpers deliberately exchange the plain `Build` payload — they never wrap it
 * in the gallery `SharedBuildPayload` contract, which is reserved for the future
 * backend gallery scope.
 */

/** Query-string parameter under which the compressed build token is carried. */
export const SHARE_URL_PARAM = 'build'

/**
 * Compress a validated `Build` into a URL-safe token. Throws if the build fails
 * schema validation (mirroring {@link serializeBuild}); callers pass a build
 * they already hold in memory, so a throw signals a programming error rather
 * than untrusted input.
 */
export const encodeBuildToShareToken = (build: Build): string =>
  compressToEncodedURIComponent(serializeBuild(build))

/**
 * Decode a share token back into a `Build`. Returns `null` — never throws — when
 * the token is empty, not decompressible, not valid JSON, or fails `Build`
 * schema validation, so a malformed or hostile link can never replace the
 * current build state.
 */
export const decodeShareToken = (
  token: string | null | undefined,
): Build | null => {
  if (!token) return null
  let json: string | null
  try {
    json = decompressFromEncodedURIComponent(token)
  } catch {
    return null
  }
  if (!json) return null
  return safeParseBuild(json)
}

/**
 * Resolve the default base URL for a share link from the current document
 * location (origin + pathname, dropping any existing query/hash). Falls back to
 * a placeholder origin when `window` is unavailable (SSR/tests) so callers can
 * still produce a well-formed URL.
 */
const defaultBaseUrl = (): string => {
  try {
    if (typeof window !== 'undefined' && window.location) {
      return `${window.location.origin}${window.location.pathname}`
    }
  } catch {
    // Accessing window.location can throw in some sandboxed contexts.
  }
  return 'https://localhost/'
}

/**
 * Build a shareable absolute URL carrying the compressed build token in its
 * query string. `baseUrl` defaults to the current document location; any
 * existing share parameter on the base is overwritten.
 */
export const createShareUrl = (build: Build, baseUrl?: string): string => {
  const token = encodeBuildToShareToken(build)
  const url = new URL(baseUrl ?? defaultBaseUrl())
  url.searchParams.set(SHARE_URL_PARAM, token)
  return url.toString()
}

/**
 * Extract the share token from a URL query string (e.g. `window.location.search`).
 * Accepts the string with or without a leading `?`. Returns `null` when the
 * share parameter is absent.
 */
export const readShareToken = (search: string): string | null => {
  if (!search) return null
  const query = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(query).get(SHARE_URL_PARAM)
}

/**
 * Decode the build encoded in a URL search string, or `null` when no share
 * token is present or the token is invalid. Never throws.
 */
export const loadBuildFromShareSearch = (search: string): Build | null =>
  decodeShareToken(readShareToken(search))
