// Logic that needs a fresh boot (undo history, determinism across page loads). Runs in the fast-ui project:
// a fresh page must not share a browser with the paused shared page (see PD-20.7 in docs/design/testing.md).
import { test, expect } from './helpers/app.mjs';

test('undo/redo steps through randomize and edits', async ({ app }) => {   // undo history is not part of shared.reset
  await app.open();
  const r = await app.run(async pd => {
    const a = pd.snapshot(); pd.randomize(); const b = pd.snapshot(); await pd.undo(); const c = pd.snapshot(); await pd.redo(); const d = pd.snapshot();
    pd.state.radius = .1; pd.applyLook(); await pd.undo(); const e = pd.snapshot();
    return { undoRestores: a === c, redoRestores: b === d, randomizeChanged: a !== b, undoEdit: e === d };
  });
  expect(r).toEqual({ undoRestores: true, redoRestores: true, randomizeChanged: true, undoEdit: true });
});

test('seeded boot and roll are deterministic (Math.random left unseeded)', async ({ app, browser }) => {
  await app.open();
  const look = pd => JSON.stringify([pd.designToJSON(), pd.simRoll().dice]);
  const a = await app.run(look);
  const ctx = await browser.newContext({ viewport: { width: 960, height: 600 } }); const page = await ctx.newPage();
  await page.goto('/index.html?libs=local&seed=1'); await page.waitForFunction(() => window.__ready && window.__pd);
  const b = await page.evaluate(src => (0, eval)(`(${src})`)(window.__pd), look.toString());
  await ctx.close();
  expect(b).toBe(a);
});
