import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173/'
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome']
      }
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad (gen 7)'],
        browserName: 'chromium'
      }
    },
    // Narrow mobile viewport (360×640) used by the UX gallery capture spec.
    {
      name: 'narrow-mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 360, height: 640 },
        isMobile: true,
        hasTouch: true,
      },
      // Limit to the UX gallery spec and the front-door-polish spec so existing tests are not affected.
      testMatch: ['**/ux-gallery.e2e.test.ts', '**/front-door-polish.e2e.test.ts'],
    }
  ]
})
