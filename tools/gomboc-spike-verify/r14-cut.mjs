// Round 14 task 1: face-cut / vertex-sink experiment on exactly certified S=2 bodies. Every accepted state: hull of 2^-40 dyadic points, exact convexity certificate + global test, exact S.
//   node r14-cut.mjs body.json out.json [maxGreedy]
import fs from 'fs'; import {load,evalPI,costOf,toF,fromF,sub,dot,cr,norm,SC} from './r14-lib.mjs'; import {fib} from './hull.mjs';
const [,,file,outf,MG='14']=process.argv; const PI0=load(file); const E0=evalPI(PI0); const rb=E0.rbar; const log={file,start:{F:E0.T.length,S:E0.S,stable:E0.stable}};
const STEPS=[0.002,0.005,0.01,0.02,0.04,0.08,0.15,0.25];
function nbrFaces(e,f){ const t=e.T[f]; const out=new Set(); e.T.forEach((u,i)=>{ if(i!==f&&u.some(v=>t.includes(v))) out.add(i); }); return out; }
function spurious(e){ const c=costOf(e); let best=-1; for(const i of e.stable) if(i!==c.low&&(best<0||e.mg[i].m<e.mg[best].m)) best=i; return {f2:best,low:c.low,cost:c.cost}; }
const sum=e=>({S:e.S,stable:e.stable.length<=6?e.stable.map(i=>({n:e.mg[i].u.map(x=>+x.toFixed(3)),m:+(e.mg[i].m/e.rbar).toFixed(4),h:+(e.mg[i].h/e.rbar).toFixed(3)})):'many',U:e.r.U,H:e.r.H,F:e.T.length});
// move generators on point set PI (BigInt). Returns list of {desc, PI'}
function sinks(e,f2,dirs){ const T=e.T; const vs=new Set(T[f2]); const verts1=[...vs]; const nb=new Set(verts1); for(const i of nbrFaces(e,f2)) for(const v of T[i]) nb.add(v); const out=[]; const P=e.P, c=e.c; const n2=e.mg[f2].u;
  const mv=(v,dir,s)=>{ const Q=e.PI.map(p=>p.slice()); const d=dir; Q[v]=Q[v].map((x,k)=>x+BigInt(Math.round(d[k]*s*rb*SC))); return Q; };
  const dirOf=(v,kind)=>{ if(kind==='c'){ const d=sub(c,P[v]); const l=norm(d); return d.map(x=>x/l); } const d=n2.map(x=>-x); return d; };
  for(const v of nb) for(const kind of dirs) for(const s of STEPS) out.push({desc:`sink v${v}${verts1.includes(v)?'*':''} ${kind} ${s}`,mvs:[[v,kind,s]],PI:mv(v,dirOf(v,kind),s)});
  return {singles:out,nb:[...nb],verts1,mv,dirOf}; }
function cuts(e,f2,nDir,depths){ const P=e.P,c=e.c,T=e.T; const out=[]; const dirs=fib(nDir); const n2=e.mg[f2].u; const rr=P.map(p=>p); const edges=new Set(); T.forEach(t=>{for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3]; edges.add(a<b?a+'_'+b:b+'_'+a);}});
  const E=[...edges].map(s=>s.split('_').map(Number)); const foot=(()=>{ const m=e.mg[f2]; return c.map((x,k)=>x+m.h*m.u[k]); })();
  // directions: the sphere samples plus a cone around n2 (cap tilted by 15..60 deg, 8 azimuths)
  const ex=Math.abs(n2[0])<0.9?[1,0,0]:[0,1,0]; const t1=cr(n2,ex), l1=norm(t1); const u1=t1.map(x=>x/l1), u2=cr(n2,u1); for(const ang of [10,20,30,45,60]) for(let k=0;k<8;k++){ const a=k*Math.PI/4,ca=Math.cos(ang*Math.PI/180),sa=Math.sin(ang*Math.PI/180); dirs.push([0,1,2].map(i=>ca*n2[i]+sa*(Math.cos(a)*u1[i]+Math.sin(a)*u2[i]))); }
  for(const n of dirs){ const pr=P.map(p=>dot(n,p)); const mx=Math.max(...pr); for(const dep of depths){ const o=mx-dep*rb; const keep=[]; const newp=[]; const inKeep=pr.map(x=>x<=o); P.forEach((p,i)=>{ if(inKeep[i]) keep.push(i); }); if(keep.length<4) continue; for(const [a,b] of E){ if(inKeep[a]!==inKeep[b]){ const t=(o-pr[a])/(pr[b]-pr[a]); newp.push(P[a].map((x,k)=>x+t*(P[b][k]-x))); } } if(!newp.length) continue; const cm=newp.reduce((s,p)=>s.map((x,k)=>x+p[k]/newp.length),[0,0,0]);
      const Q=keep.map(i=>e.PI[i]); for(const p of newp){ const d2=Math.hypot(...sub(p,cm)); const q=p.map((x,k)=>x-n[k]*1e-3*d2*d2/rb); Q.push(q.map(x=>BigInt(Math.round(x*SC)))); } out.push({desc:`cut n=${n.map(x=>x.toFixed(2))} depth ${dep}`,PI:Q,ncap:newp.length}); } }
  return out; }
const record=(res,desc,e)=>{ if(!e||!e.valid) {res.invalid++; return null;} res.n++; const c=costOf(e); return {desc,cost:c.cost,S:e.S,e,c}; };
const N2=E0.mg[spurious(E0).f2].u, N1=E0.mg[spurious(E0).low].u; const hasN=(e,n)=>e.stable.some(i=>dot(e.mg[i].u,n)>0.97);
function runSet(cands,res){ res.hist=res.hist||{}; res.killed=res.killed||{n:0,minS:99,ex:null}; let best=null; for(const cd of cands){ const e=evalPI(cd.PI); const r=record(res,cd.desc,e); if(!r) continue; r.mvs=cd.mvs; res.hist[r.S]=(res.hist[r.S]||0)+1; if(!hasN(e,N2)){ res.killed.n++; if(!hasN(e,N1)) res.killed.lowGone=(res.killed.lowGone||0)+1; if(r.S<res.killed.minS){ res.killed.minS=r.S; res.killed.ex={desc:r.desc,...sum(e)}; } } if(r.S===1){ res.S1.push({desc:cd.desc,exactPI:e.PI.map(p=>p.map(String)),T:e.T}); } if(!res.bestS||r.S<res.bestS) res.bestS=r.S; if(!best||r.cost<best.cost) best=r; } return best; }
const f2info=spurious(E0); log.f2={f2:f2info.f2,low:f2info.low,margin:E0.mg[f2info.f2].m/rb,h2:E0.mg[f2info.f2].h/rb,h1:E0.mg[f2info.low].h/rb};
// (a) single cuts
const res={a_cuts:{n:0,invalid:0,S1:[],bestS:null},b_single:{n:0,invalid:0,S1:[],bestS:null},c_pairs:{n:0,invalid:0,S1:[],bestS:null}};
let t=performance.now(); const cc=cuts(E0,f2info.f2,300,[0.01,0.03,0.06,0.1,0.15,0.25]); const bc=runSet(cc,res.a_cuts); log.a={hist:res.a_cuts.hist,killed:res.a_cuts.killed,cands:cc.length,valid:res.a_cuts.n,invalid:res.a_cuts.invalid,bestS:res.a_cuts.bestS,S1:res.a_cuts.S1.length,best:bc&&{desc:bc.desc,cost:bc.cost,...sum(bc.e)},sec:(performance.now()-t)/1000}; 
// S distribution of cuts
// (b) single sinks, (c) pairs
t=performance.now(); const sk=sinks(E0,f2info.f2,['c','n']); const bs=runSet(sk.singles,res.b_single); log.b={hist:res.b_single.hist,killed:res.b_single.killed,cands:sk.singles.length,valid:res.b_single.n,invalid:res.b_single.invalid,bestS:res.b_single.bestS,S1:res.b_single.S1.length,best:bs&&{desc:bs.desc,cost:bs.cost,...sum(bs.e)},sec:(performance.now()-t)/1000};
t=performance.now(); const pairs=[]; const nb=sk.nb; const PS=[0.005,0.02,0.05,0.12,0.25]; for(let i=0;i<nb.length;i++) for(let j=i+1;j<nb.length;j++) for(const kind of ['c','n']) for(const s1 of PS) for(const s2 of PS){ const Q=E0.PI.map(p=>p.slice()); for(const [v,s] of [[nb[i],s1],[nb[j],s2]]){ const d=sk.dirOf(v,kind); Q[v]=Q[v].map((x,k)=>x+BigInt(Math.round(d[k]*s*rb*SC))); } pairs.push({desc:`pair v${nb[i]}+v${nb[j]} ${kind} ${s1},${s2}`,PI:Q}); }
const bp=runSet(pairs,res.c_pairs); log.c={hist:res.c_pairs.hist,killed:res.c_pairs.killed,cands:pairs.length,valid:res.c_pairs.n,invalid:res.c_pairs.invalid,bestS:res.c_pairs.bestS,S1:res.c_pairs.S1.length,best:bp&&{desc:bp.desc,cost:bp.cost,...sum(bp.e)},sec:(performance.now()-t)/1000};
// (d) greedy sequences: each step = best of {all single sinks of vertices around the current worst spurious face, cuts} by cost; exact check each step; two variants
function greedy(useCuts){ let cur=E0; const seq=[]; let curCost=costOf(cur).cost; for(let step=0;step<+MG;step++){ const sp=spurious(cur); if(sp.f2<0){ break; } const cands=sinks(cur,sp.f2,['c','n']).singles; if(useCuts) cands.push(...cuts(cur,sp.f2,60,[0.01,0.03,0.08,0.15])); let best=null; const rr={n:0,invalid:0,S1:[]}; for(const cd of cands){ const e=evalPI(cd.PI); const r=record(rr,cd.desc,e); if(!r) continue; if(!best||r.cost<best.cost) best=r; } if(!best||best.cost>=curCost-1e-9){ seq.push({step,stop:'no improving move',cands:cands.length}); break; } cur=best.e; curCost=best.cost; seq.push({step,desc:best.desc,cost:+best.cost.toFixed(4),...sum(cur)}); if(cur.S===1) break; } return {seq,final:sum(cur),finalS:cur.S,PI:cur.PI.map(p=>p.map(String)),T:cur.T}; }
t=performance.now(); log.d_sinks=greedy(false); log.d_cuts=greedy(true); log.d_sec=(performance.now()-t)/1000;
const keep={}; for(const k of ['a_cuts','b_single','c_pairs']) if(res[k].S1.length) keep[k]=res[k].S1[0];
fs.writeFileSync(outf,JSON.stringify({log,S1:keep}));
const short=JSON.parse(JSON.stringify(log,(k,v)=>k==='PI'||k==='T'?undefined:v)); console.log(JSON.stringify(short,null,1));
