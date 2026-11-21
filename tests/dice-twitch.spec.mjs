// PD-195 / PD-201: dice must not twitch (hop) after they have come to rest, at any gravity. Docs: docs/design/dice-twitch-diagnosis.md
// Metric, in fixed 1/60 s sim steps (the live loop's steps; steps until the roll settles, then `drift`, with the live loop's 3.5 s damping):
// a die set is at rest once every die has been slow (speed < .15) for 20 steps in a row; a hop is a later step where any die moves again (speed > .2).
// Ten seeded rolls per case; the worst roll counts. A cocked die that finishRoll topples on purpose (b.free) is not a twitch and is skipped.
// Old code: a hop about every 0.4 s after rest (kicks of .2-.5 u/s at default gravity, 2.6 u/s at 1x) until the 3.5 s damping.
import { test, expect } from './helpers/app.mjs';

async function measure(app, g, notation) {
  return app.run(async (pd, a) => {
    pd.pause(); pd.state.shape = 'custom'; pd.state.notation = a.notation; await pd.buildDice();
    if (a.g) pd.setGravity(a.g);
    const R = { hops: 0, total: 0, lastHop: 0, firstRest: 0, maxJit: 0, badRolls: 0, sleeping: true, rolls: 0 };
    for (let seed = 1; seed <= 10; seed++) {
      pd.reseed(seed); pd.startRoll();
      let rested = false, calm = 0, hops = 0, lastHop = 0, firstRest = null, maxJit = 0, freed = false;
      for (let i = 0; i < 600; i++) {
        if (pd.settled) pd.drift(1); else pd.step(1);   // the live loop: sim steps until the roll settles (result read), then the same steps after it
        const t = (i + 1) / 60;
        if (t > 3.5) pd.bodies.forEach(b => { b.angularDamping = .5; b.linearDamping = .25; });
        if (pd.bodies.some(b => b.free)) { rested = false; calm = 0; freed = true; continue; }
        const sp = Math.max(...pd.bodies.map(b => b.velocity.length() + b.angularVelocity.length()));
        if (!rested) { calm = sp < .15 ? calm + 1 : 0; if (calm >= 20) { rested = true; firstRest = t; } }
        else if (sp > .2) { hops++; lastHop = t; maxJit = Math.max(maxJit, sp); }
      }
      if (freed) continue;
      R.rolls++; R.total += hops; if (hops > 2) R.badRolls++;
      R.hops = Math.max(R.hops, hops); R.lastHop = Math.max(R.lastHop, lastHop); R.firstRest = Math.max(R.firstRest, firstRest ?? 99); R.maxJit = Math.max(R.maxJit, maxJit);
      R.sleeping = R.sleeping && pd.bodies.every(b => b.sleepState === 2);
    }
    return R;
  }, { g, notation });
}

for (const g of [0, 0.14, 1]) {   // 0 = the default gravity (PD-201)
  test(`a die at rest does not hop (gravity ${g || 'default'})`, async ({ app }) => {
    await app.open({ seed: 1 });
    const r = await measure(app, g, '1d20');
    console.log('TWITCH single', g, JSON.stringify(r));
    expect(r.rolls).toBeGreaterThan(6);
    expect(r.hops).toBeLessThanOrEqual(1); expect(r.lastHop).toBeLessThan(2.5); expect(r.sleeping).toBe(true);
  });
  test(`a pile of nine settles without hopping (gravity ${g || 'default'})`, async ({ app }) => {
    await app.open({ seed: 3 });
    const r = await measure(app, g, '6d6+3d20');
    console.log('TWITCH pile', g, JSON.stringify(r));
    expect(r.rolls).toBeGreaterThan(6);
    expect(r.hops).toBeLessThanOrEqual(1); expect(r.lastHop).toBeLessThan(3); expect(r.sleeping).toBe(true);
  });
}
