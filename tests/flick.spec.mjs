// PD-142.38.49: a flick on the roll mat (press, drag, release) throws the dice in the drag direction with the release speed.
// Regression: with a formula in the dock box (always so after a roll) the flick re-ran the formula roll and dropped the dice from above.
import { test, expect } from './helpers/app.mjs';

const setup = async app => {
  await app.open(); await app.nav.toPlay();
  await app.page.fill('#rollbox', '3d6'); await app.page.click('#rollbtn');
  await app.run(pd => pd.simRoll());
};
// dispatch the pointer events and read the dice velocities in the same task (before any physics frame can change them)
const flickRun = (app, type, dx, dy, ms) => app.run((pd, a) => {
  pd.canvas.setPointerCapture = () => {};
  const r = pd.canvas.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
  const ev = (t, x, y) => pd.canvas.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: x, clientY: y, button: 0, bubbles: true, pointerType: a.type }));
  // the app times the swipe with performance.now(); a busy wait for the drag time was stretched whenever the CPU was busy (a slower
  // swipe, a weaker throw: flick:44 read 2.7 and 3.9 against > 4 in the 4.1 baseline runs), so the clock is stepped instead
  const now = performance.now, t0 = now.call(performance); let t = t0; performance.now = () => t;
  try { ev('pointerdown', x0, y0); t = t0 + a.ms;   // the finger is held for the drag time
    ev('pointermove', x0 + a.dx / 2, y0 + a.dy / 2); ev('pointermove', x0 + a.dx, y0 + a.dy); ev('pointerup', x0 + a.dx, y0 + a.dy); }
  finally { performance.now = now; }
  const v = pd.bodies.map(b => [b.velocity.x, b.velocity.y, b.velocity.z]);
  return { rolling: pd.rolling, settled: pd.settled, v, mx: v.reduce((s, q) => s + q[0], 0) / v.length, my: v.reduce((s, q) => s + q[1], 0) / v.length };
}, { type, dx, dy, ms });

for (const type of ['mouse', 'touch']) {
  test(`${type}: flick right and left carries the drag direction into the throw`, async ({ app }) => {
    await setup(app);
    const right = await flickRun(app, type, 200, 0, 120);
    expect(right.settled, 'the flick started a throw').toBe(false);
    expect(right.mx, 'flicked right: dice move right').toBeGreaterThan(3);
    expect(right.my, 'thrown up off the mat').toBeGreaterThan(5);
    await app.run(pd => pd.simRoll());
    const left = await flickRun(app, type, -200, 0, 120);
    expect(left.mx, 'flicked left: dice move left').toBeLessThan(-3);
  });
  test(`${type}: a faster flick throws harder; a plain tap does not throw`, async ({ app }) => {
    await setup(app);
    const slow = await flickRun(app, type, 150, 0, 400);
    await app.run(pd => pd.simRoll());
    const fast = await flickRun(app, type, 150, 0, 60);
    expect(fast.mx).toBeGreaterThan(slow.mx + 3);
    await app.run(pd => pd.simRoll());
    const tap = await flickRun(app, type, 0, 0, 50);
    expect(tap.settled, 'a tap on the mat does not throw').toBe(true);
  });
}
test('flick up the screen throws the dice away from the viewer, down toward', async ({ app }) => {
  await setup(app);
  const dir = async dy => { await app.run(pd => pd.simRoll()); const r = await flickRun(app, 'mouse', 0, dy, 120); return r.v.reduce((s, q) => s + q[2], 0) / r.v.length; };
  const up = await dir(-200), down = await dir(200);
  expect(up).toBeLessThan(-4); expect(down).toBeGreaterThan(4);
});
