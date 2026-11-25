import { defineConfig } from '@playwright/test'

// Browser flows for the platform pages. Uses the installed Google Chrome (no browser download).
// E2E_BASE_URL points at a dev server that is already running; without it one is started on 3100.
const external = process.env.E2E_BASE_URL
const baseURL = external ?? 'http://localhost:3100'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL,
    channel: 'chrome',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    permissions: ['clipboard-read', 'clipboard-write'],
    launchOptions: { slowMo: Number(process.env.E2E_SLOWMO ?? 0) },
  },
  webServer: external
    ? undefined
    : { command: 'pnpm dev --port 3100', url: baseURL, reuseExistingServer: true, timeout: 120_000 },
})
