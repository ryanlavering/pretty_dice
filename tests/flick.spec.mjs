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
  const t0 = performance.now(); ev('pointerdown', x0, y0);
  const w = performance.now(); while (performance.now() - w < a.ms) { /* hold the finger for the drag time */ }
  ev('pointermove', x0 + a.dx / 2, y0 + a.dy / 2); ev('pointermove', x0 + a.dx, y0 + a.dy); ev('pointerup', x0 + a.dx, y0 + a.dy);
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
  expect(up).toBeLessThan(-2.5); expect(down).toBeGreaterThan(4);   // .38.65: up is biased toward "up the screen" so its depth is smaller (was about -6.3, now about -3.5)
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
  const depth = async dy => { await app.run(pd => pd.simRoll()); const r = await flickRun(app, 'mouse', 0, dy, 120); return r.v.reduce((s, q) => s + q[2], 0) / r.v.length; };
  const up = await depth(-200);
  expect(up).toBeLessThan(-2.5);   // still throws away from the viewer
  await app.run(pd => pd.simRoll()); const side = await flickRun(app, 'mouse', 200, 0, 120); expect(side.mx).toBeGreaterThan(3);
  for (const [dx, dy] of [[0, -250], [200, -200], [-200, -200], [0, 250], [250, 0]]) {
    await app.run(pd => pd.simRoll()); await flickRun(app, 'mouse', dx, dy, 90);
    const r = await app.run(pd => { pd.step(1500); pd.renderOnce(); return { half: pd.rollHalf, pos: pd.bodies.map(b => [b.position.x, b.position.z]), ys: pd.dice.map(d => ((d.mesh.getWorldPosition(new d.mesh.position.constructor()).project(pd.camera).y + 1) / 2) * 100), settled: pd.settled }; });
    for (const [x, z] of r.pos) { expect(Math.abs(x), `x in tray (${dx},${dy})`).toBeLessThan(r.half.x + 0.5); expect(Math.abs(z), `z in tray (${dx},${dy})`).toBeLessThan(r.half.z + 0.5); }
    const m = r.ys.reduce((a, b) => a + b, 0) / r.ys.length; console.log(`FLICK rest (${dx},${dy}): ${m.toFixed(1)}% from the bottom`);
    expect(m, `resting height after flick (${dx},${dy})`).toBeGreaterThan(25); expect(m, 'on screen').toBeLessThan(75);
  }
});
