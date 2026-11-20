// PD-169: Gravity slider (log scale, multiple of realistic). Default = the old fixed -34 u/s2.
import { test, expect } from './helpers/app.mjs';

test('log mapping at the ends and the default; default gravity is the old -34', async ({ app, page }) => {
  await app.open({});
  const m = await page.evaluate(() => { const pd = window.__pd, G = pd.GRAV; return { G, lo: pd.gravFromPos(0), hi: pd.gravFromPos(1), mid: pd.gravFromPos(.5), posDef: pd.gravToPos(G.DEF), y: pd.gravityY(), state: pd.state.gravity }; });
  expect(m.lo).toBeCloseTo(m.G.LO, 10); expect(m.hi).toBeCloseTo(m.G.HI, 10);
  expect(m.mid).toBeCloseTo(Math.sqrt(m.G.LO * m.G.HI), 8);   // log scale: the middle is the geometric mean
  expect(m.G.LO).toBeLessThanOrEqual(.25); expect(m.G.HI).toBeGreaterThanOrEqual(2);   // range is 1/64x .. 2x realistic   // the owner's .25x..2x lies inside
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
  expect(g1).toBeGreaterThan(1); await expect(page.locator('#gravityv')).toContainText('x realistic');
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

test('the slider ends (1/64x and 2x) still settle without a hang', async ({ app, page }) => {
  await app.open({});
  for (const x of [1 / 64, 2]) {
    await page.evaluate(x => window.__pd.setGravity(x), x);
    const r = await app.run(pd => pd.simRoll({ maxSteps: 4000, rerolls: 6 }));
    expect(r.settled, `x=${x} settled`).toBe(true);
  }
});

// PD-169 rework: a throw scales with sqrt(g) so it flies the same arc at any gravity (flick on high gravity used to just twitch)
const flight = (app, x, vel) => app.run((pd, a) => {
  pd.simRoll({});   // settle at the default first, so every run starts the throw from the same pose and rng state
  pd.setGravity(a.x === 'def' ? pd.GRAV.DEF : a.x);
  pd.startRoll(true, false, a.vel);
  const b = pd.bodies, y0 = pd.TABLE_Y, x0 = b[0].position.x, vy0 = b[0].velocity.y; let top = -1e9, reach = 0, air = 0, left = false;
  for (let i = 0; i < 1500; i++) { pd.drift(1); const y = b[0].position.y; top = Math.max(top, y - y0);
    if (y - y0 > 3) left = true; if (left && y - y0 < 1.4) { reach = Math.abs(b[0].position.x - x0); air = i / 60; break; } }
  return { top, reach, air, vy0, g: -pd.worldGravityY };
}, { x, vel });

test('a flick throws the same arc at low, default and high gravity (apex within 25%, launch speed and airtime scale with sqrt g)', async ({ app, page }) => {
  await app.open({ query: 'seed=5' });
  const vel = { x: 22, z: 0 };
  const def = await flight(app, 'def', vel);
  expect(def.g).toBe(34); expect(def.top).toBeGreaterThan(3); expect(def.air).toBeGreaterThan(.2);
  for (const x of [1 / 64, .25, 2]) {
    await page.reload(); await app.ready();
    const f = await flight(app, x, vel);
    expect(f.top / def.top, `apex at ${x}x`).toBeGreaterThan(.75); expect(f.top / def.top, `apex at ${x}x`).toBeLessThan(1.25);
    const k = Math.sqrt(f.g / 34); expect(f.vy0 / def.vy0, `launch speed at ${x}x scales with sqrt(g)`).toBeGreaterThan(k * .9); expect(f.vy0 / def.vy0).toBeLessThan(k * 1.1);
    expect(f.air * k / def.air, `airtime at ${x}x`).toBeGreaterThan(.7); expect(f.air * k / def.air).toBeLessThan(1.3);
  }
});

test('measured: a die falls 10 u in sqrt(2h/g) at the default and at 0.25x (no hidden time scale)', async ({ app }) => {
  await app.open({});
  for (const x of ['def', .25]) {
    const r = await app.run((pd, x) => { pd.simRoll({}); pd.setGravity(x === 'def' ? pd.GRAV.DEF : x); pd.startRoll(false, false, null);
      const b = pd.bodies[0]; pd.bodies.forEach((q, i) => { if (i) q.position.set(100 + 5 * i, 90, 0); }); b.position.set(0, 20, 0); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
      let n = 0; while (b.position.y > 10 && n < 600) { pd.drift(1); n++; }
      return { t: n / 60, g: -pd.worldGravityY }; }, x);
    expect(r.t).toBeGreaterThan(Math.sqrt(2 * 10 / r.g) - 1.5 / 60); expect(r.t).toBeLessThan(Math.sqrt(2 * 10 / r.g) + 1.5 / 60);
  }
});
