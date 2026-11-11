// Shared fixture: a deterministic Pretty Dice page.
// - ?seed=N makes the app's own RNG (looks, throws) reproducible; Math.random is seeded too, for three.js ids and audio.
// - Each test gets a fresh browser context (empty localStorage) and loads ?libs=local (no network).
// - Any pageerror or console.error fails the test.
import { test as base, expect } from '@playwright/test';

export { expect };

export const test = base.extend({
  app: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    const app = {
      page,
      errors,
      /** Load the app. query: extra URL params (string). seed: Math.random seed. storage: object written to localStorage first. */
      async open({ query = '', seed = 1, storage = null } = {}) {
        await page.addInitScript(({ seed, storage }) => {
          let a = seed >>> 0;
          Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
          if (storage && !sessionStorage.getItem('pd-test-seeded')) {   // only on the first load, so reload tests see what the app saved
            for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
            sessionStorage.setItem('pd-test-seeded', '1');
          }
        }, { seed, storage });
        await page.goto(`/index.html?libs=local&seed=${seed}${query ? '&' + query : ''}`);
        await app.ready();
      },
      async ready() {
        await page.waitForFunction(() => window.__ready === true && window.__pd, null, { timeout: 60_000 });
        await page.evaluate(() => document.fonts.ready);
      },
      /** Run fn(pd, arg) in the page, where pd is window.__pd. */
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
    };
    await use(app);
    expect(errors, 'page errors / console errors').toEqual([]);
  },
});
