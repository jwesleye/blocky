import { useCallback } from 'react'
import {
  bricksToBuild,
  validateBuild,
  buildToBricks,
} from '@/domain/model/build'
import { assertSupportedBaseplateSize } from '@/domain/grid'
import { findBuildInvariantViolations } from '@/domain/physics'
import { createGalleryClient } from '@/domain/persistence/galleryClient'
import { resolveGalleryBaseUrl } from '@/domain/persistence/galleryConfig'
import type {
  GalleryPublishRequest,
  GalleryPublishResult,
} from '@/domain/persistence/galleryClient'
import { createShareUrl } from '@/domain/persistence/shareUrl'
import type { PlacedBrick } from '@/domain/model/types'
import { useBuildStore } from '@/state/store'

/**
 * Enforce the §5.1 grounding and no-overlap invariants on a build loaded from
 * an untrusted source (JSON import). Throws a descriptive `Error` — surfaced by
 * the import-error `alert` — so a corrupt/legacy payload can never replace and
 * autosave a physically-invalid model. Interactive placement guarantees these
 * invariants, but the load path bypasses it.
 */
function assertBuildInvariants(bricks: PlacedBrick[]): void {
  const { floating, colliding } = findBuildInvariantViolations(bricks)
  if (floating.length === 0 && colliding.length === 0) return

  const problems: string[] = []
  if (floating.length > 0) {
    problems.push(
      `${floating.length} floating brick(s) not connected to the baseplate`,
    )
  }
  if (colliding.length > 0) {
    problems.push(`${colliding.length} overlapping brick(s)`)
  }
  throw new Error(
    `build violates structural invariants: ${problems.join('; ')}`,
  )
}

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
        const target = e.target
        if (!(target instanceof HTMLInputElement)) {
          resolve()
          return
        }

        const file = target.files?.[0]
        if (!file) {
          resolve()
          return
        }

        try {
          const text = await file.text()
          const data = JSON.parse(text)
          const build = validateBuild(data)
          const newBricks = buildToBricks(build)
          assertBuildInvariants(newBricks)
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
    publishToGallery,
  }
}
