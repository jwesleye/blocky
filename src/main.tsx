import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import './styles/global.css'
import { collapseDebug } from './scene/collapseDebug'
import { useBuildStore } from '@/state/store'
import { useCursorStore } from '@/state/cursor'
import { initializeTheme } from '@/state/theme'

const shouldExposeTestHooks =
  import.meta.env.DEV || import.meta.env.MODE === 'e2e'

initializeTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Expose the Zustand store on window during development so Playwright tests
// can interact with the build state directly.
if (shouldExposeTestHooks) {
  window.__blockyStore = useBuildStore
  window.__blockyCursorStore = useCursorStore
  window.__blockyCollapseDebug = collapseDebug

  // Lazy-load the perf harness to keep the production bundle lean
  import('./testing/collapsePerfHarness').then((harness) => {
    window.__blockyCollapsePerf = harness
  })
}
