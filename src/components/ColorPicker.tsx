import type { KeyboardEvent } from 'react'
import { COLOR_PALETTE } from '@/domain/parts/colors'

interface ColorPickerProps {
  selected: string
  onSelect: (id: string) => void
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  const handleKeyDown = (e: KeyboardEvent, currentIndex: number) => {
    let nextIndex: number | null = null

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % COLOR_PALETTE.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + COLOR_PALETTE.length) % COLOR_PALETTE.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = COLOR_PALETTE.length - 1
    }

    if (nextIndex !== null) {
      e.preventDefault()
      const nextColor = COLOR_PALETTE[nextIndex]
      onSelect(nextColor.id)
      // Focus the next button
      const buttons = e.currentTarget.parentElement?.querySelectorAll('button')
      ;(buttons?.[nextIndex] as HTMLElement)?.focus()
    }
  }

  return (
    <div className="color-picker" role="radiogroup" aria-label="Brick color">
      {COLOR_PALETTE.map((color, index) => (
        <button
          key={color.id}
          role="radio"
          aria-checked={selected === color.id}
          aria-label={color.label}
          title={color.label}
          tabIndex={selected === color.id ? 0 : -1}
          className={`color-swatch${selected === color.id ? ' color-swatch--selected' : ''}`}
          style={{ backgroundColor: color.hex }}
          onClick={() => onSelect(color.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        >
          <span className="color-swatch__label">{color.label}</span>
        </button>
      ))}
    </div>
  )
}
