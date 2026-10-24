import { defineConfig, devices } from '@playwright/test'

const PORT = 5174
// E2E_BASE_URL runs the suite against an already deployed site (no local server).
const remote = process.env.E2E_BASE_URL
// Explicit IPv4: "localhost" may resolve to ::1 for the server and 127.0.0.1 for the browser.
const baseURL = remote ?? `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 45_000,
  expect: {
    timeout: 8_000,
    // Visual baselines: tolerate anti-aliasing noise only.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  // Tests run against the production build (same bundle that is deployed). The dev server
  // compiles modules on demand and could not keep up with parallel workers.
  webServer: remote
    ? undefined
    : {
        command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { VITE_ENABLE_MOCKS: 'true' },
      },
})
