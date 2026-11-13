// PD-142.1 hold dice: a held die stays put while the rest are thrown; holds clear on a new set or leaving the roll.
import { test, expect } from './helpers/app.mjs';

const open = (app, seed) => app.reset(seed);

test('hold: a held die keeps its place and face through a re-roll, the others move', async ({ shared: app }) => {
  await open(app, 21);
  await app.run(async pd => { pd.state.shape = 'custom'; pd.state.notation = '5d6'; await pd.buildDice(); pd.simRoll(); });
  const before = await app.run(pd => pd.dice.map((d, i) => ({ p: pd.bodies[i].position.toArray() })));
  const ok = await app.run(pd => pd.toggleHold(1) && pd.toggleHold(3));
  expect(ok).toBe(true);
  expect(await app.run(pd => pd.held)).toEqual([1, 3]);
  expect(await app.run(pd => pd.holdRings)).toBe(2);
  const after = await app.run(pd => { pd.step(0); const r = pd.simRoll(); return { r, pos: pd.bodies.map(b => b.position.toArray()), settled: r.settled }; });
  expect(after.settled).toBe(true);
  for (const i of [1, 3]) after.pos[i].forEach((v, k) => expect(v, `held die ${i} axis ${k}`).toBeCloseTo(before[i].p[k], 2));
  const moved = [0, 2, 4].filter(i => Math.hypot(after.pos[i][0] - before[i].p[0], after.pos[i][2] - before[i].p[2]) > 0.3);
  expect(moved.length, 'at least some free dice moved').toBeGreaterThan(0);
  expect(await app.run(pd => pd.held)).toEqual([1, 3]);   // still held after the roll
});

test('hold: release clears; a new set and leaving the roll clear all holds; unsettled dice cannot be held', async ({ shared: app }) => {
  await open(app, 22);
  await app.run(async pd => { pd.state.shape = 'custom'; pd.state.notation = '3d6'; await pd.buildDice(); pd.simRoll(); pd.toggleHold(0); });
  expect(await app.run(pd => pd.toggleHold(0) && pd.held)).toEqual([]);
  await app.run(pd => pd.toggleHold(2));
  await app.run(async pd => { pd.state.notation = '4d8'; await pd.buildDice(); });
  expect(await app.run(pd => pd.held)).toEqual([]);
  await app.run(pd => { pd.simRoll(); pd.toggleHold(1); });
  await app.run(pd => document.getElementById('mode').click());   // leave the roll view
  expect(await app.run(pd => pd.held)).toEqual([]);
});

test('hold: tapping a die on the canvas toggles it', async ({ shared: app }) => {
  await open(app, 23);
  await app.run(async pd => { pd.state.shape = 'custom'; pd.state.notation = '2d6'; await pd.buildDice(); pd.pause(); pd.simRoll(); pd.renderOnce(); });
  const pt = await app.run(pd => pd.bodyScreen(0));
  await app.page.mouse.click(pt.x, pt.y);
  expect(await app.run(pd => pd.held)).toContain(0);
});
