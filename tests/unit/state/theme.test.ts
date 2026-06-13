import { beforeEach, describe, expect, it, vi } from 'vitest'

import { initializeTheme, useThemeStore } from '@/state/theme'

type MatchMediaChangeListener = (event: MediaQueryListEvent) => void

function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches
  const listeners = new Set<MatchMediaChangeListener>()

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      get matches() {
        return matches
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: (_: 'change', listener: MatchMediaChangeListener) => {
        listeners.add(listener)
      },
      removeEventListener: (
        _: 'change',
        listener: MatchMediaChangeListener,
      ) => {
        listeners.delete(listener)
      },
      addListener: (listener: MatchMediaChangeListener) => {
        listeners.add(listener)
      },
      removeListener: (listener: MatchMediaChangeListener) => {
        listeners.delete(listener)
      },
      dispatchEvent: () => true,
    })),
  })

  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches
      const event = { matches, media: '(prefers-color-scheme: dark)' }
      for (const listener of listeners) {
        listener(event as MediaQueryListEvent)
      }
    },
  }
}

describe('theme store', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    document.documentElement.removeAttribute('data-theme')
    localStorage.clear()
    installMatchMedia(false)
    useThemeStore.setState({
      theme: 'auto',
      resolvedTheme: 'light',
    })
  })

  it('defaults to the auto theme preference', () => {
    expect(useThemeStore.getInitialState().theme).toBe('auto')
  })

  it('resolves auto against prefers-color-scheme and writes data-theme', () => {
    installMatchMedia(true)

    const cleanup = initializeTheme()

    expect(useThemeStore.getState().resolvedTheme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    cleanup()
  })

  it('updates the resolved theme on OS changes only while preference is auto', () => {
    const media = installMatchMedia(false)
    const cleanup = initializeTheme()

    media.setMatches(true)
    expect(useThemeStore.getState().resolvedTheme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    useThemeStore.getState().setTheme('light')
    media.setMatches(false)
    media.setMatches(true)

    expect(useThemeStore.getState().resolvedTheme).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    cleanup()
  })

  // Persistence tests
  it('restores auto preference from localStorage', () => {
    localStorage.setItem('blocky:theme', 'auto')
    const cleanup = initializeTheme()
    expect(useThemeStore.getState().theme).toBe('auto')
    cleanup()
  })

  it('restores light preference from localStorage', () => {
    localStorage.setItem('blocky:theme', 'light')
    const cleanup = initializeTheme()
    expect(useThemeStore.getState().theme).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    cleanup()
  })

  it('restores dark preference from localStorage', () => {
    localStorage.setItem('blocky:theme', 'dark')
    const cleanup = initializeTheme()
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    cleanup()
  })

  it('falls back to auto when stored value is invalid', () => {
    localStorage.setItem('blocky:theme', 'invalid-value')
    const cleanup = initializeTheme()
    expect(useThemeStore.getState().theme).toBe('auto')
    cleanup()
  })

  it('writes the chosen preference to localStorage when setTheme is called', () => {
    useThemeStore.getState().setTheme('dark')
    expect(localStorage.getItem('blocky:theme')).toBe('dark')
  })

  it('auto continues tracking OS changes live after restore', () => {
    localStorage.setItem('blocky:theme', 'auto')
    const media = installMatchMedia(false)
    const cleanup = initializeTheme()

    media.setMatches(true)
    expect(useThemeStore.getState().resolvedTheme).toBe('dark')

    cleanup()
  })

  it('explicit light preference ignores OS changes after restore', () => {
    localStorage.setItem('blocky:theme', 'light')
    const media = installMatchMedia(false)
    const cleanup = initializeTheme()

    expect(useThemeStore.getState().theme).toBe('light')
    media.setMatches(true)
    expect(useThemeStore.getState().resolvedTheme).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    cleanup()
  })
})
