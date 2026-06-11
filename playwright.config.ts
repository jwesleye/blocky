import { defineConfig, devices } from '@playwright/test'

// https://playwright.dev/docs/test-configuration

// Matches load-perf.spec.ts on both POSIX and Windows path separators.
// This spec uses CDP (newCDPSession) which is Chromium-only; excluding it from
// Firefox/WebKit/tablet prevents deterministic non-product failures in those projects.
const CDP_ONLY_SPECS = /[/\\]perf[/\\]load-perf\.spec\.ts$/

export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts', 'perf/**/*.spec.ts'],
  fullyParallel: true,
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: CDP_ONLY_SPECS,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: CDP_ONLY_SPECS,
    },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
      testIgnore: CDP_ONLY_SPECS,
    },
  ],
  webServer: {
    command:
      'npm run build -- --mode e2e && npm run preview -- --host 127.0.0.1 --port 4174',
    cwd: process.cwd(),
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
