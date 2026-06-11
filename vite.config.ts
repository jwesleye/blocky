import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { gzipSync } from 'node:zlib'

import {
  BUNDLE_ENTRY_BUDGET_KIB,
  BUNDLE_ENTRY_BUDGET_BYTES,
  BUNDLE_CHUNK_WARNING_LIMIT_KIB,
} from './tests/perf/budgets'

export function getManualChunkName(id: string) {
  if (
    id.includes('node_modules/react') ||
    id.includes('node_modules/react-dom')
  ) {
    return 'react-vendor'
  }
  if (
    id.includes('node_modules/three') ||
    id.includes('node_modules/@react-three/fiber') ||
    id.includes('node_modules/@react-three/drei')
  ) {
    return 'three-vendor'
  }
  if (
    id.includes('node_modules/@react-three/rapier') ||
    id.includes('node_modules/@dimforge') ||
    id.includes('node_modules/@pmndrs/rapier')
  ) {
    return 'physics-vendor'
  }

  return undefined
}

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
    // enforcement is handled by enforceBundleBudget above. BUNDLE_CHUNK_WARNING_LIMIT_KIB
    // is a documented exception for the Three.js/Rapier runtime chunks, which are
    // large uncompressed but still pass the gzip entry gate.
    chunkSizeWarningLimit: BUNDLE_CHUNK_WARNING_LIMIT_KIB,
    rollupOptions: {
      output: {
        manualChunks: getManualChunkName,
      },
    },
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
