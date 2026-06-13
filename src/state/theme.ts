import { create } from 'zustand'

export type ThemePreference = 'auto' | 'light' | 'dark'
export type ResolvedTheme = Exclude<ThemePreference, 'auto'>

export interface ThemeState {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
  syncResolvedTheme: () => void
}

const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(THEME_MEDIA_QUERY).matches
  ) {
    return 'dark'
  }

  return 'light'
}

function resolveTheme(theme: ThemePreference): ResolvedTheme {
  return theme === 'auto' ? getSystemTheme() : theme
}

function applyThemeAttribute(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'auto',
  resolvedTheme: resolveTheme('auto'),
  setTheme: (theme) => {
    const resolvedTheme = resolveTheme(theme)
    applyThemeAttribute(resolvedTheme)
    set({ theme, resolvedTheme })
  },
  syncResolvedTheme: () => {
    const resolvedTheme = resolveTheme(get().theme)
    applyThemeAttribute(resolvedTheme)
    set({ resolvedTheme })
  },
}))

export function initializeTheme() {
  useThemeStore.getState().syncResolvedTheme()

  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {}
  }

  const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY)
  const handleChange = () => {
    if (useThemeStore.getState().theme !== 'auto') return
    useThemeStore.getState().syncResolvedTheme()
  }

  mediaQuery.addEventListener('change', handleChange)

  return () => {
    mediaQuery.removeEventListener('change', handleChange)
  }
}
