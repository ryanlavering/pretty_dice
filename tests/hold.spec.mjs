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
  // physical holds (PD-142.28): a held die may be nudged by the throw, but it stays near its spot on its face of record
  for (const i of [1, 3]) expect(Math.hypot(after.pos[i][0] - before[i].p[0], after.pos[i][2] - before[i].p[2]), `held die ${i} drift`).toBeLessThan(1.5);
  for (const i of [1, 3]) expect(after.r.dice[i].label, `held die ${i} face`).toBe(await app.run((pd, i) => pd.heldPose[i].label, i));
  const moved = [0, 2, 4].filter(i => Math.hypot(after.pos[i][0] - before[i].p[0], after.pos[i][2] - before[i].p[2]) > 0.3);
  expect(moved.length, 'at least some free dice moved').toBeGreaterThan(0);
  expect(await app.run(pd => pd.held)).toEqual([1, 3]);   // still held after the roll
  expect(await app.run(pd => pd.holdRings), 'rings re-show when the re-roll settles (PD-142.28)').toBe(2);
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

test('rings: every meaning has its own colour; cocked is red-magenta, not gold; held+cocked shows cocked', async ({ shared: app }) => {
  await open(app, 24);
  const colors = await app.run(pd => pd.RING_COLORS);
  expect(new Set(Object.values(colors)).size).toBe(Object.keys(colors).length);
  const hue = c => { const r = (c >> 16) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255, mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
    return d === 0 ? 0 : (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; };
  expect(hue(colors.hold), 'hold is gold').toBeGreaterThan(35); expect(hue(colors.hold)).toBeLessThan(55);
  const hc = hue(colors.cocked); expect(hc > 300 || hc < 15, `cocked hue ${hc} is red/magenta`).toBe(true);
  await app.run(async pd => { pd.state.shape = 'custom'; pd.state.notation = '3d6'; await pd.buildDice(); pd.simRoll(); pd.toggleHold(1); });
  expect(await app.run(pd => pd.holdRingsVisible)).toBe(1);
  await app.run(pd => pd.markLean(1));
  expect(await app.run(pd => pd.holdRingsVisible), 'held and cocked: the hold ring hides').toBe(0);
  expect(await app.run(pd => pd.leanRingCount)).toBeGreaterThan(0);
});

test('hold rings: redrawn after each re-roll, gone on release, tied to the held set (PD-142.28)', async ({ shared: app }) => {
  await open(app, 22);
  await app.run(async pd => { pd.state.shape = 'custom'; pd.state.notation = '4d6'; await pd.buildDice(); pd.simRoll(); pd.toggleHold(0); pd.toggleHold(2); });
  for (let k = 0; k < 3; k++) {
    await app.run(pd => { pd.simRoll(); });
    expect(await app.run(pd => pd.holdRings), 're-roll ' + k).toBe(2);
    expect(await app.run(pd => pd.held)).toEqual([0, 2]);
  }
  await app.run(pd => { pd.toggleHold(2); });
  expect(await app.run(pd => pd.holdRings)).toBe(1);
  await app.run(pd => { pd.simRoll(); });
  expect(await app.run(pd => pd.holdRings)).toBe(1);
  await app.run(pd => { pd.clearHolds(); });
  expect(await app.run(pd => pd.holdRings)).toBe(0);
});

test('hold physical: a bumped or tipped held die is put back to its face of record; lean trumps hold (PD-142.28)', async ({ shared: app }) => {
  await open(app, 23);
  await app.run(async pd => { pd.state.shape = 'custom'; pd.state.notation = '4d6'; await pd.buildDice(); pd.simRoll(); pd.toggleHold(1); pd.toggleHold(2); });
  await app.run(pd => { pd.simRoll(); });
  // the re-roll leaves each held die on its face of record
  const after = await app.run(pd => { const r = pd.simRoll(); return { labels: r.dice.map(d => d.label), rec: [1, 2].map(i => pd.heldPose[i].label), restoring: pd.restoring }; });
  expect([after.labels[1], after.labels[2]]).toEqual(after.rec);
  expect(after.restoring).toBe(false);
  // tip a held die over by hand, as if a throw had knocked it: the settle step restores it
  const r = await app.run(pd => {
    const b = pd.bodies[1], want = pd.heldPose[1].label;
    b.quaternion.set(0.38, 0, 0, 0.925); b.quaternion.normalize(); b.position.y += 0.4;   // cocked on an edge
    pd.settled = false; pd.step(300);
    return { want, restoring: pd.restoring, settled: pd.settled, tries: pd.restoreTries, leans: pd.leans, rings: pd.holdRings, held: pd.held };
  });
  expect(r.settled).toBe(true); expect(r.restoring).toBe(false); expect(r.tries).toBeGreaterThan(0);
  expect(r.leans[1]).toBeFalsy(); expect(r.rings).toBe(2); expect(r.held).toEqual([1, 2]);
  expect(await app.run(pd => pd.faces[1]), 'face of record restored').toBe(r.want);
  // lean trumps hold: a leaning die cannot be held
  const refused = await app.run(pd => { pd.toggleHold(1); pd.markLean(0); return pd.toggleHold(0); });
  expect(refused).toBe(false);
});
