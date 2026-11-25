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

if (shouldExposeTestHooks) {
  window.__blockyStore = useBuildStore
  window.__blockyCursorStore = useCursorStore
  window.__blockyCollapseDebug = collapseDebug

  import('./testing/collapsePerfHarness')
    .then((harness) => {
      window.__blockyCollapsePerf = harness
    })
    .catch((err: unknown) => {
      window.__blockyCollapsePerfError =
        err instanceof Error ? err.message : String(err)
    })
  import('./testing/renderPerfHarness').then((harness) => {
    window.__blockyRenderPerf = harness
  })
}
