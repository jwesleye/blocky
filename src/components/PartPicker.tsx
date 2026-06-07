import { PART_TYPE_LABELS, PARTS_CATALOG, type PartType } from '@/domain/parts/catalog'

interface PartPickerProps {
  selected: string
  onSelect: (id: string) => void
}

const PART_TYPE_ORDER: PartType[] = ['brick', 'plate', 'tile', 'slope', 'round']

export function PartPicker({ selected, onSelect }: PartPickerProps) {
  return (
    <div className="part-picker">
      {PART_TYPE_ORDER.map((type) => {
        const parts = PARTS_CATALOG.filter((p) => p.type === type)
        return (
          <section key={type} className="part-group">
            <h3 className="part-group__label">{PART_TYPE_LABELS[type]}</h3>
            <div role="radiogroup" aria-label={PART_TYPE_LABELS[type]} className="part-group__items">
              {parts.map((part) => (
                <button
                  key={part.id}
                  role="radio"
                  aria-checked={selected === part.id}
                  className={`part-btn${selected === part.id ? ' part-btn--selected' : ''}`}
                  onClick={() => onSelect(part.id)}
                >
                  {part.name}
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
