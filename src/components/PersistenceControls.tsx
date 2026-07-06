import { useState } from 'react'
import { useBuildPersistence } from '@/hooks/useBuildPersistence'
import { useBuildStore } from '@/state/store'
import type {
  GalleryPublishRequest,
  GalleryPublishResult,
} from '@/domain/persistence/galleryClient'

interface Props {
  onExportScreenshot?: (() => Promise<void>) | null
}

function useSampleBrick() {
  const placeBrick = useBuildStore((state) => state.placeBrick)
  const handleAddSample = () => {
    placeBrick({
      partId: 'brick-2x4',
      color: 'red',
      x: Math.floor(Math.random() * 20),
      y: 0,
      z: Math.floor(Math.random() * 20),
      rot: 0,
    })
  }
  return handleAddSample
}

function useScreenshotExport(
  onExportScreenshot?: (() => Promise<void>) | null,
) {
  const [screenshotError, setScreenshotError] = useState<string | null>(null)

  const handleExportScreenshot = async () => {
    if (!onExportScreenshot) return
    setScreenshotError(null)
    try {
      await onExportScreenshot()
    } catch (err) {
      setScreenshotError(
        'Screenshot failed: ' +
          (err instanceof Error ? err.message : String(err)),
      )
    }
  }

  return { screenshotError, handleExportScreenshot }
}

function useShare(createShareLink: () => string) {
  const [shareUrl, setShareUrl] = useState('')

  const handleShare = () => {
    const url = createShareLink()
    setShareUrl(url)
    // Best-effort copy to clipboard; the link is also shown for manual copy.
    void navigator.clipboard?.writeText?.(url).catch(() => {})
  }

  return { shareUrl, handleShare }
}

function usePublish(
  publishToGallery: (
    meta: Pick<
      GalleryPublishRequest['gallery'],
      'title' | 'description' | 'visibility' | 'author'
    >,
  ) => Promise<GalleryPublishResult>,
) {
  const [publishStatus, setPublishStatus] = useState<
    'idle' | 'publishing' | 'success' | 'error'
  >('idle')
  const [publishMessage, setPublishMessage] = useState('')

  const handlePublish = async () => {
    const title = window.prompt('Gallery title for this build:')
    if (!title?.trim()) return

    setPublishStatus('publishing')
    setPublishMessage('')

    const result = await publishToGallery({
      title: title.trim(),
      visibility: 'public',
      author: { identityMode: 'anonymous' },
    })

    if (result.ok) {
      setPublishStatus('success')
      setPublishMessage(`Published! ID: ${result.payload.buildId}`)
    } else {
      setPublishStatus('error')
      setPublishMessage(result.message ?? 'Unknown error')
    }
  }

  return { publishStatus, publishMessage, handlePublish }
}

export function PersistenceControls({ onExportScreenshot }: Props = {}) {
  const { exportToJSON, importFromJSON, createShareLink, publishToGallery } =
    useBuildPersistence()

  const handleAddSample = useSampleBrick()
  const { screenshotError, handleExportScreenshot } =
    useScreenshotExport(onExportScreenshot)
  const { shareUrl, handleShare } = useShare(createShareLink)
  const { publishStatus, publishMessage, handlePublish } =
    usePublish(publishToGallery)

  return (
    <div
      style={{ padding: '1rem', border: '1px solid #ccc', margin: '1rem 0' }}
    >
      <h3>Persistence Controls</h3>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={handleAddSample}>Add Sample Brick</button>
        <button onClick={handleExportScreenshot} disabled={!onExportScreenshot}>
          Export Screenshot
        </button>
        <button onClick={exportToJSON}>Export JSON</button>
        <button onClick={importFromJSON}>Import JSON</button>
        <button onClick={handleShare}>Share Link</button>
        <button
          onClick={handlePublish}
          disabled={publishStatus === 'publishing'}
        >
          {publishStatus === 'publishing'
            ? 'Publishing...'
            : 'Publish to Gallery'}
        </button>
      </div>
      {screenshotError && (
        <p style={{ marginTop: '0.5rem', color: 'red' }}>{screenshotError}</p>
      )}
      {shareUrl && (
        <input
          readOnly
          data-testid="share-url"
          aria-label="Shareable build link"
          value={shareUrl}
          onFocus={(e) => e.currentTarget.select()}
          style={{ marginTop: '0.5rem', width: '100%' }}
        />
      )}
      {publishMessage && (
        <p
          style={{
            marginTop: '0.5rem',
            color: publishStatus === 'error' ? 'red' : 'green',
          }}
        >
          {publishMessage}
        </p>
      )}
    </div>
  )
}
