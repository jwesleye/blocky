import { Monitor, Moon, Sun } from 'lucide-react'

import { type ThemePreference, useThemeStore } from '@/state/theme'

const OPTIONS: {
  value: ThemePreference
  label: string
  Icon: React.FC<{ size: number }>
}[] = [
  { value: 'auto', label: 'Auto', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

export const ThemeToggle: React.FC = () => {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          className={`theme-toggle__button${theme === value ? ' active' : ''}`}
          onClick={() => setTheme(value)}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  )
}
