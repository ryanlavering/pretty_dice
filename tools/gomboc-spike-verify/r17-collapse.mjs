// Round 17 owner idea: merge/collapse moves. node r17-collapse.mjs body.json out.json [maxMoves]
// moves: (a) peak v moved along edge (v,w) by fraction s toward w (s=1 = collapse onto w), (b) removal of any vertex, (c) removal of a peak; result = convex hull of remaining points (exact certificate), exact S,U,H at the exact centroid (r14-lib evalPI).
import fs from 'fs'; import {evalPI,fromF,sub,norm,SC} from './r14-lib.mjs';
const J=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const maxMoves=+process.argv[4]||30;
let cur=evalPI(J.vertices.map(p=>p.map(BigInt))); const score=e=>(e.r.S-1)*1e4+e.r.U*100+e.r.H;
const stat=e=>({S:e.r.S,U:e.r.U,H:e.r.H,F:e.T.length,V:e.PI.length});
const aspect=e=>{ const c=e.c; let rm=0; for(const p of e.P) rm=Math.max(rm,norm(sub(p,c))); let hm=1e9; e.T.forEach((t,i)=>{hm=Math.min(hm,Math.abs(e.mg[i].h));}); return rm/hm; };
const rows=[{move:0,...stat(cur),shiftPct:0,aspect:aspect(cur),desc:'start'}]; let kinds={};
for(let mv=1;mv<=maxMoves;mv++){ const nbr=Array.from({length:cur.PI.length},()=>new Set()); cur.T.forEach(([a,b,c])=>{[[a,b],[b,c],[a,c]].forEach(([x,y])=>{nbr[x].add(y);nbr[y].add(x);});}); const sad=new Set(cur.r.saddles.map(([a,b])=>a<b?a+','+b:b+','+a));
  const cands=[]; const V=cur.PI.length;
  for(let v=0;v<V;v++) cands.push({desc:`remove v${v}${cur.r.peaks.includes(v)?'(peak)':''}`,PI:cur.PI.filter((_,i)=>i!==v)});
  for(const v of cur.r.peaks) for(const w of nbr[v]) for(const s of [0.1,0.25,0.5,0.75,1.0]){ const q=cur.P[v].map((x,k)=>x+s*(cur.P[w][k]-x)); const PI=cur.PI.map((p,i)=>i===v?fromF([q])[0]:p); const key=v<w?v+','+w:w+','+v; cands.push({desc:`peak v${v} -> w${w} s=${s}${sad.has(key)?' (saddle edge)':''}`,PI}); }
  let best=null,n=0,inv=0; const cls={};
  for(const c of cands){ let e; try{ e=evalPI(c.PI); }catch(x){ e=null; } if(!e||!e.valid){ inv++; continue; } n++; const k=`dS${e.r.S-cur.r.S}_dU${e.r.U-cur.r.U}_dH${e.r.H-cur.r.H}`; cls[k]=(cls[k]||0)+1; const sc=score(e); if(!best||sc<best.sc||(sc===best.sc&&e.T.length<best.e.T.length)) best={sc,e,desc:c.desc}; }
  kinds[mv]={cands:cands.length,valid:n,invalid:inv,classes:cls}; console.log('move',mv,'cands',cands.length,'valid',n,'best',best&&[best.desc,best.e.r.S,best.e.r.U,best.e.r.H,best.e.T.length]);
  if(!best||best.sc>=score(cur)){ rows.push({move:mv,note:'no improving move',...stat(cur)}); break; }
  const dc=Math.hypot(...sub(best.e.c,cur.c))/cur.rbar; cur=best.e; rows.push({move:mv,...stat(cur),shiftPct:100*dc,aspect:aspect(cur),desc:best.desc}); }
fs.writeFileSync(process.argv[3],JSON.stringify({rows,kinds},null,1)); console.log(JSON.stringify(rows.map(r=>[r.move,r.S,r.U,r.H,r.F,r.V])));
