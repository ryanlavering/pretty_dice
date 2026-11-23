// node tools/gomboc-die/fuzz.mjs [rounds=15] [lite|real]  -- random looks, then select the gomboc d1 through the picker (Design room, Play room, over a saved bag); reports exceptions
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const rounds = +(process.argv[2] || 15), lite = process.argv[3] !== 'real', base = 'http://127.0.0.1:8131';
const server = spawn(process.execPath, [new URL('../../scripts/serve.mjs', import.meta.url).pathname, '8131'], { stdio: 'ignore' });
for (let i = 0; i < 50 && !(await fetch(base + '/index.html').then(r => r.ok, () => false)); i++) await new Promise(r => setTimeout(r, 100));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-accelerated-2d-canvas'] });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errs = []; page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(`${base}/index.html?libs=local&seed=1&gomboc${lite ? '&lite' : ''}`);
  await page.waitForFunction(() => window.__ready && window.__pd, null, { timeout: 120_000 });
  for (let k = 0; k < rounds; k++) {
    const res = await page.evaluate(async k => {
      const pd = window.__pd, st = pd.state, R = Math.random, pick = a => a[Math.floor(R() * a.length)], out = { k, errors: [] };
      const sub = Object.keys(pd.SUBSTRATES), stones = Object.keys(pd.STONES), fonts = Object.keys(pd.FONTS);
      const set = { substrate: pick(sub), stone: pick(stones), font: pick(fonts), inclusion: pick(['none', 'duck', 'cateye', 'coin', 'skull', 'gem', 'star', 'custom']), numRaised: R() < .5, polish: R(), paintMode: pick(['auto', 'manual', 'single']), radius: pick([0, .04, .1, .2]), panel: pick([0, 0, .3]), filigree: pick(['none', 'none', 'scroll', 'beads', 'deco']), patina: R() < .3 ? R() : 0, numPaint: R() < .7, d6Style: pick(['numbers', 'pips']), d4Style: pick(['tips', 'center']), glitter: R(), clarity: R(), numSize: .4 + R() * .5, numRot: pick([0, 15, 45]), notation: pick(['2d6+d20+3', '3d8', '4d4+2', '2d10', 'd100']) };
      Object.assign(st, set); out.set = set;
      const shapeFrom = pick(['d20', 'd6', 'custom', 'd100']);
      try { st.shape = shapeFrom; pd.buildDice(); } catch (e) { out.errors.push('pre-build ' + shapeFrom + ': ' + e.message); }
      const btn = document.querySelector('button[data-id=gomboc172]');
      const before = { dice: pd.dice.length };
      try { btn.click(); } catch (e) { out.errors.push('click: ' + e.message); }
      await new Promise(r => setTimeout(r, 400));
      out.after = { shape: st.shape, dice: pd.dice.length, body: document.body.className, design: document.body.classList.contains('design') };
      if (pd.dice.length !== 1 || st.shape !== 'gomboc172') out.errors.push('after select: shape=' + st.shape + ' dice=' + pd.dice.length);
      try { pd.simRoll({ maxSteps: 600 }); } catch (e) { out.errors.push('roll: ' + e.message); }
      return out;
    }, k);
    console.log(JSON.stringify(res.errors.length ? res : { k, ok: true, shape: res.after.shape, dice: res.after.dice, design: res.after.design, set: `${res.set.substrate}/${res.set.stone}/${res.set.inclusion}/${res.set.font}` }));
  }
  console.log('page errors:', JSON.stringify(errs.slice(0, 8)));
} finally { await browser.close(); server.kill(); }
