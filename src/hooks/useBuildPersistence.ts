import { useCallback } from 'react'
import { bricksToBuild, validateBuild, buildToBricks } from '@/domain/model/build'
import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import { useStore } from '@/state/useStore'

export function useBuildPersistence() {
  const bricks = useStore((state) => state.bricks)
  const setBricks = useStore((state) => state.setBricks)

  const exportToJSON = useCallback(() => {
    const build = bricksToBuild(bricks, BASEPLATE_SIZE_STUDS)
    const blob = new Blob([JSON.stringify(build, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `build-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [bricks])

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
          setBricks(newBricks)
          resolve()
        } catch (err) {
          console.error('Failed to import build:', err)
          alert('Invalid build file: ' + (err instanceof Error ? err.message : String(err)))
          resolve()
        }
      }
      input.click()
    })
  }, [setBricks])

  return { exportToJSON, importFromJSON }
}
