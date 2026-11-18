import { test, expect } from './helpers/app.mjs';

// PD-142.38.51: the one relief rule (Raised numbers need Panel > 0) holds after every Randomize, undo/redo and applyLook.
test('Randomize never leaves Raised numbers without a face panel (.38.51)', async ({ app }) => {
  await app.open(); await app.nav.toDesign();
  const r = await app.run(async pd => {
    const bad = []; let raised = 0, panels = 0;
    for (let i = 0; i < 200; i++) { pd.randomize(true); const s = pd.state; if (s.panel > 0) panels++; if (s.numRaised) raised++; if (s.numRaised && !(s.panel > 0)) bad.push(i); }
    pd.state.panel = 0; pd.state.numRaised = true; pd.applyLook(); const afterApply = pd.state.numRaised;
    return { bad, raised, panels, afterApply };
  });
  expect(r.bad, 'Raised with panel 0 after Randomize').toEqual([]);
  expect(r.panels, 'the run does cover designs with a panel').toBeGreaterThan(10);
  expect(r.raised, 'and Raised still happens when there is a panel').toBeGreaterThan(0);
  expect(r.afterApply).toBe(false);
});
