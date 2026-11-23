// node vis/render.mjs DATADIR OUTDIR [name ...]   : contact sheet + turntable PNG per body JSON in DATADIR (headless chromium, software GL, vendor three.js, no network)
import fs from 'fs'; import http from 'http'; import path from 'path'; import {createRequire} from 'module';
const here=path.dirname(new URL(import.meta.url).pathname), root=path.resolve(here,'../../..');
const cands=[root,'/home/ryan/code/pretty_dice-v4','/home/ryan/code/pretty_dice-v4.2-gomboc']; let chromium; for(const c of cands){ try{ chromium=createRequire(c+'/package.json')('playwright').chromium; break; }catch(e){} }
const [data,out,...names]=process.argv.slice(2); fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json'};
const srv=http.createServer((q,s)=>{ let u=decodeURIComponent(q.url.split('?')[0]); let f= u==='/render.html'?path.join(here,'render.html'): u.startsWith('/data/')?path.join(data,u.slice(6)):path.join(root,u); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){ s.writeHead(404); s.end(); return; } s.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(s); });
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const port=srv.address().port;
const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}); const pg=await br.newPage({viewport:{width:600,height:600}});
pg.on('console',m=>{ if(m.type()==='error') console.error('page:',m.text()); }); pg.on('pageerror',e=>console.error('pageerror',e.message));
await pg.goto(`http://127.0.0.1:${port}/render.html`); await pg.waitForFunction('window.READY===true',null,{timeout:60000});
const list=names.length?names:fs.readdirSync(data).filter(f=>f.endsWith('.json')&&!f.startsWith('_')).map(f=>f.replace('.json',''));
for(const nm of list){ const t0=Date.now(); const png=await pg.evaluate(async nm=>{ const b=await (await fetch('/data/'+nm+'.json')).json(); R.load(b,{}); return {sheet:R.contactSheet(),turn:R.turntable(12,20,220),views:R.viewList()}; },nm);
  fs.writeFileSync(`${out}/${nm}_sheet.png`,Buffer.from(png.sheet.split(',')[1],'base64')); fs.writeFileSync(`${out}/${nm}_turntable.png`,Buffer.from(png.turn.split(',')[1],'base64')); console.log(nm,((Date.now()-t0)/1000).toFixed(1)+'s'); }
await br.close(); srv.close();
