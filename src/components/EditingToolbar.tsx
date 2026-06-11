import type { EditingTool } from '@/state/cursor'

interface EditingToolbarProps {
  activeTool: EditingTool
  onToolChange: (tool: EditingTool) => void
}

const TOOLS: { id: EditingTool; label: string }[] = [
  { id: 'place', label: 'Place' },
  { id: 'paint', label: 'Paint' },
  { id: 'eyedropper', label: 'Eyedropper' },
]

export function EditingToolbar({
  activeTool,
  onToolChange,
}: EditingToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Editing tools"
      style={{ display: 'flex', gap: 4 }}
    >
      {TOOLS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="button"
          aria-pressed={activeTool === id}
          data-testid={`tool-${id}`}
          onClick={() => onToolChange(id)}
          style={{
            flex: 1,
            padding: '4px 0',
            cursor: 'pointer',
            fontWeight: activeTool === id ? 700 : 400,
            outline: activeTool === id ? '2px solid #aaa' : undefined,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
