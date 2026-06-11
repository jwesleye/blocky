import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('vite.config chunkSizeWarningLimit', () => {
  // Importing vite.config.ts directly fails in the jsdom environment because
  // esbuild (loaded by the react plugin) requires a native TextEncoder that
  // jsdom shadows. Source-text assertion is equally reliable for guarding
  // against regression of this specific mis-assignment.
  const configSource = fs.readFileSync(
    path.resolve(__dirname, '../../vite.config.ts'),
    'utf8',
  )

  it('does not set chunkSizeWarningLimit to the gzip budget constant', () => {
    // Vite's chunkSizeWarningLimit measures uncompressed size; BUNDLE_ENTRY_BUDGET_KIB
    // is a gzip ceiling. Equating the two causes a spurious Rollup warning on
    // every passing build because production bundles are typically 1500–2500 KiB
    // uncompressed while still under 500 KiB gzip. The authoritative gate is the
    // enforceBundleBudget plugin.
    expect(configSource).not.toMatch(
      /chunkSizeWarningLimit\s*:\s*BUNDLE_ENTRY_BUDGET_KIB/,
    )
  })

  it('uses BUNDLE_CHUNK_WARNING_LIMIT_KIB for chunkSizeWarningLimit', () => {
    expect(configSource).toMatch(
      /chunkSizeWarningLimit\s*:\s*BUNDLE_CHUNK_WARNING_LIMIT_KIB/,
    )
  })

  it('defines a react-vendor manual chunk group', () => {
    expect(configSource).toMatch(/react-vendor/)
  })

  it('defines a three-vendor manual chunk group', () => {
    expect(configSource).toMatch(/three-vendor/)
  })

  it('defines a physics-vendor manual chunk group', () => {
    expect(configSource).toMatch(/physics-vendor/)
  })
})
