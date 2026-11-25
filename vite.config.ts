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

export default defineConfig({
  plugins: [react(), enforceBundleBudget()],
  build: {
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

    dedupe: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  optimizeDeps: {
    exclude: ['@react-three/drei'],
    include: ['stats.js'],
  },
  server: {
    host: true,
    port: 5173,
  },
})
