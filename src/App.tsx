import { PersistenceControls } from './components/PersistenceControls'
import { useStore } from './state/useStore'
import { useUndoRedo } from './hooks/useUndoRedo'

export function App() {
  const bricks = useStore((state) => state.bricks)

  // Enable Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Y (redo) keyboard shortcuts.
  useUndoRedo()

  return (
    <main style={{ padding: '1rem' }}>
      <h1>blocky</h1>
      <p>Brick-building sandbox scaffolding is in place.</p>
      <PersistenceControls />
      <div>
        <h2>Build Status</h2>
        <p>Bricks in build: {bricks.length}</p>
        <ul>
          {bricks.slice(0, 10).map((brick) => (
            <li key={brick.id}>
              {brick.partId} ({brick.color}) at {brick.x},{brick.y},{brick.z}
            </li>
          ))}
          {bricks.length > 10 && <li>... and {bricks.length - 10} more</li>}
        </ul>
      </div>
    </main>
  )
}

export default App
