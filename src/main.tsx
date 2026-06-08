import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import './styles/global.css'
import { collapseDebug } from './scene/collapseDebug'
// Import the stores through the same `@` alias the rest of the app uses. A
// relative specifier resolves to a different module instance under Vite (most
// visibly on Windows), which would expose a duplicate store on `window` that
// does not reflect the app's actual state.
import { useStore } from '@/state/useStore'
import { useBuildStore } from '@/state/store'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Expose the Zustand store on window during development so Playwright tests
// can interact with the build state directly.
if (import.meta.env.DEV) {
  window.__blockyStore = useBuildStore
  window.__legacyStore = useStore // Keep legacy store for perf tests
  window.__blockyCollapseDebug = collapseDebug
}
