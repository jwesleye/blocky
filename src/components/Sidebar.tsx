import { useState } from 'react'
import { BaseplateSizePicker } from '@/components/BaseplateSizePicker'
import { ColorPicker } from '@/components/ColorPicker'
import { EditingToolbar } from '@/components/EditingToolbar'
import { EnvironmentPresetPicker } from '@/components/EnvironmentPresetPicker'
import { PartPicker } from '@/components/PartPicker'
import { SoundToggle } from '@/components/SoundToggle'
import { getBrickColor } from '@/domain/model/colors'
import { getPart } from '@/domain/parts/catalog'
import { useCursorStore } from '@/state/cursor'
import { useBuildStore } from '@/state/store'

export function Sidebar() {
  const [mirrorFeedback, setMirrorFeedback] = useState<string | null>(null)

  const colorId = useCursorStore((s) => s.colorId)
  const partId = useCursorStore((s) => s.partId)
  const setColor = useCursorStore((s) => s.setColor)
  const setPart = useCursorStore((s) => s.setPart)
  const editingTool = useCursorStore((s) => s.editingTool)
  const setEditingTool = useCursorStore((s) => s.setEditingTool)

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
    <aside
      className="app-sidebar"
      style={{
        background: 'var(--color-panel-strong)',
        borderRight: '1px solid var(--color-line)',
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

      <div
        style={{
          padding: '8px',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-muted)',
            marginBottom: 4,
          }}
        >
          Active brick
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 3,
              background: currentColor?.hex ?? 'var(--color-muted)',
              border: '1px solid var(--color-line)',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span style={{ fontSize: 13 }}>
            {currentColor?.label ?? colorId} - {currentPart?.label ?? partId}
          </span>
        </div>
      </div>

      <div style={{ borderBottom: '1px solid var(--color-line)' }}>
        <div
          style={{
            padding: '8px 8px 0',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-muted)',
          }}
        >
          Color
        </div>
        <ColorPicker selected={colorId} onSelect={setColor} />
      </div>

      <div style={{ borderBottom: '1px solid var(--color-line)' }}>
        <div
          style={{
            padding: '8px 8px 0',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-muted)',
          }}
        >
          Baseplate
        </div>
        <BaseplateSizePicker />
      </div>

      <div style={{ borderBottom: '1px solid var(--color-line)' }}>
        <div
          style={{
            padding: '8px 8px 0',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-muted)',
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
            color: 'var(--color-muted)',
          }}
        >
          Parts
        </div>
        <PartPicker selected={partId} onSelect={setPart} />
      </div>

      <div style={{ borderTop: '1px solid var(--color-line)' }}>
        <div
          style={{
            padding: '8px 8px 0',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-muted)',
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

      <div style={{ borderTop: '1px solid var(--color-line)' }}>
        <div
          style={{
            padding: '8px 8px 0',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-muted)',
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
            style={{
              padding: '0 8px 6px',
              fontSize: 11,
              color: 'var(--color-danger)',
            }}
          >
            {mirrorFeedback}
          </div>
        )}
      </div>

      <div
        aria-live="polite"
        data-testid="selection-count"
        style={{
          borderTop: '1px solid var(--color-line)',
          padding: '8px',
          fontSize: 12,
          color: 'var(--color-muted)',
        }}
      >
        {selectionSize === 1
          ? '1 brick selected'
          : `${selectionSize} bricks selected`}
      </div>

      <div style={{ borderTop: '1px solid var(--color-line)', padding: '8px' }}>
        <div
          style={{
            padding: '0 0 6px',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-muted)',
          }}
        >
          Sound
        </div>
        <SoundToggle />
      </div>
    </aside>
  )
}
