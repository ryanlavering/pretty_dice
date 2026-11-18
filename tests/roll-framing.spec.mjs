// PD-142.38.61: resting dice sit about 46-48% up from the bottom of the stage (.38.61 put them at ~40%, .38.65 backed that off by 30%; was ~55% before .61) in every Play layout.
import { test, expect } from './helpers/app.mjs';
import { navFor } from './helpers/nav.mjs';
const LAYOUTS = { 'desktop pane': [1280, 800, false, false], 'desktop full': [1280, 800, false, true], 'phone portrait': [390, 740, true, false], 'phone portrait full': [390, 740, true, true], 'phone landscape': [740, 360, true, false], 'phone landscape full': [740, 360, true, true] };
const SHOTS = process.env.FRAMING_SHOTS;   // e.g. docs/design/screenshots/2026-11-18-61-after (screenshots only on request)
for (const [name, [w, h, touch, full]] of Object.entries(LAYOUTS)) test(`resting dice sit 43-52% up from the bottom: ${name}`, async ({ browser, baseURL }) => {
  test.setTimeout(150_000);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, baseURL });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  try {
    await page.addInitScript(() => { let a = 3; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
    await page.goto('/index.html?libs=local&seed=3'); await page.waitForFunction(() => window.__ready && window.__pd, null, { timeout: 120_000 });
    const nav = navFor(page); await nav.toPlay(); if (full) await nav.fullView(true);
    await page.evaluate(() => window.__pd.simRoll()); await page.waitForTimeout(1200);
    const r = await page.evaluate(() => { const pd = window.__pd; pd.pause(); pd.renderOnce(); const ys = pd.dice.map(d => ((d.mesh.getWorldPosition(new d.mesh.position.constructor()).project(pd.camera).y + 1) / 2) * 100); return { ys, mean: ys.reduce((a, b) => a + b, 0) / ys.length }; });
    console.log(`FRAMING ${name}: ${r.mean.toFixed(1)}% from the bottom`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}-${name.replace(/ /g, '-')}.png` });
    expect(r.mean, name).toBeGreaterThan(43); expect(r.mean, name).toBeLessThan(52);
    expect(errs).toEqual([]);
  } finally { await ctx.close(); }
});
