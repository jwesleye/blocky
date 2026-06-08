import { useState } from 'react'
import { createBrickId } from '@/domain/model/ids'
import { useBuildPersistence } from '@/hooks/useBuildPersistence'
import { useStore } from '@/state/useStore'

export function PersistenceControls() {
  const { exportToJSON, importFromJSON, publishToGallery } = useBuildPersistence()
  const addBrick = useStore((state) => state.addBrick)
  const [publishStatus, setPublishStatus] = useState<
    'idle' | 'publishing' | 'success' | 'error'
  >('idle')
  const [publishMessage, setPublishMessage] = useState('')

  const handleAddSample = () => {
    addBrick({
      id: createBrickId(),
      partId: 'brick-2x4',
      color: 'red',
      x: Math.floor(Math.random() * 20),
      y: 0,
      z: Math.floor(Math.random() * 20),
      rot: 0,
    })
  }

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
      setPublishMessage(result.message)
    }
  }

  return (
    <div
      style={{ padding: '1rem', border: '1px solid #ccc', margin: '1rem 0' }}
    >
      <h3>Persistence Controls</h3>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={handleAddSample}>Add Sample Brick</button>
        <button onClick={exportToJSON}>Export JSON</button>
        <button onClick={importFromJSON}>Import JSON</button>
        <button onClick={handlePublish} disabled={publishStatus === 'publishing'}>
          {publishStatus === 'publishing' ? 'Publishing…' : 'Publish to Gallery'}
        </button>
      </div>
      {publishMessage && (
        <p style={{ marginTop: '0.5rem', color: publishStatus === 'error' ? 'red' : 'green' }}>
          {publishMessage}
        </p>
      )}
    </div>
  )
}
