// Per-role browser driver for the playtest. Usage: node pw.mjs <role> <command> [args...]
// Each role has its own Chromium (own profile dir, own CDP port, one tab). Commands are user-level only.
// Run from the repo root so @playwright/test resolves (npm install first).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const ROOT = process.env.PT_DIR ? process.env.PT_DIR + '/' : new URL('..', import.meta.url).pathname;   // PT_DIR holds profiles/ and shots/
const ROLES = { dm: 9301, p1: 9302, p2: 9303, p3: 9304 };
const [role, cmd, ...a] = process.argv.slice(2);
const port = ROLES[role];
if (!port || !cmd) { console.error('usage: node pw.mjs <dm|p1|p2|p3> <open|shot|text|snap|click|clickxy|type|press|drag|wheel|size|close> ...'); process.exit(2); }
const up = () => fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.ok, () => false);
async function launch(url, vp) {
  if (await up()) return;
  const dir = ROOT + 'profiles/' + role; mkdirSync(dir, { recursive: true });
  const exe = chromium.executablePath();
  const p = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${vp[0]},${vp[1]}`,
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run', '--no-sandbox', url], { detached: true, stdio: 'ignore' });
  p.unref();
  for (let i = 0; i < 100 && !(await up()); i++) await new Promise(r => setTimeout(r, 200));
}
if (cmd === 'open') {
  const url = a[0], vp = (a[1] || '1280x800').split('x').map(Number);
  await launch(url, vp);
}
if (!(await up())) { console.error(`no browser for ${role}; run: node pw.mjs ${role} open <url> [WxH]`); process.exit(1); }
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const ctx = browser.contexts()[0];
const page = ctx.pages()[0] || await ctx.newPage();
const out = s => console.log(s);
try {
  switch (cmd) {
    case 'open': { const vp = (a[1] || '1280x800').split('x').map(Number); await page.setViewportSize({ width: vp[0], height: vp[1] });
      if (!page.url().startsWith(a[0].split('?')[0])) await page.goto(a[0]); await page.waitForTimeout(4000); out('opened ' + page.url()); break; }
    case 'size': { const vp = a[0].split('x').map(Number); await page.setViewportSize({ width: vp[0], height: vp[1] }); out('ok'); break; }
    case 'shot': { const f = ROOT + 'shots/' + (a[0] || role + '.png'); await page.screenshot({ path: f }); out(f); break; }
    case 'text': out((await page.locator('body').innerText()).slice(0, 6000)); break;       // what is visible on the page, as text
    case 'snap': out((await page.locator('body').ariaSnapshot()).slice(0, 8000)); break;      // accessibility tree: buttons, fields, labels
    case 'click': await page.getByText(a[0], { exact: a[1] === 'exact' }).first().click({ timeout: 8000 }); out('clicked'); break;   // by visible text
    case 'clickrole': await page.getByRole(a[0], { name: a[1] }).first().click({ timeout: 8000 }); out('clicked'); break;            // clickrole button "Roll"
    case 'clickxy': await page.mouse.click(+a[0], +a[1]); out('clicked'); break;
    case 'type': await page.keyboard.type(a[0]); out('typed'); break;
    case 'press': await page.keyboard.press(a[0]); out('pressed'); break;
    case 'drag': { const [x1, y1, x2, y2] = a.map(Number); await page.mouse.move(x1, y1); await page.mouse.down();
      for (let i = 1; i <= 8; i++) { await page.mouse.move(x1 + (x2 - x1) * i / 8, y1 + (y2 - y1) * i / 8); await page.waitForTimeout(25); }
      await page.mouse.up(); out('dragged'); break; }
    case 'wheel': await page.mouse.wheel(0, +a[0]); out('scrolled'); break;
    case 'wait': await page.waitForTimeout(+a[0] * 1000); out('waited'); break;
    case 'close': await browser.close().catch(() => {}); out('closed'); break;
    default: out('unknown command');
  }
} catch (e) { out('ERROR: ' + e.message.split('\n')[0]); }
await browser.close().catch(() => {});   // detaches from CDP (does not kill the browser when connected over CDP? see close)
