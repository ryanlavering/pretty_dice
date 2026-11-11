// Test suite config. Design: docs/design/testing.md
import { defineConfig } from '@playwright/test';

const PORT = 8124;
const inDocker = !!process.env.PD_DOCKER;   // visual baselines are only made and compared inside the pinned image

export default defineConfig({
  testDir: 'tests',
  timeout: 90_000,
  expect: { timeout: 15_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  fullyParallel: true,
  workers: process.env.PD_WORKERS ? +process.env.PD_WORKERS : 2,   // software WebGL is CPU-heavy; keep this low
  retries: 1,   // a lone boot timeout under CPU load (software WebGL uses every core) shows as 'flaky' instead of failing; real bugs fail both tries
  forbidOnly: !!process.env.CI,
  ignoreSnapshots: !inDocker,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] },
  },
  projects: [
    { name: 'fast', testIgnore: /slow\// },
    { name: 'slow', testMatch: /slow\/.*\.spec\.mjs/ },
  ],
  webServer: { command: `node scripts/serve.mjs ${PORT}`, url: `http://127.0.0.1:${PORT}/index.html`, reuseExistingServer: !process.env.CI },
});
