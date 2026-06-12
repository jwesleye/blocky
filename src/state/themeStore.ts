import { create } from 'zustand'

export type ThemeChoice = 'auto' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export function resolveTheme(
  choice: ThemeChoice,
  mql?: MediaQueryList | { matches: boolean } | null,
): ResolvedTheme {
  if (choice !== 'auto') return choice
  const query =
    mql !== undefined ? mql : typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null
  return query?.matches ? 'dark' : 'light'
}

function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolved
  }
}

interface ThemeState {
  theme: ThemeChoice
  resolved: ResolvedTheme
  setTheme: (theme: ThemeChoice) => void
}

const initialResolved = resolveTheme('auto')
applyTheme(initialResolved)

export const useThemeStore = create<ThemeState>((set, get) => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener('change', () => {
      if (get().theme === 'auto') {
        const resolved = resolveTheme('auto')
        applyTheme(resolved)
        set({ resolved })
      }
    })
  }

  return {
    theme: 'auto',
    resolved: initialResolved,
    setTheme: (theme) => {
      const resolved = resolveTheme(theme)
      applyTheme(resolved)
      set({ theme, resolved })
    },
  }
})
