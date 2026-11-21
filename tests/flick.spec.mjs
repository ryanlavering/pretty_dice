// PD-142.38.49: a flick on the roll mat (press, drag, release) throws the dice in the drag direction with the release speed.
// Regression: with a formula in the dock box (always so after a roll) the flick re-ran the formula roll and dropped the dice from above.
import { test, expect } from './helpers/app.mjs';

const setup = async app => {
  await app.open({ lite: false }); await app.nav.toPlay();   // lite: false: the real render loop (a flick is read against real frames)
  await app.page.fill('#rollbox', '3d6'); await app.page.click('#rollbtn');
  await app.run(pd => pd.simRoll());
  // the camera eases into the roll view and flickVel reads its yaw, so a flick measured mid-ease pointed anywhere (mean x of a right flick
  // read -0.7 to 7.6 against > 3). Wait until the throw direction stops changing, then stop the loop: the view and the rng stay put.
  await app.page.waitForFunction(() => { const p = window.__pd, v = p.flickVel(200, 0, 120), w = window.__flickPrev; window.__flickPrev = v;
    return w && Math.abs(v.x - w.x) + Math.abs(v.z - w.z) < 1e-3; }, null, { polling: 150, timeout: 15000 });
  await app.run(pd => pd.pause());
};
// start from a known pose and launch: the pose and the throw's random part (speed 13 + 7*rng()) come from the seeded rng, not the page's draw history
const reroll = (app, seed) => app.run((pd, s) => { pd.reseed(s); pd.simRoll(); }, seed);
// dispatch the pointer events and read the dice velocities in the same task (before any physics frame can change them)
const flickRun = (app, type, dx, dy, ms, seed = 7) => app.run((pd, a) => {
  pd.canvas.setPointerCapture = () => {};
  const r = pd.canvas.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
  const ev = (t, x, y) => pd.canvas.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: x, clientY: y, button: 0, bubbles: true, pointerType: a.type }));
  // the app times the swipe with performance.now(); a busy wait for the drag time was stretched whenever the CPU was busy (a slower
  // swipe, a weaker throw: flick:44 read 2.7 and 3.9 against > 4 in the 4.1 baseline runs), so the clock is stepped instead
  const now = performance.now, t0 = now.call(performance); let t = t0; performance.now = () => t;
  pd.reseed(a.seed);   // the launch draw
  try { ev('pointerdown', x0, y0); t = t0 + a.ms;   // the finger is held for the drag time
    ev('pointermove', x0 + a.dx / 2, y0 + a.dy / 2); ev('pointermove', x0 + a.dx, y0 + a.dy); ev('pointerup', x0 + a.dx, y0 + a.dy); }
  finally { performance.now = now; }
  const v = pd.bodies.map(b => [b.velocity.x, b.velocity.y, b.velocity.z]);
  return { rolling: pd.rolling, settled: pd.settled, v, mx: v.reduce((s, q) => s + q[0], 0) / v.length, my: v.reduce((s, q) => s + q[1], 0) / v.length };
}, { type, dx, dy, ms, seed });

for (const type of ['mouse', 'touch']) {
  test(`${type}: flick right and left carries the drag direction into the throw`, async ({ app }) => {
    await setup(app);
    const right = await flickRun(app, type, 200, 0, 120);
    expect(right.settled, 'the flick started a throw').toBe(false);
    expect(right.mx, 'flicked right: dice move right').toBeGreaterThan(3);
    expect(right.my, 'thrown up off the mat').toBeGreaterThan(5);
    await reroll(app, 11);
    const left = await flickRun(app, type, -200, 0, 120);
    expect(left.mx, 'flicked left: dice move left').toBeLessThan(-3);
  });
  test(`${type}: a faster flick throws harder; a plain tap does not throw`, async ({ app }) => {
    await setup(app);
    const slow = await flickRun(app, type, 150, 0, 400);
    await reroll(app, 11);
    const fast = await flickRun(app, type, 150, 0, 60);
    expect(fast.mx).toBeGreaterThan(slow.mx + 3);
    await reroll(app, 11);
    const tap = await flickRun(app, type, 0, 0, 50);
    expect(tap.settled, 'a tap on the mat does not throw').toBe(true);
  });
}
test('flick up the screen throws the dice away from the viewer, down toward', async ({ app }) => {
  await setup(app);
  const dir = async dy => { await reroll(app, 11); const r = await flickRun(app, 'mouse', 0, dy, 120); return r.v.reduce((s, q) => s + q[2], 0) / r.v.length; };
  const up = await dir(-200), down = await dir(200);
  expect(Math.abs(up), 'PD-199: a straight up flick is vertical, no drift toward the back').toBeLessThan(2.5); expect(down).toBeGreaterThan(4);
});
// PD-199: depth share falls to zero at vertical, 45 degrees keeps the old 0.55, lift is 1.25x the old at default gravity and grows with gravity.
test('flick model: vertical has no depth, 45 degrees has more; lift x1.25 and monotonic in gravity', async ({ app }) => {
  await setup(app);
  const m = await app.run(pd => {
    const out = { frac: {}, vel: {}, lift: {} };
    for (const a of [0, 10, 20, 45, 70]) { const r = a * Math.PI / 180; out.frac[a] = pd.flickDepthFrac(Math.sin(r), Math.cos(r)); }
    const n = v => Math.hypot(v.x, v.z);
    out.vel.vert = n(pd.flickVel(0, -200, 120)); out.vel.a45 = n(pd.flickVel(200, -200, 120));
    for (const g of [pd.GRAV.LO, pd.GRAV.DEF, .1, .25, .5, 1, 2]) out.lift[g] = pd.flickLiftK(g);
    return out; });
  console.log('FLICK model', JSON.stringify(m));
  expect(m.frac[0]).toBeLessThan(1e-9); expect(m.frac[45]).toBeCloseTo(.55, 6);
  expect(m.frac[10]).toBeLessThan(m.frac[20]); expect(m.frac[20]).toBeLessThan(m.frac[45]); expect(m.frac[45]).toBeLessThan(m.frac[70]);
  expect(m.vel.vert, 'a vertical flick has ~zero table-plane velocity').toBeLessThan(1e-6);
  expect(m.vel.a45, 'a 45 degree flick has depth the vertical one lacks').toBeGreaterThan(m.vel.vert + 3);
  const gs = Object.keys(m.lift).map(Number).sort((a, b) => a - b);
  for (let i = 1; i < gs.length; i++) expect(m.lift[gs[i]]).toBeGreaterThanOrEqual(m.lift[gs[i - 1]] - 1e-12);
  expect(m.lift[gs[gs.length - 1]]).toBeGreaterThan(m.lift[gs[1]] + .3);   // strictly more above default
  const def = await app.run(pd => pd.GRAV.DEF);
  expect(m.lift[def], 'default gravity: exactly the +25%').toBeCloseTo(1.25, 9);
  // the throw itself: mean launch speed at default gravity sits in 1.25 x the old 13..20 range
  await reroll(app, 11); const r = await flickRun(app, 'mouse', 0, -200, 120);
  expect(r.my).toBeGreaterThan(13 * 1.25 - .01); expect(r.my).toBeLessThan(20 * 1.25 + .01);
});

// PD-142.38.65: an up flick is read as more "up" than "in": its toward-the-back component is smaller than a down flick's toward-the-viewer one,
// sideways flicks are unchanged, and the dice stay in the tray whichever way they are thrown.
test('flick up has a smaller depth component than flick down; sideways unchanged; dice stay in the tray; resting height like a Roll click', async ({ app, page }) => {
  await setup(app);
  const fv = (dx, dy) => app.run((pd, a) => { const v = pd.flickVel(a.dx, a.dy, 120); return [v.x, v.z]; }, { dx, dy });
  const upV = await fv(0, -200), downV = await fv(0, 200), sideV = await fv(200, 0), diagV = await fv(200, -200);
  console.log(`FLICK vel (x,z) up=${upV.map(v => v.toFixed(1))} down=${downV.map(v => v.toFixed(1))} side=${sideV.map(v => v.toFixed(1))} upright=${diagV.map(v => v.toFixed(1))}`);
  const nrm = v => Math.hypot(v[0], v[1]);   // the camera may still be settling into the roll view (its yaw is not the point), so compare lengths on the mat
  expect(nrm(upV), 'an up flick is throttled on the mat (less depth) compared with a down flick').toBeLessThan(nrm(downV) * 0.7);
  expect(nrm(sideV), 'sideways keeps its full speed').toBeGreaterThan(nrm(downV) * 0.95); expect(nrm(downV)).toBeGreaterThan(12);
  const depth = async dy => { await reroll(app, 11); const r = await flickRun(app, 'mouse', 0, dy, 120); return r.v.reduce((s, q) => s + q[2], 0) / r.v.length; };
  const up = await depth(-200);
  expect(Math.abs(up)).toBeLessThan(2.5);   // PD-199: a straight up flick is vertical
  await reroll(app, 11); const side = await flickRun(app, 'mouse', 200, 0, 120); expect(side.mx).toBeGreaterThan(3);
  for (const [dx, dy] of [[0, -250], [200, -200], [-200, -200], [0, 250], [250, 0]]) {
    await reroll(app, 11); await flickRun(app, 'mouse', dx, dy, 90);
    const r = await app.run(pd => { pd.step(1500); pd.renderOnce(); return { half: pd.rollHalf, pos: pd.bodies.map(b => [b.position.x, b.position.z]), ys: pd.dice.map(d => ((d.mesh.getWorldPosition(new d.mesh.position.constructor()).project(pd.camera).y + 1) / 2) * 100), settled: pd.settled }; });
    for (const [x, z] of r.pos) { expect(Math.abs(x), `x in tray (${dx},${dy})`).toBeLessThan(r.half.x + 0.5); expect(Math.abs(z), `z in tray (${dx},${dy})`).toBeLessThan(r.half.z + 0.5); }
    const m = r.ys.reduce((a, b) => a + b, 0) / r.ys.length; console.log(`FLICK rest (${dx},${dy}): ${m.toFixed(1)}% from the bottom`);
    expect(m, `resting height after flick (${dx},${dy})`).toBeGreaterThan(25); expect(m, 'on screen').toBeLessThan(75);
  }
});

// PD-199 rework: for organic gestures (touch flick, mouse drag-release) the launch height follows the gesture speed; only R / Roll / shake stay random.
for (const type of ['touch', 'mouse']) {
  test(`${type}: launch speed follows the gesture (faster, longer drags launch higher); typical flick keeps today's average`, async ({ app }) => {
    await setup(app);
    const vy = async (dx, ms, seed) => { await reroll(app, seed); return (await flickRun(app, type, dx, 0, ms, seed)).my; };
    const mean = async (dx, ms) => { let t = 0; for (const s of [3, 7, 11, 19]) t += await vy(dx, ms, s); return t / 4; };
    const lazy = await mean(70, 440);   // 0.16 px/ms (a flick needs > 60 px and < 450 ms to count): the slowest end
    const slow = await mean(120, 400), mid = await mean(200, 200), typ = await mean(200, 120), fast = await mean(200, 60);   // 0.3, 1.0, 1.67, 3.3 px/ms
    console.log(`FLICK launch vy (${type}) 0.3px/ms=${slow.toFixed(1)} 1.0=${mid.toFixed(1)} 1.67=${typ.toFixed(1)} 3.3=${fast.toFixed(1)}`);
    expect(lazy, 'slowest gesture >= the 8 x 1.25 minimum (less the 5% jitter)').toBeGreaterThan(8 * 1.25 * .94); expect(lazy).toBeLessThan(8 * 1.25 * 1.06); expect(lazy).toBeLessThan(slow + .01); expect(slow).toBeLessThan(mid); expect(mid).toBeLessThan(typ); expect(typ).toBeLessThan(fast);
    expect(fast / slow, 'a hard flick is clearly higher than a lazy one').toBeGreaterThan(1.5);
    expect(typ, 'typical flick: at least today\'s mean 16.5 x 1.25 (-10%), slightly stronger is fine (PD-199 re-fit: about 18.3 x 1.25)').toBeGreaterThan(16.5 * 1.25 * .9); expect(typ).toBeLessThan(16.5 * 1.25 * 1.25);
    // same gesture, different rng: only the +-5% jitter
    const a = await vy(200, 120, 3), b = await vy(200, 120, 19); expect(Math.abs(a - b) / typ).toBeLessThan(.12);
    // a longer drag at the same duration is faster
    expect(await mean(300, 120)).toBeGreaterThan(await mean(150, 120));
  });
}
test('R key / Roll button throw keeps the full random launch spread (not gesture driven)', async ({ app }) => {
  await setup(app);
  const ys = [];
  for (const s of [3, 5, 7, 11, 13, 17, 19, 23]) ys.push(await app.run((pd, sd) => { pd.reseed(sd); pd.dockRoll(true); return pd.bodies.reduce((t, b) => t + b.velocity.y, 0) / pd.bodies.length; }, s));
  console.log('FLICK R-path vy', ys.map(v => v.toFixed(1)).join(' '));
  for (const v of ys) { expect(v).toBeGreaterThan(12.9); expect(v).toBeLessThan(20.1); }   // 13..20, no 1.25 boost
  expect(Math.max(...ys) - Math.min(...ys), 'still random').toBeGreaterThan(1.5);
});

test('slowest gesture still launches, travels and bounces (not a drop); airtime and travel vs median', async ({ app }) => {
  await setup(app);
  const fl = (dx, ms) => app.run((pd, a) => {
    pd.reseed(11); pd.simRoll({});
    const v = pd.flickVel(a.dx, 0, a.ms); pd.reseed(118); pd.startRoll(true, false, v);
    const b = pd.bodies, y0 = pd.TABLE_Y; let air = 0, bounces = 0, wasUp = false, path = 0, net = 0; const last = b.map(q => [q.position.x, q.position.z]), st = last.map(q => q.slice());
    for (let i = 0; i < 600; i++) { pd.drift(1); const y = b[0].position.y - y0;
      b.forEach((q, k) => { path += Math.hypot(q.position.x - last[k][0], q.position.z - last[k][1]) / b.length; last[k] = [q.position.x, q.position.z]; });
      if (y > .6) { wasUp = true; air = (i + 1) / 60; } else if (wasUp && y < .6) { bounces++; wasUp = false; } }
    net = last.reduce((t, q, k) => t + Math.hypot(q[0] - st[k][0], q[1] - st[k][1]), 0) / b.length;
    return { air, bounces, travel: path, net, vy0: v.sp };
  }, { dx, ms });
  const slowest = await fl(70, 440), median = await fl(200, 120);
  console.log('FLICK slowest', JSON.stringify(slowest), 'median', JSON.stringify(median));
  expect(slowest.air, 'leaves the surface for a real flight, not a drop').toBeGreaterThan(.25);
  expect(slowest.travel, 'travels (mean path of the dice) at least about a die width (1.6 u)').toBeGreaterThan(1.6);
  expect(slowest.bounces, 'lands and bounces back up at least once (1-2 seen)').toBeGreaterThanOrEqual(1);
});

// PD-199 sensitivity: small quick swipes register (30 px touch / 36 px mouse), a hard phone swipe reaches full strength, tiny movements and slow drags do not throw
for (const type of ['touch', 'mouse']) {
  test(`${type}: small gestures register lazily; jitter taps and slow drags do not throw; a typical-hard swipe reaches full strength`, async ({ app }) => {
    await setup(app);
    const run = async (dx, dy, ms, seed = 11) => { await reroll(app, seed); return flickRun(app, type, dx, dy, ms, seed); };
    const minPx = type === 'mouse' ? 36 : 30;
    expect((await run(6, 4, 50)).settled, 'a 6 px jitter tap does not throw').toBe(true);
    expect((await run(minPx - 6, 0, 60)).settled, 'just under the minimum does not throw').toBe(true);
    expect((await run(minPx + 2, 0, 600)).settled, 'a slow drag past the duration limit does not throw').toBe(true);
    const little = await run(minPx + 2, 0, 80);
    expect(little.settled, 'a short quick swipe throws').toBe(false);
    const vyOf = async (dx, ms) => { let t = 0; for (const sd of [3, 7, 11, 19]) t += (await run(dx, 0, ms, sd)).my; return t / 4; };
    const lazy = await vyOf(minPx + 2, 80), hard = await vyOf(190, 100);   // 1.9 px/ms: a typical-hard phone swipe
    const hardest = await vyOf(300, 100);
    console.log(`FLICK small (${type}) ${minPx + 2}px/80ms vy=${lazy.toFixed(1)}; 1.9px/ms vy=${hard.toFixed(1)}; 3px/ms vy=${hardest.toFixed(1)}`);
    expect(lazy, 'a small quick flick is a lazy little roll (base ~8 x 1.25)').toBeLessThan(8 * 1.25 * 1.3);
    expect(hard, 'full strength at ~1.9 px/ms: within 8% of the fastest').toBeGreaterThan(hardest * .92);
    expect(hard).toBeGreaterThan(lazy + 8);
    // a tap / pinch-like second pointer never throws: tiny moves are taps
    expect((await run(0, 0, 50)).settled).toBe(true);
  });
}
