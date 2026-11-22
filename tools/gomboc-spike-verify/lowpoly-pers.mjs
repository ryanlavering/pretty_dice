// Round 10 low-poly lane: polyhedra from the verified monostable smooth body (ring-pers run json), measured with face-graph persistence.
//   node lowpoly-pers.mjs sweep run.json "2000,1000,500,300,200,120,80,60,40"      N-sweep of fibonacci-point hulls (monostable start = the smooth body)
//   node lowpoly-pers.mjs anneal run.json N seconds seed [out.json]                   anneal radial/angular perturbation of N points, cost = p2 + 0.02*(S-1)
import fs from 'fs'; import {fib} from './hull.mjs'; import {familyF} from './ring-family.mjs'; import {polyPers} from './poly-pers.mjs'; import {polyEquilibria} from './poly-equilibria.mjs';
const a=process.argv.slice(2); const run=JSON.parse(fs.readFileSync(a[1],'utf8'));
// F with CoM removed analytically is inside ring-pers; here use the projected shape (SH) via G.Shape for consistency with the other tools
import vm from 'vm'; const G=vm.runInNewContext(fs.readFileSync(new URL('./core.js',import.meta.url),'utf8')+';Gomboc');
import {project} from './ring-family.mjs'; const sh=project(familyF(run.params),12); const S=new G.Shape({c:sh.c,Lmax:12});
const pointsOf=dirs=>dirs.map(u=>{ const r=S.r(u[0],u[1],u[2]); return [r*u[0],r*u[1],r*u[2]]; });
const measure=V=>{ const e=polyEquilibria(V); const p=polyPers(V); return {N:V.length,F:e.F,E:e.E,V:e.V,S:e.S,U:e.U,H:e.H,PH:e.poincareHopf,p2:p.p2,p2n:p.p2n,hRange:p.hRange,top:p.pairs}; };
if(a[0]==='sweep'){ for(const N of a[2].split(',').map(Number)){ const t0=Date.now(); const V=pointsOf(fib(N)); const m=measure(V); m.sec=(Date.now()-t0)/1000; console.log(JSON.stringify(m)); } }
if(a[0]==='anneal'){ const N=+a[2], secs=+a[3], seed0=+(a[4]||1); let s=seed0>>>0; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; const gauss=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
  // state: unit directions + radial scale factor per vertex (free polyhedron: vertex = k_i * r(u_i) * u_i; k near 1 keeps it near the body but need not be on it)
  let D=fib(N).map(u=>u.slice()), K=new Array(N).fill(1); const build=(D,K)=>D.map((u,i)=>{ const r=K[i]*S.r(u[0],u[1],u[2]); return [r*u[0],r*u[1],r*u[2]]; });
  const cost=(D,K)=>{ try{ const V=build(D,K); const e=polyEquilibria(V); if(e.poincareHopf!==2) return {c:1e9}; const p=polyPers(V); const c=p.p2+0.02*(e.S-1)+2*Math.max(0,0.15-p.hRange)+2*Math.max(0,p.hRange-0.6); return {c,S:e.S,F:e.F,p2:p.p2,PH:e.poincareHopf}; }catch(e){ return {c:1e9}; } };
  let cur=cost(D,K), best={...cur,D:D.map(u=>u.slice()),K:K.slice()}; const t0=Date.now(); let it=0;
  while(Date.now()-t0<secs*1000){ it++; const fr=(Date.now()-t0)/(secs*1000), T=0.05*(1-fr)+1e-4; const i=Math.floor(rnd()*N); const u0=D[i].slice(), k0=K[i]; const sc=0.15*(1-0.9*fr);
    if(rnd()<0.3) K[i]=Math.min(1.25,Math.max(0.8,k0*(1+0.05*sc/0.15*gauss()))); else { const u=[u0[0]+sc*gauss()*0.3,u0[1]+sc*gauss()*0.3,u0[2]+sc*gauss()*0.3]; const l=Math.hypot(...u); D[i]=u.map(x=>x/l); }
    const c=cost(D,K); if(c.c<=cur.c||rnd()<Math.exp((cur.c-c.c)/T)){ cur=c; if(c.c<best.c) best={...c,D:D.map(u=>u.slice()),K:K.slice()}; } else { D[i]=u0; K[i]=k0; } }
  const V=build(best.D,best.K); const m=measure(V); console.log(JSON.stringify({...m,seconds:secs,steps:it,cost:best.c})); if(a[5]) fs.writeFileSync(a[5],JSON.stringify(V)); }
