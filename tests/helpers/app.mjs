// Shared fixture: a deterministic Pretty Dice page.
// - ?seed=N makes the app's own RNG (looks, throws) reproducible; Math.random is seeded too, for three.js ids and audio.
// - Each test gets a fresh browser context (empty localStorage) and loads ?libs=local (no network).
// - Any pageerror, console.error or alert/confirm dialog fails the test.
import { test as base, expect } from '@playwright/test';

export { expect };

const seedMath = seed => {   // init script: seed Math.random too (three.js ids, audio); the app's own RNG comes from ?seed=
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};

const watch = page => {
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  page.on('dialog', d => { errors.push(`${d.type()}: ${d.message()}`); d.dismiss().catch(() => {}); });   // alerts mean something went wrong
  return errors;
};

const ready = async page => {
  await page.waitForFunction(() => window.__ready === true && window.__pd, null, { timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
};

/** Helpers shared by both fixtures. */
const helpers = page => ({
  page,
  ready: () => ready(page),
  /** Run fn(pd, arg) in the page, where pd is window.__pd. fn is sent as source, so it cannot close over test variables. */
  run(fn, arg) {
    return page.evaluate(([src, arg]) => (0, eval)(`(${src})`)(window.__pd, arg), [fn.toString(), arg]);
  },
  /** Render one frame with the loop paused and return simple canvas statistics (no baseline needed). */
  canvasStats() {
    return page.evaluate(async () => {
      const pd = window.__pd; pd.pause(); pd.renderOnce();
      const url = pd.canvas.toDataURL('image/png'); pd.resume();
      const img = new Image(); img.src = url; await img.decode();
      const w = 160, h = Math.round(160 * img.height / img.width), c = new OffscreenCanvas(w, h), g = c.getContext('2d');
      g.drawImage(img, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data; let sum = 0, sum2 = 0, cx = 0, cy = 0, mass = 0;
      const lum = []; for (let i = 0; i < d.length; i += 4) lum.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
      const bg = lum[0];   // top-left corner is background
      lum.forEach((l, i) => { sum += l; sum2 += l * l; const dv = Math.abs(l - bg); if (dv > 12) { mass++; cx += i % w; cy += Math.floor(i / w); } });
      const n = lum.length, mean = sum / n;
      return { width: img.width, height: img.height, mean, std: Math.sqrt(sum2 / n - mean * mean), coverage: mass / n,
        centroid: mass ? [cx / mass / w, cy / mass / h] : null };
    });
  },
});

export const test = base.extend({
  /** Fresh page per test (empty localStorage). Call app.open() first. */
  app: async ({ page }, use) => {
    const errors = watch(page);
    const app = {
      ...helpers(page),
      errors,
      /** Load the app. query: extra URL params (string). seed: RNG seed. storage: object written to localStorage before the first load. */
      async open({ query = '', seed = 1, storage = null } = {}) {
        await page.addInitScript(seedMath, seed);
        if (storage) await page.addInitScript(storage => {
          if (sessionStorage.getItem('pd-test-seeded')) return;   // only on the first load, so reload tests see what the app saved
          for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          sessionStorage.setItem('pd-test-seeded', '1');
        }, storage);
        await page.goto(`/index.html?libs=local&seed=${seed}${query ? '&' + query : ''}`);
        await ready(page);
      },
    };
    await use(app);
    expect(errors, 'page errors / console errors').toEqual([]);
  },

  /** One booted, paused page per worker, for tests that only drive __pd state (physics). Booting dominates test time.
   *  shared.reset(seed) reseeds the app RNG, exits any roll and restores the design the page booted with,
   *  so each test starts from the same state whatever ran before it. Errors are still checked per test. */
  _sharedPage: [async ({ browser }, use, workerInfo) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, baseURL: workerInfo.project.use.baseURL });
    const page = await ctx.newPage(), errors = watch(page);
    await page.addInitScript(seedMath, 1);
    await page.goto('/index.html?libs=local&seed=1'); await ready(page);
    await page.evaluate(() => { window.__pd.pause(); window.__pdBoot = window.__pd.designToJSON(); });
    await use({ page, errors });
    await ctx.close();
  }, { scope: 'worker' }],

  shared: async ({ _sharedPage }, use) => {
    const { page, errors } = _sharedPage; errors.length = 0;
    const shared = {
      ...helpers(page),
      errors,
      async reset(seed = 1) {
        await page.evaluate(async seed => {
          const pd = window.__pd; pd.pause(); if (pd.rolling) pd.exitRoll(true);
          await pd.loadDesign(structuredClone(window.__pdBoot)); pd.state.randshape = false; pd.reseed(seed);
        }, seed);
      },
    };
    await use(shared);
    expect(errors, 'page errors / console errors').toEqual([]);
  },
});
