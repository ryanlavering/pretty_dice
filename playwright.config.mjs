// Test suite config. Design: docs/design/testing.md
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PD_PORT) || 8124;   // worktrees set PD_PORT so they do not reuse another checkout's server
const inDocker = !!process.env.PD_DOCKER;   // visual baselines are only made and compared inside the pinned image

export default defineConfig({
  testDir: 'tests',
  timeout: process.env.CI ? 150_000 : 90_000,   // software WebGL on a 4-core runner is slow
  expect: { timeout: 15_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  fullyParallel: true,
  workers: process.env.PD_WORKERS ? +process.env.PD_WORKERS : process.env.CI ? 1 : 2,   // 4-core CI runner: one browser gets every core   // software WebGL is CPU-heavy; keep this low
  retries: 1,   // a lone boot timeout under CPU load (software WebGL uses every core) shows as 'flaky' instead of failing; real bugs fail both tries
  forbidOnly: !!process.env.CI,
  ignoreSnapshots: !inDocker,
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],   // github: failures show as run annotations
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 960, height: 600 },   // fewer pixels for software WebGL; visual specs set their own size
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
