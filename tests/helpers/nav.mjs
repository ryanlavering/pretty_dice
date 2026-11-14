// Navigation helpers (PD-142.38 slice 0). Specs and scripts/guide-shots.mjs drive the app's chrome through these
// instead of naming round-button selectors, so a navigation slice changes one helper here, not many specs.
// navFor(page) works with any Playwright page; app.nav is navFor(app.page).
//  toPlay()/toDesign()  go to the roll mat / the showcase (never throw dice) -- today the round #mode button
//  toggleMode()         a plain tap of that button, for tests of the toggle itself
//  openBag() openGames() openLog()   open the bag sheet / games panel / roll log
//  roll()               the roll button of the current game panel (setup "Start game" or in-game Roll)
//  sound() pauseSpin() layout()      the utility controls (move into the drawer in slice 1)
//  openDrawer()         no-op until slice 1 builds the drawer
//  fullView(on)         hide (on=true) or restore the panes: today H, the layout button restores
export const navFor = page => {
  const inRoll = () => page.evaluate(() => document.body.classList.contains('inroll'));
  const click = sel => page.locator(sel).click();
  const BTN = { mode: '#mode', games: '#gamesbtn', bag: '#bagbtn', log: '#logbtn', sound: '#snd', spin: '#spinbtn', layout: '#layout', info: '#info', shelf: '#shelf', panel: 'aside' };
  return {
    page,
    /** locator for a chrome control by name: mode games bag log sound spin layout info shelf panel */
    btn: name => page.locator(BTN[name]),
    /** true when the control is displayed and not faded out */
    shown: name => page.locator(BTN[name]).evaluate(e => getComputedStyle(e).display !== 'none' && getComputedStyle(e).opacity !== '0'),
    toggleMode: () => click('#mode'),
    async toPlay() { if (!(await inRoll())) await click('#mode'); },
    async toDesign() { if (await inRoll()) await click('#mode'); },
    openBag: () => click('#bagbtn'),
    openGames: () => click('#gamesbtn'),
    openLog: () => click('#logbtn'),
    roll: () => page.locator('#gamepanel button.big:visible, #scorepane button.big:visible').first().click(),
    sound: () => click('#snd'),
    pauseSpin: () => click('#spinbtn'),
    layout: () => click('#layout'),
    async openDrawer() {},
    async fullView(on = true) { const hidden = await page.evaluate(() => document.body.classList.contains('calm') || document.body.classList.contains('full')); if (on !== hidden) { if (on) await page.keyboard.press('h'); else await click('#layout'); } },
  };
};
