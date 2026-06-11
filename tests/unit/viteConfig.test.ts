// @vitest-environment node
import { describe, expect, it } from 'vitest'

import viteConfig, { getManualChunkName } from '../../vite.config'
import { BUNDLE_CHUNK_WARNING_LIMIT_KIB } from '../perf/budgets'

describe('vite.config chunkSizeWarningLimit', () => {
  it('uses the documented uncompressed warning threshold', () => {
    expect(viteConfig.build?.chunkSizeWarningLimit).toBe(
      BUNDLE_CHUNK_WARNING_LIMIT_KIB,
    )
  })

  it('keeps the warning threshold above the known CollapseSimulation chunk size', () => {
    // The current CollapseSimulation async chunk is about 2264 KiB minified in
    // production builds. Keeping the warning threshold above that observed size
    // prevents Rollup from warning on every otherwise-passing build.
    expect(BUNDLE_CHUNK_WARNING_LIMIT_KIB).toBeGreaterThan(2264)
  })

  it('routes React modules into react-vendor', () => {
    expect(
      getManualChunkName('/project/node_modules/react-dom/client.js'),
    ).toBe('react-vendor')
  })

  it('routes Three.js modules into three-vendor', () => {
    expect(
      getManualChunkName('/project/node_modules/@react-three/drei/index.js'),
    ).toBe('three-vendor')
  })

  it('routes Rapier modules into physics-vendor', () => {
    expect(
      getManualChunkName('/project/node_modules/@dimforge/rapier3d/index.js'),
    ).toBe('physics-vendor')
  })

  it('leaves app source in the default chunk graph', () => {
    expect(
      getManualChunkName('/project/src/scene/CollapseSimulation.tsx'),
    ).toBeUndefined()
  })
})
