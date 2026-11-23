// CSP load test + screenshot. node r19-csptest.mjs shapeId out.png
import { chromium } from '/home/ryan/code/pretty_dice-v4/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const html=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','gomboc-spike.html'); const csp="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' cdnjs.cloudflare.com cdn.jsdelivr.net unpkg.com; style-src 'unsafe-inline' fonts.googleapis.com; img-src data: blob:; font-src fonts.gstatic.com data:; connect-src 'none'; worker-src blob:; media-src blob: data:";
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1000,height:760}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await p.route('http://art.test/**',r=>r.fulfill({status:200,contentType:'text/html',headers:{'Content-Security-Policy':csp},body:fs.readFileSync(html,'utf8')}));
await p.goto('http://art.test/'); await p.waitForFunction(()=>window.__ready,null,{timeout:60000}); await p.evaluate(k=>window.__gomboc.setShape(k),process.argv[2]); await p.waitForTimeout(1500);
await p.screenshot({path:process.argv[3]}); console.log('ready',await p.evaluate(()=>window.__ready),'errors',JSON.stringify(errs)); await b.close();
