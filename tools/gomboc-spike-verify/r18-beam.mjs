// Round 18 task 2: persistence-guided beam search (exact). node r18-beam.mjs body.json outprefix [width=8] [depth=12] [maxAspect=99]
// moves: valley fills (r18-lib modes x phi), peak edge-moves (s sweep, s=1 collapse), single vertex removals. Every state is an exact certified hull with S=1 (exact centroid).
import fs from 'fs'; import {evalPI,fromF,sub,norm} from './r14-lib.mjs'; import {pairs,fillPts,applyMove,aspectOf,stat,nbrs,key} from './r18-lib.mjs';
const J=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const pre=process.argv[3]; const W=+process.argv[4]||8, D=+process.argv[5]||12, AM=+process.argv[6]||99;
const e0=evalPI(J.vertices.map(p=>p.map(BigInt)));
const sc=e=>(e.r.S-1)*1e4+e.r.U*100+e.r.H;
function minBarrier(e){ try{ const ps=pairs(e); return ps.length?Math.min(...ps.map(p=>p.barrier))/e.rbar:1; }catch(x){ return 1; } }
function cands(e){ const out=[]; const V=e.PI.length; const nb=nbrs(e);
  for(let v=0;v<V;v++) out.push({d:`rm${v}`,f:()=>evalPI(e.PI.filter((_,i)=>i!==v))});
  for(const v of e.r.peaks) for(const w of nb[v]) for(const s of [0.1,0.25,0.5,0.75,1.0]) out.push({d:`mv${v}>${w}@${s}`,f:()=>{ const q=e.P[v].map((x,k)=>x+s*(e.P[w][k]-x)); return evalPI(e.PI.map((p,i)=>i===v?fromF([q])[0]:p)); }});
  let ps=[]; try{ ps=pairs(e);}catch(x){}
  ps.forEach((p,ip)=>{ for(const mode of ['ends','footends','cap3','ramp2','chain']) for(const phi of [0.3,0.6,0.9,1.1]){ const delta=phi*Math.max(p.barrier,1e-4*e.rbar); out.push({d:`fill${ip}${mode}@${phi}`,f:()=>applyMove(e,fillPts(e,p,delta,mode))}); } });
  return out; }
let beam=[{e:e0,path:['start'],k:key(e0)}]; const seen=new Set([key(e0)]); const rows=[{depth:0,...stat(e0),aspect:aspectOf(e0),mb:minBarrier(e0)}]; let best={e:e0,path:['start']};
for(let d=1;d<=D;d++){ const next=[]; let nc=0,valid=0;
  for(const b of beam){ for(const c of cands(b.e)){ nc++; let e; try{ e=c.f(); }catch(x){ e=null; } if(!e||!e.valid) continue; valid++; if(e.r.S!==1) continue; const k=key(e); if(seen.has(k)) continue; const asp=aspectOf(e); if(asp>AM) continue; seen.add(k); next.push({e,path:[...b.path,c.d],k,asp}); } }
  if(!next.length){ console.log('no successors'); break; }
  for(const n of next) n.mb=minBarrier(n.e); next.sort((a,b)=>sc(a.e)-sc(b.e)||a.mb-b.mb); beam=next.slice(0,W);
  const bb=beam[0]; if(sc(bb.e)<sc(best.e)||(sc(bb.e)===sc(best.e))) { if(sc(bb.e)<sc(best.e)) best=bb; }
  rows.push({depth:d,cands:nc,valid,kept:next.length,beamU:beam.map(b=>b.e.r.U),...stat(bb.e),aspect:bb.asp,mb:bb.mb,move:bb.path[bb.path.length-1]});
  console.log('depth',d,'cands',nc,'valid',valid,'S=1 new',next.length,'beam U',beam.map(b=>b.e.r.U).join(','),'best',stat(bb.e),'asp',bb.asp.toFixed(3),bb.path[bb.path.length-1]); }
const c=best.e; const sh=norm(sub(c.c,e0.c))/e0.rbar;
fs.writeFileSync(pre+'.json',JSON.stringify({rows,best:{...stat(c),aspect:aspectOf(c),shiftPct:100*sh,path:best.path},vertices:c.PI.map(p=>p.map(String)),faces:c.T,scale:'2^-40 integer'},null,1));
console.log('BEST',stat(c),'path',best.path.join(' | '));
