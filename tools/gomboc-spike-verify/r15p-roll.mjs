// Round 15 (lane gomboc-phys): headless page-driver roll test. node r15p-roll.mjs shapeId seed0 count [damp]
import { chromium } from '/home/ryan/code/pretty_dice-v4/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const html=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','gomboc-spike.html');
const [shape,s0,cnt,damp]=process.argv.slice(2); const csp="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' cdnjs.cloudflare.com cdn.jsdelivr.net unpkg.com; style-src 'unsafe-inline' fonts.googleapis.com; img-src data: blob:; font-src fonts.gstatic.com data:; connect-src 'none'; worker-src blob:; media-src blob: data:";
const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.route('http://art.test/**',r=>r.fulfill({status:200,contentType:'text/html',headers:{'Content-Security-Policy':csp},body:fs.readFileSync(html,'utf8')}));
await p.goto('http://art.test/'); await p.waitForFunction(()=>window.__ready,null,{timeout:60000});
if(shape&&shape!=='sloan') await p.evaluate(k=>window.__gomboc.setShape(k),shape);
let div=0,ok=0,res=[];
for(let i=0;i<+cnt;i++){ const seed=+s0+i; const t0=Date.now(); const r=await p.evaluate(([s,d])=>window.__gomboc.fastRoll(s,d!=null?{damp:d}:{}),[seed,damp!=null?+damp:null]);
  const good=r.tRest!=null&&r.distRad<0.06; const bad=r.tRest==null; if(bad) div++; if(good) ok++; res.push({seed,...r});
  console.log(seed,'tRest',r.tRest&&r.tRest.toFixed(2),'dist(deg)',(r.distRad*57.3).toFixed(2),'face',r.face,'swings',r.swings,'minFz',r.minFz.toExponential(2),(Date.now()-t0)+'ms'); }
console.log(shape,'rolls',cnt,'rested-on-stable',ok,'no-rest/diverged',div,'errors',errs.slice(0,3)); await b.close();
