import { useCallback, useEffect, useMemo, useState } from 'react'

import { buildToBricks, validateBuild } from '@/domain/model/build'
import {
  type GalleryBuildSummary,
  type GalleryClient,
} from '@/domain/persistence/galleryClient'
import {
  resolveDefaultGalleryClient,
  type GalleryMode,
} from '@/domain/persistence/galleryConfig'
import { useBuildStore } from '@/state/store'

export interface GalleryState {
  builds: GalleryBuildSummary[]
  loading: boolean
  loadingBuildId: string | null
  error: string | null
  mode: GalleryMode
  refresh: () => Promise<void>
  loadBuild: (buildId: string) => Promise<boolean>
}

export function useGallery(client?: GalleryClient): GalleryState {
  const defaultGallery = useMemo(() => resolveDefaultGalleryClient(), [])
  const resolvedClient = client ?? defaultGallery.client
  const mode = client ? 'live' : defaultGallery.mode
  const [builds, setBuilds] = useState<GalleryBuildSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingBuildId, setLoadingBuildId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await resolvedClient.list()
    if (result.ok) {
      setBuilds(result.builds)
    } else {
      setBuilds([])
      setError(result.message)
    }

    setLoading(false)
  }, [resolvedClient])

  const loadBuild = useCallback(
    async (buildId: string) => {
      setLoadingBuildId(buildId)
      setError(null)

      const result = await resolvedClient.load(buildId)
      if (!result.ok) {
        setError(result.message)
        setLoadingBuildId(null)
        return false
      }

      try {
        const build = validateBuild(result.payload.build)
        const bricks = buildToBricks(build)
        useBuildStore.setState({
          bricks: Object.fromEntries(bricks.map((brick) => [brick.id, brick])),
          selection: new Set<string>(),
          lastCollapse: null,
          activeCollapse: null,
        })
        setLoadingBuildId(null)
        return true
      } catch {
        setError('Could not load published build.')
        setLoadingBuildId(null)
        return false
      }
    },
    [resolvedClient],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { builds, loading, loadingBuildId, error, mode, refresh, loadBuild }
}
