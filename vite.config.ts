import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { defineConfig as defineVitestConfig, mergeConfig } from 'vitest/config'

// https://vite.dev/config/  |  https://vitest.dev/config/
const viteConfig = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Listen on all interfaces so the dev server is reachable from a container.
    host: true,
    port: 5173,
  },
})

export default mergeConfig(
  viteConfig,
  defineVitestConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    },
  }),
)
