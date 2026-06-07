import { BRICK_COLORS } from '@/domain/model/colors'

interface ColorPickerProps {
  selected: string
  onSelect: (id: string) => void
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <div className="color-picker" role="radiogroup" aria-label="Brick color">
      {BRICK_COLORS.map((color) => (
        <button
          key={color.id}
          role="radio"
          aria-checked={selected === color.id}
          aria-label={color.name}
          title={color.name}
          className={`color-swatch${selected === color.id ? ' color-swatch--selected' : ''}`}
          style={{ backgroundColor: color.hex }}
          onClick={() => onSelect(color.id)}
        >
          <span className="color-swatch__label">{color.name}</span>
        </button>
      ))}
    </div>
  )
}
