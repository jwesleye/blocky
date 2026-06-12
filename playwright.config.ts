import { defineConfig, devices } from '@playwright/test'

// https://playwright.dev/docs/test-configuration

export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts'],
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
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
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
