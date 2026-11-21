// PD-196: on desktop the finished story's sentence sits clear below the lowest ring / arranged glyph row (not crowding the circles).
import { test, expect } from './helpers/app.mjs';
const shot = process.env.STORY_SHOT;

test('story sentence clears the rings at desktop sizes', async ({ shared: app }) => {
  for (const vp of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 1024, height: 768 }]) {
    await app.reset(78, { plain: true }); await app.page.setViewportSize(vp); await app.page.waitForTimeout(400);
    await app.run(pd => { if (pd.game) pd.endGame(); pd.openGames(); });
    await app.page.selectOption('#scorepane select >> nth=0', 'story'); await app.page.selectOption('#scorepane select >> nth=1', '2');
    await app.page.locator('#scorepane input[type=number]').first().evaluate(e => { e.value = '3'; e.dispatchEvent(new Event('change')); });
    await app.page.locator('#scorepane input[type=number]').nth(1).evaluate(e => { e.value = '2'; e.dispatchEvent(new Event('change')); });
    await app.nav.roll();
    await app.run(pd => pd.simRoll({ rerolls: 6 }));
    await app.page.waitForTimeout(900);
    await app.run(pd => { pd.setFull(true); });
    for (const i of [0, 1, 2]) await app.page.locator(`#storytray .stile[data-i="${i}"]`).click();
    await expect(app.page.locator('#storytray .ssent')).toBeVisible();
    await app.page.waitForTimeout(600);
    if (shot) await app.page.screenshot({ path: `${shot}/sent-${vp.width}x${vp.height}.png` });
    const g = await app.page.evaluate(() => { const t = document.querySelector('#storytray .ssent').getBoundingClientRect(), rs = [...document.querySelectorAll('#storytray .sring, #storytray .stile.placed')].map(e => e.getBoundingClientRect());
      return { top: Math.round(t.top), lowest: Math.round(Math.max(...rs.map(r => r.bottom))) }; });
    console.log(vp.width, vp.height, JSON.stringify(g));
    expect(g.top - g.lowest).toBeGreaterThanOrEqual(vp.width >= 1000 ? 24 : 0);
  }
});
