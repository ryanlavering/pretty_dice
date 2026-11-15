// PD-142.38 control audit: boots the running app in a set of UI states, at phone and desktop sizes, and records every
// visible interactive control (label, id, region, size, covered or not) plus a screenshot per state.
// Output: docs/design/ui-audit/<state>-<desk|phone>.jpg and docs/design/ui-audit/controls.json (the audit doc is written from these).
// Usage: PD_LOCK_NOTE="design audit" sh scripts/with-test-lock.sh node scripts/ui-audit.mjs [state-filter ...]
// Needs a server on AUDIT_PORT (default 8136): python3 -m http.server 8136
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const OUT = new URL('../docs/design/ui-audit/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${process.env.AUDIT_PORT || '8136'}`;
const filters = process.argv.slice(2);
const VPS = { desk: { width: 1280, height: 800 }, phone: { width: 390, height: 844 } };
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const seedScript = seed => { let a = seed >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

async function open(vpName, query = '', seed = 7) {
  const vp = VPS[vpName];
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: vpName === 'phone', isMobile: vpName === 'phone' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.addInitScript(seedScript, seed);
  await page.goto(`${base}/index.html?libs=local&seed=${seed}${query ? '&' + query : ''}`);
  await page.waitForFunction(() => window.__ready && window.__pd, null, { timeout: 120_000 });
  await page.addStyleTag({ content: '#lagtoast{display:none!important}' });
  await page.waitForTimeout(1500);   // let any intro pill animation finish
  return { page, close: () => ctx.close() };
}
const settle = p => p.waitForFunction(() => window.__pd.rolling && window.__pd.settled, null, { timeout: 180_000 }).then(() => p.waitForTimeout(700));
const tap = (p, sel) => p.locator(sel).first().click();
const wait = (p, ms = 500) => p.waitForTimeout(ms);
const startGame = async (p, name, players) => {            // Games button -> pick the game -> Start
  await tap(p, '#gamesbtn'); await wait(p);
  const host = (await p.locator('#scorepane').isVisible()) ? '#scorepane' : '#gamepanel';
  const sel = p.locator(`${host} select`).first();
  if (name && await sel.count()) await sel.selectOption({ label: name }).catch(async () => { const o = await sel.locator('option').allTextContents(); const m = o.find(t => t.includes(name)); if (m) await sel.selectOption({ label: m }); });
  await wait(p, 300);
  if (players) { await p.locator(`${host} select`).nth(1).selectOption(String(players)); await wait(p, 300); await p.locator(`${host} input[type=checkbox][aria-label^="Seat 2"]`).check().catch(() => {}); }
  await tap(p, `${host} button.big`); await wait(p, 800);
  return host;
};

// name -> steps(page, vpName). Each state starts from a fresh boot (showcase view).
const STATES = {
  'showcase': async () => {},
  'showcase-info': async p => { await tap(p, '#info'); await wait(p); },
  'showcase-panel-hidden': async p => { await tap(p, '#layout'); await wait(p, 800); },
  'roll': async p => { await tap(p, '#roll'); await settle(p); },
  'roll-custom-set': async p => { await p.evaluate(() => { location.hash = ''; }); await tap(p, '#roll'); await settle(p); },
  'roll-log': async p => { await tap(p, '#roll'); await settle(p); await tap(p, '#logbtn'); await wait(p); },
  'roll-panel-hidden': async p => { await tap(p, '#roll'); await settle(p); await tap(p, '#layout'); await wait(p, 800); },
  'roll-held': async p => { await p.fill('#notation', '5d6'); await tap(p, '#notapply'); await wait(p, 800); await tap(p, '#roll'); await settle(p); for (const i of [0, 1]) { const q = await p.evaluate(i => window.__pd.bodyScreen(i), i); await p.mouse.click(q.x, q.y); await wait(p, 300); } },
  'showcase-add-menu': async p => { await tap(p, '#cards >> text=Add'); await wait(p, 600); },
  'showcase-custom-set': async p => { await p.fill('#notation', '2d6+d20+3'); await tap(p, '#notapply'); await wait(p, 1200); },
  'bag-set-editor': async p => { await p.fill('#notation', '2d6+3'); await tap(p, '#notapply'); await wait(p, 800); await p.fill('#setname', 'Thorn axe'); await tap(p, '#setsavebtn'); await wait(p, 600); await tap(p, '#bagopen'); await wait(p, 400); await tap(p, '#sheettabs button[data-tab=sets]'); await wait(p, 600); await tap(p, '#setlist .setrow .pen'); await wait(p, 700); },
  'bag-sets-saved': async p => { await p.fill('#notation', '2d6+3'); await tap(p, '#notapply'); await wait(p, 800); await p.fill('#setname', 'Thorn axe'); await tap(p, '#setsavebtn'); await wait(p, 600); await tap(p, '#bagopen'); await wait(p, 400); await tap(p, '#sheettabs button[data-tab=sets]'); await wait(p, 600); await tap(p, '#setlist .setrow .dots'); await wait(p, 500); },
  'bag-design-menu': async p => { await tap(p, '#bagopen'); await wait(p, 800); await tap(p, '#tiles .dots'); await wait(p, 500); },
  'bag-designs': async p => { await tap(p, '#bagopen'); await wait(p, 800); },
  'bag-sets': async p => { await tap(p, '#bagopen'); await wait(p, 500); await tap(p, '#sheettabs button[data-tab=sets]'); await wait(p, 600); },
  'games-setup': async p => { await tap(p, '#gamesbtn'); await wait(p, 800); },
  'game-yahtzee': async p => { await startGame(p, 'Yahtzee'); },
  'game-yahtzee-rolled': async p => { const h = await startGame(p, 'Yahtzee'); await tap(p, '#gamepanel button.big'); await settle(p); },
  'game-farkle-rolled': async p => { await startGame(p, 'Farkle'); await tap(p, '#gamepanel button.big'); await settle(p); },
  'game-craps': async p => { await startGame(p, 'Craps'); },
  'game-liars': async p => { await startGame(p, "Liar's Dice", 2); },
  'game-liars-bid': async p => { await startGame(p, "Liar's Dice", 2); await tap(p, '#gamepanel button.big, #scorepane button.big'); await wait(p, 2500); },
  'game-pig-rolled': async p => { await startGame(p, 'Pig'); await tap(p, '#gamepanel button.big'); await settle(p); },
};

// Runs in the page: every visible interactive element, with what a user sees.
function collect() {
  const vw = innerWidth, vh = innerHeight, out = [], seen = new Set();
  const cand = new Set(document.querySelectorAll('button,a[href],input,select,textarea,summary,[role=button],[role=tab],[tabindex]:not([tabindex="-1"]),label,[onclick]'));
  for (const e of document.querySelectorAll('body *')) {   // clickable non-button elements (cursor: pointer set on the element itself)
    const cs = getComputedStyle(e);
    if (cs.cursor === 'pointer' && getComputedStyle(e.parentElement).cursor !== 'pointer') cand.add(e);
  }
  const idChain = e => { const ids = []; for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) if (n.id) ids.push(n.id); return ids.slice(0, 4).join(' < '); };
  for (const e of cand) {
    if (e.tagName === 'CANVAS' || e === document.body) continue;
    if (e.tagName === 'LABEL' && !e.control && !e.querySelector('input,select')) continue;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) continue;
    if (!e.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const inView = r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;
    const cx = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(vh - 1, Math.max(0, r.top + r.height / 2));
    const top = inView ? document.elementFromPoint(cx, cy) : null;
    const covered = inView && top && !(e.contains(top) || top.contains(e) || (e.tagName === 'LABEL' && e.control === top));
    let label = e.getAttribute('aria-label') || e.title || (e.tagName === 'INPUT' || e.tagName === 'SELECT' || e.tagName === 'TEXTAREA' ? (e.labels?.[0]?.innerText || e.placeholder || e.name || (e.closest('.row,label,div')?.innerText || '').split('\n')[0]) : e.innerText) || '';
    label = label.replace(/\s+/g, ' ').trim().slice(0, 70);
    const key = [e.tagName, e.id, label, Math.round(r.left), Math.round(r.top)].join('|');
    if (seen.has(key)) continue; seen.add(key);
    out.push({
      tag: e.tagName.toLowerCase() + (e.type && e.tagName === 'INPUT' ? ':' + e.type : ''), id: e.id || '', cls: (e.className?.baseVal ?? e.className ?? '').toString().slice(0, 40), label,
      text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40), in: idChain(e),
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      inView, covered: !!covered, coveredBy: covered ? (top.id || top.className?.toString().slice(0, 30) || top.tagName) : '', disabled: !!e.disabled,
    });
  }
  return { vw, vh, scrollH: document.documentElement.scrollHeight, controls: out.sort((a, b) => a.y - b.y || a.x - b.x) };
}

const file = OUT + 'controls.json';
const all = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
for (const [name, steps] of Object.entries(STATES)) {
  if (filters.length && !filters.some(f => name.includes(f))) continue;   // 'behaviours' matches no state
  for (const vpName of Object.keys(VPS)) {
    const key = `${name}-${vpName}`;
    const { page, close } = await open(vpName, /custom-set|roll-held|set-editor|sets-saved/.test(name) ? 'shape=custom' : '');
    try {
      await steps(page, vpName);
      const data = await page.evaluate(collect);
      all[key] = data;
      await page.screenshot({ path: `${OUT}${key}.jpg`, type: 'jpeg', quality: 55 });
      const vis = data.controls.filter(c => c.inView);
      console.log(`${key}: ${data.controls.length} controls, ${vis.length} in view, ${vis.filter(c => c.covered).length} covered, roll-labelled in view: ${vis.filter(c => /\broll\b/i.test(c.label + ' ' + c.text) && c.tag !== 'label').map(c => c.id || c.text).join(', ')}`);
    } catch (e) { console.error(`${key} FAILED: ${e.message.split('\n')[0]}`); await page.screenshot({ path: `${OUT}${key}-FAILED.jpg`, type: 'jpeg', quality: 40 }).catch(() => {}); }
    await close();
  }
}
writeFileSync(file, JSON.stringify(all, null, 1));
// ---- behaviours: what each roll trigger, key and gesture actually does, measured in the running app ----
if (!filters.length || filters.includes('behaviours')) {
  const res = {};
  const snap = p => p.evaluate(() => { const pd = window.__pd, g = pd.game, st = g ? pd.GAMES.status(g.state) : null; let h = 0; const dj = JSON.stringify(pd.designToJSON()); for (let i = 0; i < dj.length; i++) h = (h * 31 + dj.charCodeAt(i)) | 0;
    return { view: pd.rolling ? 'roll' : 'showcase', settled: !!pd.settled, rollT: Math.round((pd.rollT || 0) * 10) / 10 > 0.5 ? 'old' : 'fresh', calm: document.body.classList.contains('calm'), design: h, dice: pd.dice.length, heldNote: document.querySelector('.heldnote')?.innerText || '', az: +pd.orbit.az.toFixed(2), el: +pd.orbit.el.toFixed(2), zoom: +(pd.rolling ? pd.state.rollZoom : pd.state.zoom).toFixed(2), topDown: +(+pd.topBlend || 0).toFixed(1) > 0.3, rollsUsed: st ? (st.rollsUsed ?? null) : null, inGame: !!g, sheet: !document.getElementById('bagsheet').hidden, log: !document.getElementById('logpanel').hidden, sound: !!pd.state.sound, spin: +pd.state.spin || 0, settingsShown: !!document.getElementById('settingspane')?.checkVisibility(), toolsShown: document.querySelectorAll('#tools button').length && [...document.querySelectorAll('#tools button')].filter(b => b.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })).length, logCount: (document.getElementById('logbtn').getAttribute('aria-label') || '') }; });
  const diff = (a, b) => Object.fromEntries(Object.keys(a).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map(k => [k, `${JSON.stringify(a[k])} -> ${JSON.stringify(b[k])}`]));
  const centre = async p => { const r = await p.evaluate(() => { const c = window.__pd.canvas.getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + c.height * 0.3 }; }); return r; };
  const TRIGGERS = {
    'key r': p => p.keyboard.press('r'),
    'key Space': p => p.keyboard.press('Space'),
    'key h': p => p.keyboard.press('h'),
    'key t (held)': async p => { await p.keyboard.down('t'); await wait(p, 700); },
    'panel #roll (Showcase|Roll switch, Roll half)': p => tap(p, '#roll'),
    'panel #back (Showcase half)': p => tap(p, '#back'),
    'quick bar Roll (empty box)': p => tap(p, '#qbar button:text-is("Roll")'),
    'quick bar d6 chip': p => tap(p, '#qbar button:text-is("d6")'),
    'flick on the mat': async p => { const c = await centre(p); await p.mouse.move(c.x - 80, c.y); await p.mouse.down(); await p.mouse.move(c.x + 80, c.y + 10, { steps: 3 }); await p.mouse.up(); },
    'tap a settled die': async p => { const q = await p.evaluate(() => window.__pd.bodyScreen(0)); await p.mouse.click(q.x, q.y); },
    'drag on the mat (slow)': async p => { const c = await centre(p); await p.mouse.move(c.x - 60, c.y); await p.mouse.down(); await p.mouse.move(c.x + 60, c.y, { steps: 25 }); await wait(p, 500); await p.mouse.up(); },
    'right-drag on the mat': async p => { const c = await centre(p); await p.mouse.move(c.x - 60, c.y); await p.mouse.down({ button: 'right' }); await p.mouse.move(c.x + 60, c.y + 30, { steps: 10 }); await p.mouse.up({ button: 'right' }); },
    'wheel on the mat': async p => { const c = await centre(p); await p.mouse.move(c.x, c.y); await p.mouse.wheel(0, 300); },
    'double-click the mat (after right-drag + wheel)': async p => { const c = await centre(p); await p.mouse.move(c.x - 60, c.y); await p.mouse.down({ button: 'right' }); await p.mouse.move(c.x + 60, c.y + 30, { steps: 10 }); await p.mouse.up({ button: 'right' }); await p.mouse.wheel(0, 300); await wait(p, 200); const a = await snap(p); await p.mouse.dblclick(c.x + 200, c.y + 250); await wait(p, 300); const b = await snap(p); return { note: `before reset az=${a.az} el=${a.el} zoom=${a.zoom}; after az=${b.az} el=${b.el} zoom=${b.zoom}` }; },
    'hold the total / status line': async p => { const el = p.locator('#result .tot:visible, #gamepanel .peekh:visible').first(); const b = await el.boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await wait(p, 900); },
    'long-press #layout': async p => { const b = await p.locator('#layout').boundingBox(); await p.mouse.move(b.x + 20, b.y + 20); await p.mouse.down(); await wait(p, 900); await p.mouse.up(); },
    'mat #snd': p => tap(p, '#snd'),
    'mat #spinbtn': p => tap(p, '#spinbtn'),
    'mat #layout': p => tap(p, '#layout'),
    'game panel big button': p => tap(p, '#gamepanel button.big'),
  };
  const CONTEXTS = {
    'showcase': { setup: async () => {}, skip: /quick bar|flick|settled die|total|game panel/ },
    'roll (5d6, settled)': { query: 'shape=custom', setup: async p => { await p.fill('#notation', '5d6'); await tap(p, '#notapply'); await wait(p, 800); await tap(p, '#roll'); await settle(p); }, skip: /spinbtn|game panel/ },
    'game: Yahtzee after the first roll': { setup: async p => { await startGame(p, 'Yahtzee'); await tap(p, '#gamepanel button.big'); await settle(p); }, skip: /spinbtn|drag on|right-drag|wheel|double-click|snd|long-press|#layout|key h|key t/ },
    'game: Yahtzee before the first roll': { setup: async p => { await startGame(p, 'Yahtzee'); }, skip: /spinbtn|drag on|right-drag|wheel|double-click|snd|long-press|#layout|key h|key t|settled die|total/ },
  };
  for (const [cname, ctx] of Object.entries(CONTEXTS)) {
    res[cname] = {};
    for (const [tname, fn] of Object.entries(TRIGGERS)) {
      if (ctx.skip.test(tname) || (process.env.BEH && !tname.includes(process.env.BEH))) continue;
      const { page, close } = await open('desk', ctx.query || '');
      try {
        await ctx.setup(page); page.setDefaultTimeout(4000);
        const present = await page.evaluate(() => document.getElementById('qbar').checkVisibility());
        const before = await snap(page);
        let extraEnd = {}; const extra = await fn(page);
        await wait(page, 350);
        const after = await snap(page);
        if (/^game/.test(cname) && !after.settled) { await page.waitForFunction(() => window.__pd.settled, null, { timeout: 60_000 }).catch(() => {}); await wait(page, 500); const end = await snap(page); extraEnd = { afterSettle: diff(before, end) }; }
        res[cname][tname] = { change: diff(before, after), ...(extra || {}), ...extraEnd, qbarShown: present };
      } catch (e) { res[cname][tname] = { error: e.message.split('\n')[0].slice(0, 120) }; }
      await close();
      console.log(cname, '|', tname, '|', JSON.stringify(res[cname][tname]));
    }
  }
  writeFileSync(OUT + 'behaviours.json', JSON.stringify(res, null, 1));
}

await browser.close();
