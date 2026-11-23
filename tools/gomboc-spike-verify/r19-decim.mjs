// Round 19 task 2: decimation beam (exact). node r19-decim.mjs body.json outprefix [width=8] [depth=60] [Umax=14] [aspMax=99]
// Moves: single vertex removal; every edge collapsed onto one end (s=1) or to the midpoint (s=0.5); each state an exact certified hull with S=1 (exact centroid) and U<=Umax.
// Score: fewer triangles first, then lower U, then lower aspect. Pareto record: per triangle count the best (U, aspect) reached.
import fs from 'fs'; import {evalPI,fromF,norm,sub} from './r14-lib.mjs'; import {aspectOf,stat,nbrs,key} from './r18-lib.mjs';
const J=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const pre=process.argv[3]; const W=+process.argv[4]||8, D=+process.argv[5]||60, UM=+process.argv[6]||14, AM=+process.argv[7]||99;
const e0=evalPI(J.vertices.map(p=>p.map(BigInt)));
function cands(e){ const out=[]; const V=e.PI.length; const nb=nbrs(e);
  for(let v=0;v<V;v++) out.push(()=>evalPI(e.PI.filter((_,i)=>i!==v)));
  for(let v=0;v<V;v++) for(const w of nb[v]){ if(v>w) continue; for(const s of [0,0.5,1]){ out.push(()=>{ const q=e.P[v].map((x,k)=>x+s*(e.P[w][k]-x)); const PI=e.PI.map((p,i)=>i===v?fromF([q])[0]:p).filter((_,i)=>i!==w); return evalPI(PI); }); } }
  return out; }
const pareto=new Map(); const rec=(e,asp,path)=>{ const F=e.T.length; const u=e.r.U; const o=pareto.get(F); if(!o||u<o.U||(u===o.U&&asp<o.aspect)) pareto.set(F,{F,V:e.PI.length,S:e.r.S,U:u,H:e.r.H,aspect:asp,path}); };
const a0=aspectOf(e0); rec(e0,a0,['start']); let beam=[{e:e0,asp:a0,path:['start']}]; const seen=new Set([key(e0)]); const t0=Date.now();
for(let d=1;d<=D;d++){ const next=[];
  for(const b of beam) for(const f of cands(b.e)){ let e; try{ e=f(); }catch(x){ e=null; } if(!e||!e.valid||e.r.S!==1||e.r.U>UM) continue; const k=key(e); if(seen.has(k)) continue; const asp=aspectOf(e); if(asp>AM) continue; seen.add(k); rec(e,asp,[...b.path,d]); next.push({e,asp,path:[...b.path,d]}); }
  if(!next.length){ console.log('no successors'); break; }
  // keep diversity: best W by (F,U,asp), but also one per distinct F
  next.sort((a,b)=>a.e.T.length-b.e.T.length||a.e.r.U-b.e.r.U||a.asp-b.asp); beam=next.slice(0,W);
  console.log('depth',d,'valid S=1,U<=',UM,next.length,'best',JSON.stringify(stat(beam[0].e)),'asp',beam[0].asp.toFixed(2),((Date.now()-t0)/1000).toFixed(0)+'s'); }
const rows=[...pareto.values()].sort((a,b)=>a.F-b.F); const front=[]; let bu=1e9; for(const r of rows){ if(r.U<bu){ front.push(r); bu=r.U; } }
fs.writeFileSync(pre+'_pareto.json',JSON.stringify({all:rows.map(r=>({F:r.F,V:r.V,U:r.U,H:r.H,aspect:r.aspect})),front:front.map(r=>({F:r.F,V:r.V,U:r.U,H:r.H,aspect:r.aspect}))},null,1));
// save lowest-face body
const lo=beam[0]; fs.writeFileSync(pre+'_lowF.json',JSON.stringify({...stat(lo.e),aspect:lo.asp,vertices:lo.e.PI.map(p=>p.map(String)),faces:lo.e.T,scale:'2^-40 integer'}));
console.log('FRONT',JSON.stringify(front.map(r=>[r.F,r.U,+r.aspect.toFixed(2)])));
