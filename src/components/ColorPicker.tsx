import type { KeyboardEvent } from 'react'
import { BRICK_COLORS } from '@/domain/model/colors'

interface ColorPickerProps {
  selected: string
  onSelect: (id: string) => void
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  const handleKeyDown = (e: KeyboardEvent, currentIndex: number) => {
    let nextIndex: number | null = null

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % BRICK_COLORS.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + BRICK_COLORS.length) % BRICK_COLORS.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = BRICK_COLORS.length - 1
    }

    if (nextIndex !== null) {
      e.preventDefault()
      const nextColor = BRICK_COLORS[nextIndex]
      onSelect(nextColor.id)
      // Focus the next button
      const buttons = e.currentTarget.parentElement?.querySelectorAll('button')
      ;(buttons?.[nextIndex] as HTMLElement)?.focus()
    }
  }

  return (
    <div className="color-picker" role="radiogroup" aria-label="Brick color">
      {BRICK_COLORS.map((color, index) => (
        <button
          key={color.id}
          role="radio"
          aria-checked={selected === color.id}
          aria-label={color.name}
          title={color.name}
          tabIndex={selected === color.id ? 0 : -1}
          className={`color-swatch${selected === color.id ? ' color-swatch--selected' : ''}`}
          style={{ backgroundColor: color.hex }}
          onClick={() => onSelect(color.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        >
          <span className="color-swatch__label">{color.name}</span>
        </button>
      ))}
    </div>
  )
}
