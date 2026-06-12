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
})
