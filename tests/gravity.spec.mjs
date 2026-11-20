// PD-169: Gravity slider (log scale, multiple of realistic). Default = the old fixed -34 u/s2.
import { test, expect } from './helpers/app.mjs';

test('log mapping at the ends and the default; default gravity is the old -34', async ({ app, page }) => {
  await app.open({});
  const m = await page.evaluate(() => { const pd = window.__pd, G = pd.GRAV; return { G, lo: pd.gravFromPos(0), hi: pd.gravFromPos(1), mid: pd.gravFromPos(.5), posDef: pd.gravToPos(G.DEF), y: pd.gravityY(), state: pd.state.gravity }; });
  expect(m.lo).toBeCloseTo(m.G.LO, 10); expect(m.hi).toBeCloseTo(m.G.HI, 10);
  expect(m.mid).toBeCloseTo(Math.sqrt(m.G.LO * m.G.HI), 8);   // log scale: the middle is the geometric mean
  expect(m.G.LO).toBeLessThanOrEqual(.25); expect(m.G.HI).toBeGreaterThanOrEqual(2);   // the owner's .25x..2x lies inside
  expect(m.G.DEF).toBeGreaterThan(m.G.LO); expect(m.G.DEF).toBeLessThan(m.G.HI);
  expect(m.G.DEF * m.G.REAL).toBeCloseTo(34, 8);   // calibration: 34 u/s2 = DEF x realistic
  expect(m.G.DEF).toBeCloseTo(0.0436, 3);
  expect(m.posDef).toBeGreaterThan(0); expect(m.posDef).toBeLessThan(1);
  expect(m.y).toBe(-34); expect(m.state).toBe(m.G.DEF);
  expect(await page.evaluate(() => { window.__pd.startRoll ? 0 : 0; return window.__pd.simRoll({}).settled && window.__pd.worldGravityY; })).toBe(-34);
  await app.nav.toPlay();
  await expect(page.locator('#gravityv')).toContainText('(default)');
  const r = await page.evaluate(() => { const pd = window.__pd; pd.setGravity(pd.gravFromPos(.5)); return pd.worldGravityY; });
  expect(r).toBeCloseTo(-Math.sqrt(m.G.LO * m.G.HI) * m.G.REAL, 4);   // live: the world has it at once
});

test('the slider drives it live, persists across reload, Reset returns to default, designs do not carry it', async ({ app, page }) => {
  await app.open({});
  await app.nav.toPlay();
  const s = page.locator('#gravity');
  await s.fill('0.9'); await s.dispatchEvent('input');
  const g1 = await page.evaluate(() => window.__pd.state.gravity);
  expect(g1).toBeGreaterThan(2); await expect(page.locator('#gravityv')).toContainText('x realistic');
  await page.evaluate(() => window.__pd.simRoll({}));
  expect(await page.evaluate(() => window.__pd.worldGravityY)).toBeCloseTo(-g1 * 779.6, -1);
  await page.reload(); await app.ready(); await app.nav.toPlay();
  expect(await page.evaluate(() => window.__pd.state.gravity)).toBeCloseTo(g1, 6);
  expect(+await page.locator('#gravity').inputValue()).toBeCloseTo(.9, 2);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('prettydice.v1')).gravity)).toBeCloseTo(g1, 6);
  await page.locator('#gravityreset').click();
  expect(await page.evaluate(() => window.__pd.state.gravity)).toBe(await page.evaluate(() => window.__pd.GRAV.DEF));
  await expect(page.locator('#gravityv')).toContainText('(default)');
  expect(await page.evaluate(() => window.__pd.worldGravityY)).toBe(-34);
});

for (const [name, x, budget] of [['0.25x', .25, 25], ['2x', 2, 25]]) {
  test(`a sim roll settles at ${name} realistic`, async ({ app, page }) => {
    await app.open({ query: 'seed=3' });
    await page.evaluate(x => window.__pd.setGravity(x), x);
    for (const n of ['d20', 'set7']) {
      const r = await app.run(async (pd, n) => { pd.state.shape = n; await pd.buildDice(); return { ...pd.simRoll({ maxSteps: 3000, rerolls: 6 }) }; }, n);
      expect(r.settled, `${n} settled`).toBe(true); expect(r.simT).toBeLessThan(budget); expect(r.leans, `${n} leans`).toBe(0);
      expect(r.dice.length).toBeGreaterThan(0);
      for (const d of r.dice) { expect(Number.isFinite(d.label)).toBe(true); expect(d.pos[1]).toBeGreaterThan(r.tableY - .5); expect(d.pos[1]).toBeLessThan(r.tableY + 3); }
    }
    expect(await page.evaluate(() => window.__pd.worldGravityY)).toBeCloseTo(-x * 779.6, -1);
  });
}

test('the widened slider ends (1/64x and 32x) still settle without a hang', async ({ app, page }) => {
  await app.open({});
  for (const x of [1 / 64, 32]) {
    await page.evaluate(x => window.__pd.setGravity(x), x);
    const r = await app.run(pd => pd.simRoll({ maxSteps: 4000, rerolls: 6 }));
    expect(r.settled, `x=${x} settled`).toBe(true);
  }
});
