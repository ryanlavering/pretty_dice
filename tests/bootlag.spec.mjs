// Boot progress screen and the lag monitor (window.__lag). @quick: cheap, no rolls.
import { test, expect } from './helpers/app.mjs';

// Software GL keeps the page busy for a while after boot (thumbnails, first-use shader compiles): wait until the monitor has been quiet for 1.5 s, then clear it.
const settle = page => page.evaluate(async () => { let n = -1, quiet = 0; for (let i = 0; i < 200 && quiet < 15; i++) { await new Promise(r => setTimeout(r, 100)); const c = window.__lag.report().events.length; quiet = c === n ? quiet + 1 : 0; n = c; } window.__lag.clear(); });

test.describe('boot progress and lag monitor', () => {
  test('boot records its stages in order and hides the overlay @quick', async ({ app, page }) => {
    await app.open();
    const r = await page.evaluate(() => ({ stages: window.__bootStages.map(s => s.label), ms: window.__bootMs, shown: getComputedStyle(document.getElementById('boot')).display, dice: !!document.querySelector('#bootdice .cube') }));
    expect(r.stages[0]).toBe('Starting');
    for (const k of ['3D scene', 'dice', 'bag', 'shaders']) expect(r.stages.join('|'), k).toContain(k);
    expect(r.ms).toBeGreaterThan(0);
    expect(r.shown).toBe('none');
    expect(r.dice, 'rolling-dice loader is in the page').toBe(true);
  });

  test('a main-thread block is recorded with the running span and shows a toast @quick', async ({ app, page }) => {
    await app.open(); await settle(page);
    const ev = await page.evaluate(async () => {
      await new Promise(r => setTimeout(r, 300));
      window.__lag.span('test-block', () => { const t = performance.now(); while (performance.now() - t < 1300); });
      await new Promise(r => setTimeout(r, 400));
      return window.__lag.report().events.find(e => e.src === 'heartbeat');
    });
    expect(ev, 'heartbeat saw the pause').toBeTruthy();
    expect(ev.ms).toBeGreaterThan(1000);
    expect(ev.ops.map(o => o.name)).toContain('test-block');
    expect(ev.app.dice).toBeGreaterThan(0);
    await expect(page.locator('#lagtoast')).toContainText('UI paused');
  });

  test('short pauses under the threshold are ignored @quick', async ({ app, page }) => {
    await app.open(); await settle(page);
    const n = await page.evaluate(async () => { window.__lag.clear(); await new Promise(r => setTimeout(r, 200)); const t = performance.now(); while (performance.now() - t < 80); await new Promise(r => setTimeout(r, 400)); return window.__lag.report().events.filter(e => e.src === 'heartbeat').length; });
    expect(n).toBe(0);
  });
});
