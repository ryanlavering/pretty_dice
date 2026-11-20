// PD-166: the Story Dice sets editor in the Games panel: list, create, edit, save (as a bag set), reload, delete, set text matches the grammar, phone size.
import { test, expect } from './helpers/app.mjs';
import { parseFaceBlock } from '../src/faces.js';
const shot = process.env.STORY_SHOT;

const openEditor = async (app, page) => { await app.run(pd => pd.openGames()); await page.click('#storysets'); };
const formula = page => page.locator('.ssformula').inputValue();

test('create, edit, save, reload, delete a Story Dice set; the set text is the grammar formula', async ({ app, page }) => {
  await app.open({ seed: 3 });
  await openEditor(app, page);
  await expect(page.locator('#scorepane .ssrow')).toHaveCount(0);
  await expect(page.locator('#scorepane .setempty')).toBeVisible();
  await page.click('#ssnew');
  await expect(page.locator('.sseditor')).toBeVisible();
  expect(await formula(page)).toMatch(/^5d12\{noto#\d+\}$/);
  // edit: name, packs, dice, faces, seed
  await page.fill('.sename', 'Fairy tales');
  await page.locator('.sspacks input').nth(3).check();
  await page.click('.sssides button:has-text("d8")');
  await page.click('[aria-label="More dice"]'); await page.click('[aria-label="More dice"]');
  await expect(page.locator('.sscount')).toHaveText('7');
  await page.fill('.ssseed', '42'); await page.locator('.ssseed').dispatchEvent('change');
  const f1 = await formula(page);
  expect(f1).toMatch(/^7d8\{[a-z&]+#42\}$/);
  const parsed = parseFaceBlock(f1.slice(f1.indexOf('{') + 1, -1));   // the text is a valid face block, in normal form
  expect(parsed.faces).toMatchObject({ seed: 42, dice: 'different', order: 'shuffled' });
  await expect(page.locator('.ssdie')).toHaveCount(7); await expect(page.locator('.ssdie').first().locator('.ssg')).toHaveCount(8);
  await expect(page.locator('.sssent')).toHaveText(/^[A-Z].*\.$/);
  const preview1 = await page.locator('.sssent').textContent();
  // reroll seed changes the seed and the formula; toggles change the text
  await page.click('.ssreseed'); const f2 = await formula(page); expect(f2).not.toBe(f1);
  await page.fill('.ssseed', '42'); await page.locator('.ssseed').dispatchEvent('change'); expect(await formula(page)).toBe(f1);
  expect(await page.locator('.sssent').textContent()).toBe(preview1);   // same seed, same faces, same sentence
  await page.selectOption('.ssdice', 'same'); expect(await formula(page)).toBe(f1.replace('}', '!same}'));
  await expect(page.locator('.ssuse')).toBeDisabled();   // the game only deals shuffled, different dice
  await page.selectOption('.ssorder', 'ordered'); expect(await formula(page)).toMatch(/!same!ordered\}$/); await expect(page.locator('.ssseed')).toBeDisabled();
  await page.selectOption('.ssdice', 'different'); await page.selectOption('.ssorder', 'shuffled');
  await page.fill('.ssseed', '42'); await page.locator('.ssseed').dispatchEvent('change');
  expect(await formula(page)).toBe(f1);
  if (shot) { await page.waitForTimeout(500); await page.screenshot({ path: `${shot}/pd166-editor-${page.viewportSize().width}.png` }); }
  await page.click('.sssave');
  await expect(page.locator('#scorepane .ssrow')).toHaveCount(1);
  await expect(page.locator('#scorepane .ssrow')).toContainText('Fairy tales'); await expect(page.locator('#scorepane .ssrow')).toContainText('7 × d8 · seed 42 · different dice');
  const set = await app.run(pd => { const s = pd.bag.sets.find(x => x.name === 'Fairy tales'); return { s, nota: pd.fmtNotation(s.terms, s.mod || 0) }; });
  expect(set.s.terms).toHaveLength(1); expect(set.s.terms[0]).toMatchObject({ count: 7, sides: 8, faces: { seed: 42, dice: 'different', order: 'shuffled' } });
  expect(set.nota).toBe(f1);   // the saved set prints exactly the text the editor showed
  // reload: it persists and shows in the list again
  await page.reload(); await app.ready();
  await app.run(pd => pd.openGames()); await page.click('#storysets');
  await expect(page.locator('#scorepane .ssrow')).toHaveCount(1);
  // edit the saved set: rename, new seed, save; no duplicate is made
  await page.locator('#scorepane .ssrow .pen').click();
  expect(await formula(page)).toBe(f1);
  await page.fill('.sename', 'Fairy tales 2'); await page.fill('.ssseed', '5'); await page.locator('.ssseed').dispatchEvent('change');
  await page.click('.sssave');
  await expect(page.locator('#scorepane .ssrow')).toHaveCount(1); await expect(page.locator('#scorepane .ssrow')).toContainText('seed 5');
  expect(await app.run(pd => pd.bag.sets.map(s => s.name))).toEqual(['Fairy tales 2']);
  // it is an ordinary bag set: the Bag view Sets tab shows it
  expect(await app.run(pd => pd.setOps.find('fairy-tales').id)).toBe('fairy-tales');
  // delete (with a confirm)
  await page.locator('#scorepane .ssrow .pen').click(); await page.click('.ssdel');
  await page.locator('#cardmenu button:has-text("Delete")').click();
  await expect(page.locator('#scorepane .ssrow')).toHaveCount(0);
  expect(await app.run(pd => pd.bag.sets.length)).toBe(0);
});

test('use in game loads the setup; roll it puts the dice on the table; non-story sets stay out of the list', async ({ app, page }) => {
  await app.open({ seed: 4 });
  await app.run(pd => { pd.setOps.create({ name: 'Plain', terms: [{ count: 2, sides: 6 }], mod: 0 }); });
  await openEditor(app, page);
  await expect(page.locator('#scorepane .ssrow')).toHaveCount(0);   // the plain set is not a Story set
  await page.click('#ssnew'); await page.fill('.sename', 'Seven'); await page.fill('.ssseed', '7'); await page.locator('.ssseed').dispatchEvent('change');
  await page.click('.ssuse');
  await expect(page.locator('#scorepane select').first()).toHaveValue('story');
  await expect(page.locator('#scorepane input[type=number]').first()).toHaveValue('5');
  expect(await app.run(pd => pd.bag.sets.map(s => s.name))).toEqual(['Plain']);   // Use in game does not save
  await page.click('#storysets'); await page.click('#ssnew'); await page.fill('.sename', 'Rolled');
  const f = await formula(page);
  await page.click('.ssroll');
  expect(await app.run(pd => ({ n: pd.state.notation, dice: pd.dice.length, sets: pd.bag.sets.map(s => s.name), active: pd.bag.active.set }))).toMatchObject({ n: f, dice: 5, sets: ['Plain', 'Rolled'], active: 'rolled' });
});

test('the game deals the same glyphs as the set text', async ({ app, page }) => {
  await app.open({ seed: 5 });
  await openEditor(app, page); await page.click('#ssnew'); await page.fill('.ssseed', '9'); await page.locator('.ssseed').dispatchEvent('change');
  const preview = await page.locator('.ssdie').first().locator('.ssg').evaluateAll(els => els.map(e => e.title));
  await page.click('.ssuse'); await page.locator('#scorepane button.big:has-text("Start game")').click();
  const dealt = await app.run(pd => pd.dice[0].glyphs.map(g => g.name.replace(/[-_]+/g, ' ')));
  expect(dealt).toEqual(preview);
});

test('the editor works at phone size (390x740)', async ({ app, page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await app.open({ seed: 6 });
  await openEditor(app, page);
  if (shot) { await page.waitForTimeout(400); await page.screenshot({ path: `${shot}/pd166-list-390.png` }); }
  await page.click('#ssnew');
  await expect(page.locator('.sseditor')).toBeVisible();
  const fit = await page.evaluate(() => { const r = document.querySelector('.sseditor').getBoundingClientRect(), p = document.querySelector('#scorepane'); return { right: r.right, vw: innerWidth, sw: document.documentElement.scrollWidth, over: p.scrollWidth - p.clientWidth }; });
  expect(fit.right).toBeLessThanOrEqual(fit.vw); expect(fit.sw).toBeLessThanOrEqual(fit.vw); expect(fit.over).toBeLessThanOrEqual(1);
  for (const sel of ['.sssave', '.ssreseed', '.ssformula', '.ssuse', '.ssroll']) { const b = await page.locator(sel).boundingBox(); expect(b.x + b.width, sel).toBeLessThanOrEqual(390); expect(b.x, sel).toBeGreaterThanOrEqual(0); }
  if (shot) { await page.waitForTimeout(400); await page.screenshot({ path: `${shot}/pd166-editor-390.png` }); }
  await page.click('.sssave'); await expect(page.locator('#scorepane .ssrow')).toHaveCount(1);
  if (shot) await page.screenshot({ path: `${shot}/pd166-saved-390.png` });
});
