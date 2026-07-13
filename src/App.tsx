import { useCallback, useEffect, useRef, useState } from 'react'
import { Gallery } from '@/components/Gallery'
import { HUD } from '@/components/HUD'
import { PersistenceControls } from '@/components/PersistenceControls'
import { Sidebar } from '@/components/Sidebar'
import { ViewControls } from '@/components/ViewControls'
import { assertSupportedBaseplateSize } from '@/domain/grid'
import { bricksToBuild, buildToBricks } from '@/domain/model/build'
import { findBuildInvariantViolations } from '@/domain/physics'
import type { Build } from '@/domain/model/build'
import {
  createAutosaver,
  loadBuild,
  loadBuildFromShareSearch,
} from '@/domain/persistence'
import { useScenePresetPreference } from '@/hooks/useScenePresetPreference'
import { BuildScene, type CaptureScreenshot } from '@/scene/BuildScene'
import { downloadScreenshot } from '@/lib/screenshotExport'
import { useSceneSettingsStore } from '@/state/sceneSettings'
import { useBuildStore } from '@/state/store'
import { TouchToolbar } from '@/components/TouchToolbar'
import '@/styles/gallery.css'
import '@/styles/hud.css'
import '@/styles/pickers.css'
import '@/styles/responsive.css'

/**
 * True when a build satisfies the §5.1 grounding and no-overlap invariants.
 * `null` (no shared build) is treated as not-applicable, never as valid.
 */
function getStructuralInvariantError(build: Build | null): string | null {
  if (!build) return null
  const { floating, colliding } = findBuildInvariantViolations(
    buildToBricks(build),
  )
  if (floating.length === 0 && colliding.length === 0) return null

  const problems: string[] = []
  if (floating.length > 0) {
    problems.push(
      `${floating.length} floating brick(s) not connected to the baseplate`,
    )
  }
  if (colliding.length > 0) {
    problems.push(`${colliding.length} overlapping brick(s)`)
  }

  return `build violates structural invariants: ${problems.join('; ')}`
}

export function App() {
  const [galleryOpen, setGalleryOpen] = useState(false)
  useScenePresetPreference()
  const captureScreenshotRef = useRef<CaptureScreenshot | null>(null)
  const [isCaptureReady, setIsCaptureReady] = useState(false)

  const bricksById = useBuildStore((state) => state.bricks)
  const bricks = Object.values(bricksById)
  const baseplateSize = useBuildStore((state) => state.baseplateSize)
  const selectedPresetId = useSceneSettingsStore((s) => s.selectedPresetId)
  const autosaverRef = useRef(createAutosaver())
  const [hasHydratedPersistence, setHasHydratedPersistence] = useState(false)

  useEffect(() => {
    const sharedBuild =
      typeof window === 'undefined'
        ? null
        : loadBuildFromShareSearch(window.location.search)
    // A shared-URL build is untrusted input: enforce the §5.1 grounding and
    // no-overlap invariants before adopting it, falling back to the local
    // autosave when it would load a physically-invalid (floating/overlapping)
    // structure (PRD §10).
    const sharedBuildInvariantError = getStructuralInvariantError(sharedBuild)
    if (sharedBuildInvariantError) {
      alert(`Invalid build file: ${sharedBuildInvariantError}`)
    }
    const usableSharedBuild =
      sharedBuild && !sharedBuildInvariantError ? sharedBuild : null
    const initialBuild = usableSharedBuild ?? loadBuild()

    if (initialBuild) {
      const restoredBricks = buildToBricks(initialBuild)
      useBuildStore.setState({
        bricks: Object.fromEntries(
          restoredBricks.map((brick) => [brick.id, brick]),
        ),
        selection: new Set(),
        lastCollapse: null,
        baseplateSize: initialBuild.baseplate.size,
      })
    }
    setHasHydratedPersistence(true)
  }, [])

  useEffect(() => {
    if (!hasHydratedPersistence) return
    assertSupportedBaseplateSize(baseplateSize)
    autosaverRef.current.schedule(bricksToBuild(bricks, baseplateSize))
  }, [baseplateSize, bricks, hasHydratedPersistence])

  useEffect(() => {
    const autosaver = autosaverRef.current
    return () => {
      autosaver.flush()
      autosaver.cancel()
    }
  }, [])

  const handleCaptureFnReady = useCallback((fn: CaptureScreenshot) => {
    captureScreenshotRef.current = fn
    setIsCaptureReady(true)
  }, [])

  const handleExportScreenshot = isCaptureReady
    ? async () => {
        const capture = captureScreenshotRef.current
        if (!capture) return
        const blob = await capture()
        await downloadScreenshot(blob)
      }
    : undefined

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        fontFamily: 'sans-serif',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <Sidebar />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <BuildScene
            presetId={selectedPresetId}
            onCaptureFnReady={handleCaptureFnReady}
          />
          <ViewControls />
          <HUD />
          <TouchToolbar />
        </div>
        <div style={{ padding: '1rem' }}>
          <PersistenceControls onExportScreenshot={handleExportScreenshot} />
          <button
            type="button"
            className="gallery-toggle"
            data-testid="gallery-toggle"
            aria-expanded={galleryOpen}
            onClick={() => setGalleryOpen((open) => !open)}
          >
            Gallery
          </button>
          {galleryOpen && <Gallery />}
        </div>
      </main>
    </div>
  )
}

export default App
