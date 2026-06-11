import type { KeyboardEvent } from 'react'
import {
  PART_CATALOG,
  PART_TYPE_LABELS,
  type PartType,
} from '@/domain/parts/catalog'
import type { PartDef } from '@/domain/parts/catalog'

interface PartPickerProps {
  selected: string
  onSelect: (id: string) => void
}

const PART_TYPE_ORDER: PartType[] = ['brick', 'plate', 'tile', 'slope', 'round']

const INVENTORY_PARTS = PART_CATALOG.filter(
  (p): p is PartDef => p.category !== 'baseplate',
)

export function PartPicker({ selected, onSelect }: PartPickerProps) {
  const handleKeyDown = (
    e: KeyboardEvent,
    currentIndex: number,
    groupParts: readonly PartDef[],
  ) => {
    let nextIndex: number | null = null

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % groupParts.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + groupParts.length) % groupParts.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = groupParts.length - 1
    }

    if (nextIndex !== null) {
      e.preventDefault()
      const nextPart = groupParts[nextIndex]
      onSelect(nextPart.id)
      // Focus the next button
      const buttons = e.currentTarget.parentElement?.querySelectorAll('button')
      ;(buttons?.[nextIndex] as HTMLElement)?.focus()
    }
  }

  return (
    <div className="part-picker">
      {PART_TYPE_ORDER.map((type) => {
        const parts = INVENTORY_PARTS.filter((p) => p.category === type)
        const hasSelectedInGroup = parts.some((p) => p.id === selected)

        return (
          <section key={type} className="part-group">
            <h3 className="part-group__label">{PART_TYPE_LABELS[type]}</h3>
            <div
              role="radiogroup"
              aria-label={PART_TYPE_LABELS[type]}
              className="part-group__items"
            >
              {parts.map((part, index) => (
                <button
                  key={part.id}
                  role="radio"
                  aria-checked={selected === part.id}
                  tabIndex={
                    selected === part.id || (!hasSelectedInGroup && index === 0)
                      ? 0
                      : -1
                  }
                  className={`part-btn${selected === part.id ? ' part-btn--selected' : ''}`}
                  onClick={() => onSelect(part.id)}
                  onKeyDown={(e) => handleKeyDown(e, index, parts)}
                >
                  {part.label}
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
