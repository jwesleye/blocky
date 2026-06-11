import { useRef } from 'react'
import { Grid3X3 } from 'lucide-react'
import { SUPPORTED_BASEPLATE_SIZES } from '@/domain/grid'
import { bricksOutsideBaseplate } from '@/domain/physics'
import { CATALOG_BY_ID as PART_CATALOG } from '@/domain/parts/catalog'
import { useBuildStore } from '@/state/store'

/**
 * Sidebar control for choosing the active baseplate side length. Growing or
 * keeping the plate applies immediately; shrinking to a size that would leave
 * one or more placed bricks outside the new bounds first asks for confirmation
 * so existing builds are not silently invalidated.
 */
export function BaseplateSizePicker() {
  const baseplateSize = useBuildStore((s) => s.baseplateSize)
  const bricks = useBuildStore((s) => s.bricks)
  const setBaseplateSize = useBuildStore((s) => s.setBaseplateSize)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleSelect = (nextSize: number): boolean => {
    if (nextSize === baseplateSize) return false

    if (nextSize < baseplateSize) {
      const outside = bricksOutsideBaseplate(
        Object.values(bricks),
        nextSize,
        PART_CATALOG,
      )
      if (outside.length > 0) {
        const noun = outside.length === 1 ? 'brick' : 'bricks'
        const ok = window.confirm(
          `Shrinking to ${nextSize} × ${nextSize} leaves ${outside.length} ${noun} outside the smaller baseplate. Continue?`,
        )
        if (!ok) return false
      }
    }

    setBaseplateSize(nextSize)
    return true
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const count = SUPPORTED_BASEPLATE_SIZES.length
    const idx = SUPPORTED_BASEPLATE_SIZES.findIndex((s) => s === baseplateSize)
    let nextIdx = idx

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault()
        nextIdx = (idx + 1) % count
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault()
        nextIdx = (idx - 1 + count) % count
        break
      case 'Home':
        e.preventDefault()
        nextIdx = 0
        break
      case 'End':
        e.preventDefault()
        nextIdx = count - 1
        break
      default:
        return
    }

    if (nextIdx !== idx) {
      const accepted = handleSelect(SUPPORTED_BASEPLATE_SIZES[nextIdx])
      if (accepted) {
        btnRefs.current[nextIdx]?.focus()
      }
    }
  }

  return (
    <div
      className="baseplate-size-picker"
      role="radiogroup"
      aria-label="Baseplate size"
      onKeyDown={handleKeyDown}
    >
      {SUPPORTED_BASEPLATE_SIZES.map((size, i) => {
        const selected = size === baseplateSize
        return (
          <button
            key={size}
            ref={(el) => {
              btnRefs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`baseplate-size-btn${selected ? ' baseplate-size-btn--selected' : ''}`}
            onClick={() => handleSelect(size)}
          >
            <Grid3X3
              className="baseplate-size-btn__icon"
              size={14}
              aria-hidden={true}
              focusable={false}
            />
            <span className="baseplate-size-btn__label">
              {size} × {size}
            </span>
            <span className="baseplate-size-btn__compact" aria-hidden={true}>
              {size}
            </span>
          </button>
        )
      })}
    </div>
  )
}
