// PD-142.38.55 / .57: the phone settings pane keeps its scroll position when a control is tapped, and scrolls vertically only.
import { test, expect } from './helpers/app.mjs';
test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 740 } });

const top = app => app.page.evaluate(() => document.querySelector('aside').scrollTop);
const CONTROLS = {
  toDesign: ['#shapes [data-id=d6]', '#shapes [data-id=d20]', '#shapes [data-id=custom]', '#notadv', '#notdis', '#steppers button >> nth=0', '#steppers button >> nth=1', '#notapply', '#rand', '#subs button >> nth=1', '#font', '#d4style', '#polish', '#filigree'],
  toPlay: ['#shapes [data-id=d20]', '#shapes [data-id=d6]', '#shapes [data-id=custom]', '#notadv', '#notdis', '#steppers button >> nth=0', '#notapply', '#bounce', '#shake', '#sndsurf', '#soundtest'],
};

for (const room of ['toDesign', 'toPlay']) {
  test(`tapping controls does not move the pane scroll (${room === 'toDesign' ? 'Design' : 'Play Table'}, phone)`, async ({ app }) => {
    await app.open(); await app.nav[room]();
    // entering a room scrolls the pane to the top on the next animation frame (setPane); with software GL a frame can take 300 ms,
    // so wait for it, or that reset lands after the scroll below and reads as a jump caused by the first tap (4.1 baseline)
    await app.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const moved = [];
    let tapped = 0;
    for (const sel of CONTROLS[room]) {
      const loc = app.page.locator(sel).first();
      if (!(await loc.count()) || !(await loc.isVisible())) continue;
      await loc.evaluate(e => e.scrollIntoView({ block: 'center' }));
      const before = await top(app);
      if (before < 20) continue;   // a control near the top proves nothing
      await loc.tap({ force: true }); tapped++;
      await app.page.waitForTimeout(350);   // past the tap-or-add wait and the next frame
      const after = await top(app);
      const layout = sel.startsWith('#subs');   // a substrate change adds or removes controls above the tap; the browser's scroll anchoring then shifts the pane to keep the view still, which is not a jump to the top
      if (layout ? after < before / 2 : Math.abs(after - before) > 2) moved.push(`${sel}: ${before} -> ${after}`);
    }
    expect(tapped, 'enough controls were scrolled into the lower pane').toBeGreaterThan(6);
    expect(moved).toEqual([]);
  });
}

for (const w of [360, 390]) {
  test(`the pane scrolls vertically only and nothing is wider than it at ${w}px (every tab)`, async ({ app }) => {
    await app.page.setViewportSize({ width: w, height: 740 });
    await app.open();
    const widths = () => app.page.evaluate(() => { const a = document.querySelector('aside'), cs = getComputedStyle(a); return { sw: a.scrollWidth, cw: a.clientWidth, ox: cs.overflowX, ta: cs.touchAction }; });
    const check = async label => { const r = await widths(); expect(r.sw, `${label}: scrollWidth`).toBeLessThanOrEqual(r.cw); expect([r.ox, r.ta], label).toEqual(['hidden', 'pan-y']); };
    await app.nav.toDesign(); await check('Design');
    for (const i of [1, 2, 3, 4]) { const b = app.page.locator('#subs button').nth(i); if (await b.count()) { await b.evaluate(e => e.click()); await check(`Design substrate ${i}`); } }
    await app.nav.toPlay(); await check('Play Table');
    await app.nav.openGames(); await check('Games');
    await app.nav.openLog(); await check('Log');
  });
}
