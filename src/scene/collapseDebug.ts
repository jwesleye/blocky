/**
 * Dev-only observability hook for the collapse animation.
 *
 * WebGL/Rapier bodies are not DOM-queryable, so the Playwright smoke test cannot
 * assert "a dynamic body exists during the animation" by inspecting the DOM.
 * The {@link Scene} keeps this counter in sync with the active collapse so the
 * test can read `window.__blockyCollapseDebug.dynamicBodyCount` instead.
 */
export interface CollapseDebug {
  dynamicBodyCount: number
}

export const collapseDebug: CollapseDebug = {
  dynamicBodyCount: 0,
}
