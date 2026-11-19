// Story dice spike UI (PD-160): the standalone page tools/story-dice-spike.html. Click-fill, drag with autoswap, sentence appears.
import { test, expect } from '@playwright/test';
const shot = process.env.STORY_SHOT;   // set to a directory to keep screenshots for eyeballing

const centre = async loc => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };

test('story spike: roll sweeps dice to a pool, click-fill orders them, sentence appears; drag swaps', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto('/tools/story-dice-spike.html');
  await expect(page.locator('.die')).toHaveCount(5); await page.waitForTimeout(1200);
  await expect(page.locator('.ring:visible')).toHaveCount(5);
  if (shot) await page.screenshot({ path: `${shot}/story-1-swept.png` });
  const order = await page.evaluate(() => window.__story.st.face.slice());
  for (let i = 0; i < 5; i++) { await page.locator(`.die[data-i="${i}"]`).click(); await page.waitForTimeout(80); }
  expect(await page.evaluate(() => window.__story.st.arr.rings)).toEqual([0, 1, 2, 3, 4]);
  await page.waitForTimeout(700);
  const sent = await page.locator('#sent').textContent(); expect(sent).toMatch(/^[A-Z].*\.$/); expect(sent.length).toBeGreaterThan(30);
  if (shot) await page.screenshot({ path: `${shot}/story-2-sentence.png` });
  // drag die 0 (ring 1) onto ring 3: autoswap exchanges them
  await page.waitForTimeout(600);
  const from = await centre(page.locator('.die[data-i="0"]')), to = await centre(page.locator('.ring').nth(2));
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 }); await page.mouse.move(to.x, to.y, { steps: 4 }); await page.mouse.up();
  expect(await page.evaluate(() => window.__story.st.arr.rings)).toEqual([2, 1, 0, 3, 4]);
  const sent2 = await page.locator('#sent').textContent(); expect(sent2).not.toBe(sent);
  // click a placed die: back to the pool, sentence goes away
  await page.locator('.die[data-i="4"]').click(); expect(await page.evaluate(() => window.__story.st.arr.rings)).toEqual([2, 1, 0, 3, null]);
  await expect(page.locator('#sent')).toContainText('4/5');
  expect(errors).toEqual([]);
});

test('story spike: glyph sheet renders every glyph, 9 dice fit, d20x9 refused with a message', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto('/tools/story-dice-spike.html');
  await page.selectOption('#nd', '9'); await page.selectOption('#nf', '20'); await page.click('#roll');
  await expect(page.locator('#info')).toContainText('pool');
  await page.selectOption('#nf', '12'); await page.click('#roll'); await expect(page.locator('.die')).toHaveCount(9);
  await page.click('#sheet'); await expect(page.locator('#mat svg')).toHaveCount(await page.evaluate(async () => (await import('/src/story.js')).GLYPHS.length));
  if (shot) await page.screenshot({ path: `${shot}/story-3-sheet.png`, fullPage: true });
});
