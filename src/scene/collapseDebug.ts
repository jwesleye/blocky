/**
 * Dev-only observability hook for the collapse animation.
 *
 * The {@link Scene} keeps `window.__blockyCollapseDebug.dynamicBodyCount`
 * in sync with the active collapse.
 */
export interface CollapseDebug {
  dynamicBodyCount: number
}

export const collapseDebug: CollapseDebug = {
  dynamicBodyCount: 0,
}
