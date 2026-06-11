import { useCallback } from 'react'
import {
  bricksToBuild,
  validateBuild,
  buildToBricks,
} from '@/domain/model/build'
import { assertSupportedBaseplateSize } from '@/domain/grid'
import { createGalleryClient } from '@/domain/persistence/galleryClient'
import { resolveGalleryBaseUrl } from '@/domain/persistence/galleryConfig'
import type {
  GalleryPublishRequest,
  GalleryPublishResult,
} from '@/domain/persistence/galleryClient'
import {
  createShareUrl,
  loadBuildFromShareSearch,
} from '@/domain/persistence/shareUrl'
import { useBuildStore } from '@/state/store'

export function useBuildPersistence() {
  const bricks = useBuildStore((state) => state.bricks)
  const baseplateSize = useBuildStore((state) => state.baseplateSize)

  const exportToJSON = useCallback(() => {
    assertSupportedBaseplateSize(baseplateSize)
    const build = bricksToBuild(Object.values(bricks), baseplateSize)
    const blob = new Blob([JSON.stringify(build, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `build-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [bricks, baseplateSize])

  const importFromJSON = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    return new Promise<void>((resolve) => {
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) {
          resolve()
          return
        }

        try {
          const text = await file.text()
          const data = JSON.parse(text)
          const build = validateBuild(data)
          const newBricks = buildToBricks(build)
          useBuildStore.setState({
            bricks: Object.fromEntries(
              newBricks.map((brick) => [brick.id, brick]),
            ),
            baseplateSize: build.baseplate.size,
          })
          resolve()
        } catch (err) {
          console.error('Failed to import build:', err)
          alert(
            'Invalid build file: ' +
              (err instanceof Error ? err.message : String(err)),
          )
          resolve()
        }
      }
      input.click()
    })
  }, [])

  const createShareLink = useCallback((): string => {
    assertSupportedBaseplateSize(baseplateSize)
    const build = bricksToBuild(Object.values(bricks), baseplateSize)
    return createShareUrl(build)
  }, [bricks, baseplateSize])

  const loadFromShareUrl = useCallback((search?: string): boolean => {
    const query =
      search ?? (typeof window !== 'undefined' ? window.location.search : '')
    const build = loadBuildFromShareSearch(query)
    if (!build) return false
    const newBricks = buildToBricks(build)
    useBuildStore.setState({
      bricks: Object.fromEntries(newBricks.map((brick) => [brick.id, brick])),
      baseplateSize: build.baseplate.size,
    })
    return true
  }, [])

  const publishToGallery = useCallback(
    async (
      meta: Pick<
        GalleryPublishRequest['gallery'],
        'title' | 'description' | 'visibility' | 'author'
      >,
    ): Promise<GalleryPublishResult> => {
      assertSupportedBaseplateSize(baseplateSize)
      const build = bricksToBuild(Object.values(bricks), baseplateSize)
      const client = createGalleryClient(resolveGalleryBaseUrl())
      return client.publish({ build, gallery: meta })
    },
    [bricks, baseplateSize],
  )

  return {
    exportToJSON,
    importFromJSON,
    createShareLink,
    loadFromShareUrl,
    publishToGallery,
  }
}
