import { useCallback, useEffect, useState } from 'react'

import { buildToBricks, validateBuild } from '@/domain/model/build'
import {
  createFixtureGalleryClient,
  type GalleryBuildSummary,
  type GalleryClient,
} from '@/domain/persistence/galleryClient'
import { useBuildStore } from '@/state/store'

const defaultGalleryClient = createFixtureGalleryClient()

export interface GalleryState {
  builds: GalleryBuildSummary[]
  loading: boolean
  loadingBuildId: string | null
  error: string | null
  refresh: () => Promise<void>
  loadBuild: (buildId: string) => Promise<boolean>
}

export function useGallery(
  client: GalleryClient = defaultGalleryClient,
): GalleryState {
  const [builds, setBuilds] = useState<GalleryBuildSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingBuildId, setLoadingBuildId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await client.list()
    if (result.ok) {
      setBuilds(result.builds)
    } else {
      setBuilds([])
      setError(result.message)
    }

    setLoading(false)
  }, [client])

  const loadBuild = useCallback(
    async (buildId: string) => {
      setLoadingBuildId(buildId)
      setError(null)

      const result = await client.load(buildId)
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
    [client],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { builds, loading, loadingBuildId, error, refresh, loadBuild }
}
