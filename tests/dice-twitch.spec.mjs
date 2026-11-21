// PD-195: dice must not twitch (periodic hops) while settling at higher gravity. Docs: docs/design/dice-twitch-diagnosis.md
// Metric: once the dice have first come (nearly) to rest, count the steps where any die is moving again (speed > .5) over the next
// 8 s of fixed 1/60 s steps (with the live loop's 3.5 s damping), and report the last such step. Old code: a hop about every 0.35 s.
import { test, expect } from './helpers/app.mjs';

async function measure(app, g, seed, notation) {
  return app.run(async (pd, a) => {
    pd.state.shape = 'custom'; pd.state.notation = a.notation; await pd.buildDice();
    if (a.g) pd.setGravity(a.g);
    const R = { hops: 0, lastHop: 0, firstRest: 0, maxJit: 0, sleeping: true };
    for (let roll = 0; roll < 4; roll++) {   // four seeded rolls in turn; the worst one counts
    pd.startRoll();
    const w = pd.bodies[0].world; let rested = false, hops = 0, lastHop = 0, firstRest = null, maxJit = 0;
    for (let i = 0; i < 600; i++) {
      pd.drift(1); const t = (i + 1) / 60;
      if (t > 3.5) pd.bodies.forEach(b => { b.angularDamping = .5; b.linearDamping = .25; });
      const sp = Math.max(...pd.bodies.map(b => b.velocity.length() + b.angularVelocity.length()));
      if (!rested && sp < .15) { rested = true; firstRest = t; }
      else if (rested && sp > .5) { hops++; lastHop = t; maxJit = Math.max(maxJit, sp); }
    }
    R.hops = Math.max(R.hops, hops); R.lastHop = Math.max(R.lastHop, lastHop); R.firstRest = Math.max(R.firstRest, firstRest ?? 99); R.maxJit = Math.max(R.maxJit, maxJit); R.sleeping = R.sleeping && pd.bodies.every(b => b.sleepState === 2);
    }
    return R;
  }, { g, notation });
}

for (const g of [0.14, 1]) {
  test(`a die at rest does not hop (gravity ${g})`, async ({ app }) => {
    await app.open({ seed: 1 });
    const r = await measure(app, g, 1, '1d20');
    console.log('TWITCH single', g, JSON.stringify(r));
    expect(r.firstRest).toBeLessThan(10);
    expect(r.hops).toBeLessThanOrEqual(3); expect(r.lastHop).toBeLessThan(2.5); expect(r.sleeping).toBe(true);
  });
  test(`a pile of nine settles without hopping (gravity ${g})`, async ({ app }) => {
    await app.open({ seed: 3 });
    const r = await measure(app, g, 3, '6d6+3d20');
    console.log('TWITCH pile', g, JSON.stringify(r));
    expect(r.hops).toBeLessThanOrEqual(8); expect(r.lastHop).toBeLessThan(3); expect(r.sleeping).toBe(true);
  });
}
