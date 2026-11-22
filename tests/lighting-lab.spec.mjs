// PD-149 lighting lab: the debug panel exists only when the build sets window.__PD_LIGHTS (--artifact --lights); the normal page has none and renders exactly as before.
import { test, expect } from './helpers/app.mjs';

test('the lighting lab panel is absent in the normal page', async ({ app }) => {
  await app.open();
  await expect(app.page.locator('#pdl')).toHaveCount(0);
  expect(await app.run(pd => pd.PDL)).toBeNull();
  expect(await app.run(pd => pd.topLatch)).toBe(false);
});

test('lab build: the view latches, lights apply per view, matte can be switched off, everything is put back', async ({ app }) => {
  await app.page.addInitScript(() => { window.__PD_LIGHTS = 1; });
  await app.open(); await app.nav.toPlay();
  await expect(app.page.locator('#pdl')).toHaveCount(1);
  await app.run(pd => { pd.state.shape = 'custom'; pd.state.notation = '2d20'; });
  await app.page.click('#pdlview');   // latch the top view (starts a roll from the showcase)
  await app.run(pd => { for (let i = 0; i < 400 && !pd.settled; i++) pd.renderOnce(); for (let i = 0; i < 10; i++) pd.renderOnce(); });
  expect(await app.run(pd => [pd.topLatch, pd.topBlend, pd.rolling])).toEqual([true, 1, true]);
  // the latch survives release of the hold
  await app.run(pd => { pd.holdTop(true); pd.holdTop(false); pd.renderOnce(); });
  expect(await app.run(pd => pd.topBlend)).toBe(1);
  // the top set is what is drawn at topBlend 1, and the real light is put back after the draw
  const seen = await app.run(pd => { pd.PDL.sets.top.key.p = [0.5, 9, 0.25]; pd.PDL.sets.top.key.i = 2.5; const l = pd.key;
    const y0 = l.position.y; pd.renderOnce(); return { y0, after: [l.position.x, l.position.y, l.position.z, l.intensity] }; });
  expect(seen.after).toEqual([3, 6, 4, 1.6]);
  // mode off and the matte box are plain switches
  await app.page.selectOption('#pdlmode', 'off'); expect(await app.run(pd => pd.PDL.on)).toBe(false);
  await app.page.uncheck('#pdlmatte'); expect(await app.run(pd => pd.PDL.matte)).toBe(false);
  // copy settings gives JSON with both sets
  await app.page.click('#pdlcopy');
  const txt = await app.page.inputValue('#pdlout');
  expect(txt).toContain('LIGHTS_TOP'); expect(JSON.parse(txt.split('/* JSON:\n')[1].split('\n*/')[0]).top.key.pos).toEqual([0.5, 9, 0.25]);
  // back to the default view and a roll still works
  await app.page.click('#pdlview');
  await app.run(pd => { for (let i = 0; i < 120; i++) pd.renderOnce(); });
  expect(await app.run(pd => [pd.topLatch, pd.topBlend < 0.01])).toEqual([false, true]);
});
