/// <reference types="vite/client" />

declare global {
  interface Window {
    __blockyStore?: typeof import('./state/store').useBuildStore
    __legacyStore?: typeof import('./state/useStore').useStore
    __blockyCollapseDebug?: import('./scene/collapseDebug').CollapseDebug
  }
}

export {}
