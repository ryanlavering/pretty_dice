// PD-142.38.62: changing shape or adding dice in the Design showcase never moves the camera, and the arrangement and new dice start face-on.
import { test, expect } from './helpers/app.mjs';
for (const orbit of [false, true]) {
  test(`shape changes and added dice leave the camera alone and start face-on (${orbit ? 'after a manual orbit' : 'after Reset view'}) (.38.62)`, async ({ app, page }) => {
    await app.open(); await app.nav.toDesign();
    if (orbit) await page.evaluate(() => { window.__pd.orbit.az = 0.6; window.__pd.orbit.el = 0.3; });
    else { await app.nav.openDrawer(); await page.locator('#resetview').click(); }
    const cam = () => page.evaluate(() => { const pd = window.__pd; return { az: pd.orbit.az, el: pd.orbit.el }; });
    const c0 = await cam();
    const faceOn = (q) => Math.abs(q[3]) > 0.999;
    const state = () => page.evaluate(() => { const pd = window.__pd, r = q => q.toArray(); return { rig: r(pd.rig.quaternion), n: pd.dice.length, dice: pd.dice.map(d => r(d.mesh.quaternion)) }; });
    const sh = id => page.locator(`#shapes button[data-id="${id}"]`);
    await page.waitForTimeout(1500); // the single die has been spinning on the rig by now
    for (const [what, act, multi] of [
      ['d8', () => sh('d8').click(), false], ['add d12 (double-click)', () => sh('d12').dblclick(), true],
      ['add d6', () => sh('d6').dblclick(), true], ['d4', () => sh('d4').click(), false],
      ['Standard 7', () => sh('set7').click(), true], ['Custom', () => sh('custom').click(), true]]) {
      await page.waitForTimeout(1500); await act(); await page.waitForTimeout(700);
      expect(await cam(), what + ': camera orbit unchanged').toEqual(c0);
      const s = await state();
      if (multi) { expect(faceOn(s.rig), what + ': arrangement square (rig)').toBe(true); }
      if (what === 'add d12 (double-click)') s.dice.forEach((q, i) => expect(Math.abs(q[3]) > 0.9, `${what}: die ${i} near face-on`).toBe(true));
    }
    // a multi-die set to one die and back: nothing is left rotated at the moment of the change
    await page.evaluate(() => { const pd = window.__pd; pd.state.spin = 0; });
    await sh('d6').click(); await page.waitForTimeout(500); expect(faceOn((await state()).rig), 'd6 after a set starts face-on').toBe(true);
  });
}
