// Test suite config. Design: docs/design/testing.md
import { defineConfig } from '@playwright/test';

const PORT = 8124;
const STATE_SPECS = /(logic|physics)\.spec\.mjs$/;   // specs on the `shared` page only
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
    // Software WebGL (SwiftShader). 2D canvas stays on Skia's CPU rasterizer: GPU-accelerated 2D canvas on SwiftShader
    // made atlas/filigree drawing ~25x slower (one filigree build took ~60 s) and was the main cost of the suite (PD-20.7).
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-accelerated-2d-canvas', '--autoplay-policy=no-user-gesture-required'] },
  },
  // Shared-page specs and fresh-page specs live in separate projects, so they run in separate workers and browsers:
  // in a browser that also holds the paused shared page, a new page's WebGL context takes ~18 s to create (PD-20.7).
  // The fixtures enforce this split (tests/helpers/app.mjs). `--project='fast-*'` runs both.
  projects: [
    { name: 'fast-state', testMatch: STATE_SPECS },
    { name: 'fast-ui', testIgnore: [/slow\//, STATE_SPECS] },
    { name: 'slow', testMatch: /slow\/.*\.spec\.mjs/ },
  ],
  webServer: { command: `node scripts/serve.mjs ${PORT}`, url: `http://127.0.0.1:${PORT}/index.html`, reuseExistingServer: !process.env.CI },
});
