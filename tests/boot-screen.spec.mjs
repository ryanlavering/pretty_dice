// PD-142.36: the boot screen names the step, counts steps once as 'step N of M', shows the elapsed time once, and the die never touches the text.
import { test, expect } from '@playwright/test';

const URL = (q = '') => `/index.html?libs=local&seed=1${q}`;
const screenText = page => page.evaluate(() => ({ msg: document.getElementById('bootmsg').textContent, log: document.getElementById('bootlog').textContent }));

// ?boothold=N keeps the loading screen up for N s; it must stay under 10 s or the app's own 'No progress for 10 s' watchdog replaces it with the error message.
test('boot log: step name, step N of M, elapsed time once', async ({ page }) => {
  await page.goto(URL('&boothold=9'));
  await page.waitForFunction(() => /Holding/.test(document.getElementById('bootmsg')?.textContent || ''), null, { timeout: 60_000 });
  // everything in one call, so nothing races the end of the hold
  const r = await page.evaluate(async () => {
    const log = () => document.getElementById('bootlog').textContent, secs = t => +t.match(/· ([\d.]+) s/)[1];
    const held = { msg: document.getElementById('bootmsg').textContent, log: log() };
    let moved = false;
    for (let i = 0; i < 20 && !moved; i++) { await new Promise(res => setTimeout(res, 150)); moved = secs(log()) > secs(held.log); }
    window.__bootStage('Doing a thing', 0.5);
    return { held, moved, named: { msg: document.getElementById('bootmsg').textContent, log: log() } };
  });
  expect(r.held.msg).toMatch(/^Holding the loading screen/);
  expect(r.held.log).toMatch(/^step 8 of 8 · \d+\.\d s$/);                // one clock, no 'step 3.1 s', no per-step milliseconds
  expect(r.held.log.match(/\d+\.\d s/g)).toHaveLength(1);
  expect(r.moved, 'the elapsed clock keeps running').toBe(true);
  expect(r.named.msg).toBe('Doing a thing');
  expect(r.named.log).toMatch(/^step 9 of 9 · /);                          // never reads 'step 9 of 8'
});

test('the 8 steps in the loader match a real start, in order', async ({ page }) => {
  await page.goto(URL());
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 });
  const labels = await page.evaluate(() => window.__bootStages.map(s => s.label));
  expect(labels).toHaveLength(8);                                         // if this changes, update STEPS in the boot script of index.html
  expect(labels[0]).toBe('Starting'); expect(labels.at(-1)).toBe('Almost there');
  expect(labels).toContain('Setting up the 3D scene');
});

for (const [w, h] of [[360, 640], [390, 844]]) {
  test(`the die animation never overlaps the text at ${w}x${h}`, async ({ page }) => {   // the previous layout overlapped the log line here by about 10px
    test.setTimeout(120_000);
    await page.setViewportSize({ width: w, height: h });
    await page.goto(URL('&boothold=9'));
    await page.waitForFunction(() => /Holding/.test(document.getElementById('bootmsg')?.textContent || ''), null, { timeout: 60_000 });
    // scrub the die's CSS animations through a full cycle (the 4.5 s tumble is 3 hops of 1.5 s, so every pose at every height) instead of waiting in real time,
    // and compare the six faces' bounding boxes with every text block
    const r = await page.evaluate(() => {
      const anims = document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#bootdice'));
      anims.forEach(a => a.pause());
      const faces = [...document.querySelectorAll('#bootdice .f')], texts = ['#bootbox > div:not(#bootdice):not(:has(#bootbar))', '#bootmsg', '#bootlog'].flatMap(q => [...document.querySelectorAll(q)]);
      const box = e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      const union = { l: 1e9, t: 1e9, r: -1e9, b: -1e9 };
      for (let ms = 0; ms < 4500; ms += 30) {
        anims.forEach(a => { a.currentTime = ms; });
        for (const f of faces) { const b = box(f); union.l = Math.min(union.l, b.l); union.t = Math.min(union.t, b.t); union.r = Math.max(union.r, b.r); union.b = Math.max(union.b, b.b); }
      }
      return { animations: anims.length, visible: getComputedStyle(document.getElementById('boot')).display !== 'none', union, texts: texts.map(e => ({ id: e.id || e.textContent.slice(0, 12), ...box(e) })), vw: innerWidth };
    });
    expect(r.animations, 'hop, tumble and shadow animations found').toBe(3);
    expect(r.visible, 'the boot screen was still up for the whole measurement').toBe(true);
    expect(r.union.r - r.union.l).toBeGreaterThan(30);                          // the die was measured (a hidden screen would give empty rects)
    expect(r.texts.length).toBeGreaterThanOrEqual(3);
    for (const t of r.texts) {
      const overlap = r.union.l < t.r && r.union.r > t.l && r.union.t < t.b && r.union.b > t.t;
      expect(overlap, `the die reached the text "${t.id}"`).toBe(false);
    }
    expect(r.union.t).toBeGreaterThanOrEqual(0); expect(r.union.l).toBeGreaterThanOrEqual(0); expect(r.union.r).toBeLessThanOrEqual(r.vw);
  });
}
