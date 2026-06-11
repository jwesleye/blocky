import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { gzipSync } from 'node:zlib'

import {
  BUNDLE_ENTRY_BUDGET_KIB,
  BUNDLE_ENTRY_BUDGET_BYTES,
} from './tests/perf/budgets'

function enforceBundleBudget() {
  return {
    name: 'enforce-bundle-budget',
    generateBundle(_options: unknown, bundle: Record<string, unknown>) {
      const entryChunks = Object.values(bundle).filter(
        (
          output,
        ): output is {
          type: string
          isEntry?: boolean
          fileName: string
          code: string
        } =>
          typeof output === 'object' &&
          output !== null &&
          'type' in output &&
          output.type === 'chunk' &&
          'isEntry' in output &&
          output.isEntry === true &&
          'fileName' in output &&
          typeof output.fileName === 'string' &&
          output.fileName.endsWith('.js') &&
          'code' in output &&
          typeof output.code === 'string',
      )

      for (const chunk of entryChunks) {
        const gzipBytes = gzipSync(chunk.code).byteLength

        if (gzipBytes > BUNDLE_ENTRY_BUDGET_BYTES) {
          throw new Error(
            `Bundle budget exceeded: ${chunk.fileName} is ${gzipBytes} bytes gzip (limit: ${BUNDLE_ENTRY_BUDGET_BYTES} bytes gzip / ${BUNDLE_ENTRY_BUDGET_KIB} KiB).`,
          )
        }
      }
    },
  }
}

// https://vite.dev/config/  |  https://vitest.dev/config/
export default defineConfig({
  plugins: [react(), enforceBundleBudget()],
  build: {
    // Vite's chunkSizeWarningLimit is an uncompressed-size threshold. The gzip
    // enforcement is handled by enforceBundleBudget above. Set this to a value
    // that matches the actual uncompressed bundle size so the Rollup warning
    // does not fire on every passing build.
    chunkSizeWarningLimit: 3000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // Deduplicate three.js and fiber so excluded @react-three/drei uses the
    // same instance as the rest of the app (avoids multiple-Three warnings
    // and infinite render loops when drei is not pre-bundled).
    dedupe: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  optimizeDeps: {
    // @react-three/drei is pure ESM; excluding from pre-bundling avoids a
    // Vite 6.x issue where the bundle write stalls in some environments.
    // stats.js is CJS and must be explicitly included so Vite adds an interop
    // shim (drei imports it directly when drei itself is excluded).
    exclude: ['@react-three/drei'],
    include: ['stats.js'],
  },
  server: {
    // Listen on all interfaces so the dev server is reachable from a container.
    host: true,
    port: 5173,
  },
})
