// Physics tier: seeded rolls (?seed=N) stepped synchronously with __pd.simRoll(). Asserts invariants, not trajectories,
// so tuning friction/damping does not churn the tests.
import { test, expect } from './helpers/app.mjs';

const SINGLE = ['d4', 'd6', 'd8', 'd10', 'd100', 'd12', 'd20', 'd14', 'd16', 'rd12'];
const ROLLS = 3;

/** What the result line should say, worked out from the per-die labels by the rules in the README. */
function expectedMain(shape, dice, notation) {
  const fmt = d => d.name === 'd10' && d.label === 0 ? 10 : d.name === 'd%' ? String(d.label).padStart(2, '0') : d.label;
  if (shape === 'd100') { const t = dice[0].label + dice[1].label; return String(t === 0 ? 100 : t); }
  if (shape === 'set7') return dice.map(fmt).join(' · ');
  if (shape === 'custom') {
    const mod = +(notation.match(/[+-]\s*\d+$/)?.[0].replace(/\s/g, '') ?? 0);
    return String(dice.reduce((a, d) => a + (d.name === 'd10' && d.label === 0 ? 10 : d.label), 0) + mod);   // simple dice only (no d%) in these sets
  }
  return String(fmt(dice[0]));
}

/** Invariants every finished roll must meet. maxLeans: how many leaning dice are acceptable (flagged, never hidden). */
function checkRoll(r, { label, maxSimT, maxLeans = 0 }) {
  expect(r.settled, `${label}: settled`).toBe(true);
  expect(r.simT, `${label}: settle time (sim s)`).toBeLessThan(maxSimT);
  expect(r.leans, `${label}: leaning dice`).toBeLessThanOrEqual(maxLeans);
  r.dice.forEach((d, i) => {
    const [x, y, z] = d.pos, at = `${label} die ${i} (${d.name})`;
    expect(Math.abs(x), `${at}: inside tray x`).toBeLessThan(r.rollHalf.x + 0.25);
    expect(Math.abs(z), `${at}: inside tray z`).toBeLessThan(r.rollHalf.z + 0.25);
    expect(y - r.tableY, `${at}: above the mat`).toBeGreaterThan(0.2);
    if (r.leanFlags && !r.leanFlags[i]) {
      expect(y - r.tableY, `${at}: not stacked`).toBeLessThan(1.45);
      expect(d.flat, `${at}: lying on a face`).toBeGreaterThan(0.95);
    }
  });
}

// Physics needs no rendering and no fresh page: tests share one paused page per worker (see `shared` in helpers/app.mjs)
// and reset it to the boot design with a fixed seed first. Pausing also keeps software WebGL from starving the page.
const open = (shared, seed) => shared.reset(seed);
const roll = (app, opts = {}) => app.run((pd, o) => ({ ...pd.simRoll(o), leanFlags: pd.leans }), opts);

test.describe('single dice', () => {
  for (const shape of SINGLE) {
    test(`${shape}: ${ROLLS} seeded rolls settle flat on the mat and report the up face`, async ({ shared: app }) => {
      await open(app, 11);
      await app.run(async (pd, s) => { pd.state.shape = s; await pd.buildDice(); }, shape);
      for (let k = 0; k < ROLLS; k++) {
        const r = await roll(app);
        checkRoll(r, { label: `${shape} roll ${k}`, maxSimT: 12 });
        expect(r.main, `${shape} roll ${k}: result line`).toBe(expectedMain(shape, r.dice));
      }
    });
  }
});

test('Standard 7: every die settles and the result lists each value in order', async ({ shared: app }) => {
  await open(app, 5);
  await app.run(async pd => { pd.state.shape = 'set7'; await pd.buildDice(); });
  for (let k = 0; k < ROLLS; k++) {
    const r = await roll(app, { rerolls: 6 });
    expect(r.dice.map(d => d.name)).toEqual(['d4', 'd6', 'd8', 'd10', 'd%', 'd12', 'd20']);
    checkRoll(r, { label: `set7 roll ${k}`, maxSimT: 15 });
    expect(r.main).toBe(expectedMain('set7', r.dice));
  }
});

test('24-dice custom set: settles, totals add up, leans are rare and re-rolling clears them', async ({ shared: app }) => {
  const notation = '6d4+6d6+6d8+6d20+3';
  await open(app, 3);
  await app.run(async (pd, n) => { pd.state.shape = 'custom'; pd.state.notation = n; await pd.buildDice(); }, notation);
  let dice = 0, firstLeans = 0;
  for (let k = 0; k < 4; k++) {
    const r = await roll(app, { rerolls: 6 });
    expect(r.dice).toHaveLength(24);
    checkRoll(r, { label: `24 dice roll ${k}`, maxSimT: 25 });
    expect(r.main).toBe(expectedMain('custom', r.dice, notation));
    dice += 24; firstLeans += r.firstLeans;
  }
  expect(firstLeans / dice, 'share of dice leaning before any re-roll').toBeLessThan(0.1);
});

test('Re-roll leaning drops only the leaning dice; the others stay put (PD-62)', async ({ shared: app }) => {
  await open(app, 3);
  const r = await app.run(async pd => {
    pd.state.shape = 'custom'; pd.state.notation = '6d4+6d6+6d8+6d20'; await pd.buildDice();
    for (let k = 0; k < 12; k++) {   // find a seeded roll that leaves a lean
      pd.simRoll(); const leans = pd.leans; if (!leans.some(Boolean)) continue;
      const before = pd.bodies.map(b => b.position.toArray());
      const btn = document.querySelector('#result .relean'); if (!btn) return { error: 'no Re-roll leaning button with a lean showing' };
      btn.click(); const dropped = pd.bodies.map((b, i) => Math.hypot(...b.position.toArray().map((v, j) => v - before[i][j])) > 1e-6);
      pd.step(1500);
      return { leans, dropped, settled: pd.settled, after: pd.leans.filter(Boolean).length, tries: k };
    }
    return { error: 'no lean in 12 seeded rolls' };
  });
  test.skip(r.error === 'no lean in 12 seeded rolls', 'seed produced no lean; pick another seed');
  expect(r.error).toBeUndefined();
  expect(r.dropped, 'only leaning dice moved when re-rolled').toEqual(r.leans);
  expect(r.settled).toBe(true);
});

test('launch re-throws from where the dice lie; a fresh roll drops them from above', async ({ shared: app }) => {
  await open(app, 9);
  const r = await app.run(async pd => {
    pd.state.shape = 'set7'; await pd.buildDice(); pd.simRoll();
    const lying = pd.bodies.map(b => b.position.toArray());
    pd.startRoll(true); const launch = pd.bodies.map((b, i) => ({ dy: b.position.y - lying[i][1], dx: Math.hypot(b.position.x - lying[i][0], b.position.z - lying[i][2]), vy: b.velocity.y }));
    pd.startRoll(); const drop = pd.bodies.map(b => b.position.y - pd.TABLE_Y);
    return { launch, drop };
  });
  for (const l of r.launch) { expect(l.dx).toBeLessThan(1e-6); expect(l.dy).toBeCloseTo(0.25, 5); expect(l.vy).toBeGreaterThan(10); }
  for (const h of r.drop) expect(h).toBeGreaterThan(3);
});

test('randomize during and after a roll keeps dice and bodies in step', async ({ shared: app }) => {
  await open(app, 4);
  const r = await app.run(async pd => {
    const wait = ms => new Promise(r => setTimeout(r, ms)), out = {};
    pd.state.randshape = false; pd.startRoll(); const m0 = pd.dice[0].mat; pd.randomize(); pd.randomize(); await wait(500);
    out.sameShape = { rolling: pd.rolling, matReplaced: pd.dice[0].mat !== m0, inStep: pd.bodies.length === pd.dice.length };
    const sh = pd.state.shape; pd.state.randshape = true; for (let i = 0; i < 10 && pd.state.shape === sh; i++) pd.randomize(); await wait(800);
    out.newShape = { rolling: pd.rolling, changed: pd.state.shape !== sh, inStep: pd.bodies.length === pd.dice.length };
    pd.simRoll(); const m1 = pd.dice[0].mat, g1 = pd.dice[0].geo; pd.randomize(); await wait(800);
    out.afterSettle = { rolling: pd.rolling, matReplaced: pd.dice[0].mat !== m1, geoReplaced: pd.dice[0].geo !== g1, inRig: pd.dice[0].mesh.parent === pd.rig || pd.dice.length > 1, inStep: pd.bodies.length === pd.dice.length };
    return out;
  });
  expect(r.sameShape).toEqual({ rolling: true, matReplaced: true, inStep: true });
  expect(r.newShape).toEqual({ rolling: true, changed: true, inStep: true });
  expect(r.afterSettle.rolling).toBe(true);
  expect(r.afterSettle.matReplaced).toBe(true);
  expect(r.afterSettle.inStep).toBe(true);
});

test.describe('nat 20 / nat 1 effects', () => {
  const fxAfter = (app, labels) => app.run((pd, labels) => {
    pd.simRoll(); pd.triggerFx(pd.dice.map((_, i) => ({ label: labels[i % labels.length] })));
    for (let i = 0; i < 180; i++) pd.updateFx(1 / 60);   // 3 s: every 20's burst has fired (they go off in turn)
    return { crit: pd.fx.crit.length, fumble: pd.fx.fumble.length, dim: pd.fx.dim,
      glow: pd.fx.crit.map(d => d.mat.userData.fx.uGlow.value), gray: pd.fx.fumble.map(d => d.mat.userData.fx.uGray.value) };
  }, labels);

  test.beforeEach(async ({ shared: app }) => { await open(app, 2); await app.run(async pd => { pd.state.shape = 'custom'; pd.state.notation = '2d20'; await pd.buildDice(); }); });

  test('all 20s glow, no dimming', async ({ shared: app }) => {
    const r = await fxAfter(app, [20]);
    expect([r.crit, r.fumble, r.dim]).toEqual([2, 0, 0]);
    for (const g of r.glow) expect(g).toBeGreaterThan(0);
  });
  test('all 1s go gray and the room dims', async ({ shared: app }) => {
    const r = await fxAfter(app, [1]);
    expect([r.crit, r.fumble]).toEqual([0, 2]);
    expect(r.dim).toBeGreaterThan(0);
    for (const g of r.gray) expect(g).toBeGreaterThan(0);
  });
  test('a 20 and a 1: both effects, no dimming (1s do not outnumber 20s)', async ({ shared: app }) => {
    const r = await fxAfter(app, [20, 1]);
    expect([r.crit, r.fumble, r.dim]).toEqual([1, 1, 0]);
  });
});

// PD-58: hang hardening. A roll must always finish, whatever the dice are doing.
test('a roll that never settles is finished by the 25 s watchdog', async ({ shared }) => {
  await open(shared, 7);
  const r = await shared.run(pd => { pd.startRoll(); pd.rollT = 26; pd.renderOnce();   // as if the dice had been jittering for 26 s
    return { settled: pd.settled, shown: document.getElementById('result').classList.contains('on') }; });
  expect(r.settled, 'roll finished').toBe(true);
  expect(r.shown, 'result is shown').toBe(true);
});
