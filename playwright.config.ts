import { defineConfig, devices } from '@playwright/test'

// https://playwright.dev/docs/test-configuration

// Match perf specs on both POSIX and Windows path separators.
// Non-Chromium projects skip all perf specs; Chromium runs everything.
const PERF_SPECS = /[/\\]perf[/\\].*\.spec\.ts$/

export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts', 'perf/**/*.spec.ts'],
  fullyParallel: true,
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          // Disable session restore to prevent Firefox teardown race:
          // "can't access property _maybeDontRestoreTabs, this._windows[aWindow.__SSi] is undefined"
          firefoxUserPrefs: {
            'browser.sessionstore.resume_from_crash': false,
            'browser.sessionstore.max_resumed_crashes': -1,
          },
        },
      },
      testIgnore: PERF_SPECS,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: PERF_SPECS,
    },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
      testIgnore: PERF_SPECS,
    },
  ],
  webServer: {
    command:
      'npm run build -- --mode e2e && npm run preview -- --host localhost --port 4174',
    cwd: process.cwd(),
    url: 'http://localhost:4174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
