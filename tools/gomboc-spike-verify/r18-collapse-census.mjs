// node r18-collapse-census.mjs body.json out.json : exact census of peak edge-moves (fine s), peak radial pullback, vertex removal, for a seed body
import fs from 'fs'; import {evalPI,fromF,sub,norm,dot} from './r14-lib.mjs'; import {nbrs,stat,aspectOf} from './r18-lib.mjs';
const J=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const e=evalPI(J.vertices.map(p=>p.map(BigInt))); const nb=nbrs(e); const rows=[]; const hist={};
const rec=(d,x)=>{ if(!x||!x.valid){ hist.invalid=(hist.invalid||0)+1; return; } const s=stat(x); const k=`${s.S},${s.U},${s.H}`; hist[k]=(hist[k]||0)+1; rows.push({d,...s,aspect:aspectOf(x)}); };
for(const v of e.r.peaks){ for(const w of nb[v]) for(let i=1;i<=50;i++){ const s=i/50; const q=e.P[v].map((x,k)=>x+s*(e.P[w][k]-x)); rec(`mv${v}>${w}@${s}`,evalPI(e.PI.map((p,j)=>j===v?fromF([q])[0]:p))); }
  for(let i=1;i<=50;i++){ const f=i/50*0.5; const q=e.P[v].map((x,k)=>e.c[k]+(x-e.c[k])*(1-f)); rec(`pull${v}@${f}`,evalPI(e.PI.map((p,j)=>j===v?fromF([q])[0]:p))); } }
for(let v=0;v<e.PI.length;v++) rec(`rm${v}`,evalPI(e.PI.filter((_,j)=>j!==v)));
const s1=rows.filter(r=>r.S===1); s1.sort((a,b)=>a.U-b.U||a.H-b.H);
console.log('hist',JSON.stringify(Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,12))); console.log('S=1 best',JSON.stringify(s1.slice(0,5)));
fs.writeFileSync(process.argv[3],JSON.stringify({hist,s1best:s1.slice(0,20)},null,1));
