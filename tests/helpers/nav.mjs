// Navigation helpers (PD-142.38 slice 0). Specs and scripts/guide-shots.mjs drive the app's chrome through these
// instead of naming round-button selectors, so a navigation slice changes one helper here, not many specs.
// navFor(page) works with any Playwright page; app.nav is navFor(app.page).
//  toPlay()/toDesign()  the Play / Design rooms: a click of the Design | Play switch (never throws dice)
//  toggleMode()         a plain tap of the other half of the switch, for tests of the switch itself
//  openBag() openGames() openLog()   open the bag sheet / games panel / roll log
//  roll()               in a game (body.game) or with no panel, the dock's #rollbtn (slices 2-3); in the games setup panel, its Start game button
//  sound() pauseSpin() layout() resetView()   the utility items: each opens the drawer first (slice 1); layout() = the Full view item
//  openDrawer() closeDrawer()   the utility drawer (cube button, #drawerbtn)
//  fullView(on)         hide (on=true) or restore the side pane with the two handles (#paneclose / #paneopen); H also toggles it
export const navFor = page => {
  const inRoll = () => page.evaluate(() => document.body.classList.contains('inroll'));
  const click = sel => page.locator(sel).click();
  const phone = () => (page.viewportSize() || { width: 1280 }).width <= 760;   // PD-142.38.22: on a phone the Design | Play switch is only in the cube menu (drawer) button's list
  const room = async sel => { if (phone() && (sel === '#roll' || sel === '#back')) { await click('#drawerbtn'); await click('#roomsw'); } else await click(sel); };
  const BTN = { mode: '#modesw', games: '#gamestab', bag: '#bagbtn', log: '#paneltabs [data-pane=log]', sound: '#snd', spin: '#spinbtn', layout: '#layout', drawer: '#drawerbtn', reset: '#resetview', info: '#info', shelf: '#shelf', panel: 'aside' };
  return {
    page,
    /** locator for a chrome control by name: mode games bag log sound spin layout info shelf panel */
    btn: name => page.locator(BTN[name]),
    /** true when the control is displayed, visible (drawer items are hidden while the drawer is closed) and not faded out */
    shown: name => page.locator(BTN[name]).evaluate(e => getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0'),
    toggleMode: async () => room((await page.locator('#back.on').count()) ? '#roll' : '#back'),
    async toPlay() { if (await page.locator('#back.on').count()) await room('#roll'); },
    async toDesign() { if (!(await page.locator('#back.on').count())) await room('#back'); },
    async openBag() { if (!(await page.locator('#bagsheet:not([hidden])').count())) await click('#bagbtn'); await page.locator('#bagsheet:not([hidden])').waitFor(); },   // PD-142.38.43: the round Bag button (both rooms) opens the Bag view overlay (Designs tab)
    async openGames() { await this.toPlay(); await click('#gamestab'); },   // the Games tab belongs to the Play room (slice 5)
    async openLog() { await this.toPlay(); await click('#paneltabs [data-pane=log]'); },   // the Log tab (Play room)
    async roll() { const inGame = await page.evaluate(() => document.body.classList.contains('game')); const g = page.locator('#gamepanel button.big:visible, #scorepane button.big:visible'); await ((!inGame && (await g.count())) ? g.first() : page.locator('#rollbtn')).click(); },
    async sound() { await this.openDrawer(); await click('#snd'); },
    async pauseSpin() { await this.openDrawer(); await click('#spinbtn'); },
    async layout() { await this.openDrawer(); await click('#layout'); },
    async resetView() { await this.openDrawer(); await click('#resetview'); },
    async openDrawer() { if (!(await page.locator('#drawer.open').count())) await click('#drawerbtn'); await page.locator('#drawer.open').waitFor(); await page.waitForTimeout(260); },
    async closeDrawer() { if (await page.locator('#drawer.open').count()) { await click('#drawerbtn'); await page.locator('#drawer:not(.open)').waitFor(); } },   // PD-203: a single tap on the cube waits ~250 ms for a possible double, so wait for the close before the next tap
    async fullView(on = true) { const hidden = await page.evaluate(() => document.body.classList.contains('full')); if (on !== hidden) await click(on ? '#paneclose' : '#paneopen'); },
  };
};
