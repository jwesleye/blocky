import { useState } from 'react'
import { getBrickColor } from '@/domain/model/colors'
import { getPart } from '@/domain/parts/catalog'
import { ColorPicker } from '@/components/ColorPicker'
import { PartPicker } from '@/components/PartPicker'
import { PersistenceControls } from '@/components/PersistenceControls'
import { ViewControls } from '@/components/ViewControls'
import { Scene } from '@/scene/Scene'
import { useCursorStore } from '@/state/cursor'
import { useBuildStore } from '@/state/store'
import '@/styles/pickers.css'

export function App() {
  const [mirrorFeedback, setMirrorFeedback] = useState<string | null>(null)

  const colorId = useCursorStore((s) => s.colorId)
  const partId = useCursorStore((s) => s.partId)
  const setColor = useCursorStore((s) => s.setColor)
  const setPart = useCursorStore((s) => s.setPart)

  const bricksById = useBuildStore((state) => state.bricks)
  const bricks = Object.values(bricksById)
  const mirrorSelection = useBuildStore((s) => s.mirrorSelection)
  const selectionSize = useBuildStore((s) => s.selection.size)

  const currentColor = getBrickColor(colorId)
  const currentPart = getPart(partId)

  const handleMirror = (axis: 'x' | 'z') => {
    const ok = mirrorSelection(axis)
    if (!ok) {
      setMirrorFeedback(`Cannot mirror along ${axis.toUpperCase()} axis`)
      setTimeout(() => setMirrorFeedback(null), 3000)
    } else {
      setMirrorFeedback(null)
    }
  }

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
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
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

        {/* Cursor preview */}
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
              {currentColor?.name ?? colorId} · {currentPart?.name ?? partId}
            </span>
          </div>
        </div>

        {/* Color picker */}
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

        {/* Part picker */}
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

        {/* Transform controls */}
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
          <div style={{ padding: '4px 8px 4px', display: 'flex', gap: 4 }}>
            <button
              onClick={() => handleMirror('x')}
              disabled={selectionSize === 0}
              data-testid="mirror-x"
              style={{ flex: 1, padding: '4px 0', cursor: 'pointer' }}
            >
              Mirror X
            </button>
            <button
              onClick={() => handleMirror('z')}
              disabled={selectionSize === 0}
              data-testid="mirror-z"
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
      </aside>

      {/* Main canvas area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Scene />
          <ViewControls />
        </div>
        <div style={{ padding: '1rem' }}>
          <PersistenceControls />
          <div>
            <h2>Build Status</h2>
            <p>Bricks in build: {bricks.length}</p>
            <ul>
              {bricks.slice(0, 10).map((brick) => (
                <li key={brick.id}>
                  {brick.partId} ({brick.color}) at {brick.x},{brick.y},
                  {brick.z}
                </li>
              ))}
              {bricks.length > 10 && <li>... and {bricks.length - 10} more</li>}
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
