import { useBuildPersistence } from '@/hooks/useBuildPersistence'
import { useBuildStore } from '@/state/store'

export function PersistenceControls() {
  const { exportToJSON, importFromJSON } = useBuildPersistence()
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

  return (
    <div
      style={{ padding: '1rem', border: '1px solid #ccc', margin: '1rem 0' }}
    >
      <h3>Persistence Controls</h3>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={handleAddSample}>Add Sample Brick</button>
        <button onClick={exportToJSON}>Export JSON</button>
        <button onClick={importFromJSON}>Import JSON</button>
      </div>
    </div>
  )
}
