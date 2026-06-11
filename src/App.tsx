import { PersistenceControls } from './components/PersistenceControls'
import { useUndoRedo } from './hooks/useUndoRedo'
import { useBuildStore } from './state/store'

export function App() {
  const brickMap = useBuildStore((state) => state.bricks)
  const bricks = Object.values(brickMap)

  // Enable Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Y (redo) keyboard shortcuts.
  useUndoRedo()

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        fontFamily: 'sans-serif',
        background: '#1a1a1a',
        color: '#e0e0e0',
      }}
    >
      <aside
        className="app-sidebar"
        style={{
          background: '#242424',
          borderRight: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 8px 4px',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          blocky
        </div>

        <div style={{ padding: '8px', borderBottom: '1px solid #333' }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
            Active brick
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: 3,
                background: currentColor?.hex ?? '#888',
                border: '1px solid #444',
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <span style={{ fontSize: 13 }}>
              {currentColor?.label ?? colorId} - {currentPart?.label ?? partId}
            </span>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid #333' }}>
          <div
            style={{
              padding: '8px 8px 0',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#888',
            }}
          >
            Color
          </div>
          <ColorPicker selected={colorId} onSelect={setColor} />
        </div>

        <div style={{ borderBottom: '1px solid #333' }}>
          <div
            style={{
              padding: '8px 8px 0',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#888',
            }}
          >
            Baseplate
          </div>
          <BaseplateSizePicker />
        </div>

        <div style={{ borderBottom: '1px solid #333' }}>
          <div
            style={{
              padding: '8px 8px 0',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#888',
            }}
          >
            Environment
          </div>
          <EnvironmentPresetPicker />
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '8px 8px 0',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#888',
            }}
          >
            Parts
          </div>
          <PartPicker selected={partId} onSelect={setPart} />
        </div>

        <div style={{ borderTop: '1px solid #333' }}>
          <div
            style={{
              padding: '8px 8px 0',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#888',
            }}
          >
            Mode
          </div>
          <div style={{ padding: '4px 8px 4px' }}>
            <EditingToolbar
              activeTool={editingTool}
              onToolChange={setEditingTool}
            />
          </div>
        </div>

        <div style={{ borderTop: '1px solid #333' }}>
          <div
            style={{
              padding: '8px 8px 0',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#888',
            }}
          >
            Transform
          </div>
          <div
            role="group"
            aria-label="Mirror selection"
            style={{ padding: '4px 8px 4px', display: 'flex', gap: 4 }}
          >
            <button
              onClick={() => handleMirror('x')}
              disabled={selectionSize === 0}
              data-testid="mirror-x"
              aria-label="Mirror along X axis"
              style={{ flex: 1, padding: '4px 0', cursor: 'pointer' }}
            >
              Mirror X
            </button>
            <button
              onClick={() => handleMirror('z')}
              disabled={selectionSize === 0}
              data-testid="mirror-z"
              aria-label="Mirror along Z axis"
              style={{ flex: 1, padding: '4px 0', cursor: 'pointer' }}
            >
              Mirror Z
            </button>
          </div>
          {mirrorFeedback && (
            <div
              data-testid="mirror-feedback"
              style={{ padding: '0 8px 6px', fontSize: 11, color: '#f77' }}
            >
              {mirrorFeedback}
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #333', padding: '8px' }}>
          <div
            style={{
              padding: '0 0 6px',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#888',
            }}
          >
            Sound
          </div>
          <SoundToggle />
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <BuildScene presetId={selectedPresetId} onCaptureFnReady={handleCaptureFnReady} />
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
