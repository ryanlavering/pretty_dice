// Small simulated-annealing search for low-poly convex polyhedra (uniform density) using the tipping-graph fitness.
//   node tipping-search.mjs N [seconds] [seed] [policy]     -> prints one JSON line (best candidate: fitness, S, U, H, F, E, V, C=F+E+V-2) and writes best_N.json (vertices) next to it if OUT is set
import fs from 'fs'; import {tippingGraph,tippingFitness} from './tipping-graph.mjs'; import {polyEquilibria} from './poly-equilibria.mjs';
const N=+process.argv[2], secs=+(process.argv[3]||60), seed0=+(process.argv[4]||1), policy=process.argv[5]||'steepest';
let s=seed0>>>0; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; const gauss=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
const ELONG=+(process.env.ELONG||1), SIG=+(process.env.SIG||0.15), TEMP=+(process.env.TEMP||2);   // ELONG>1 starts from an elongated cloud (monostable polyhedra of Conway-Guy type are very elongated), SIG scales the perturbation
const randPt=()=>{ const v=[gauss(),gauss(),gauss()]; const l=Math.hypot(...v); const r=0.8+0.4*rnd(); const p=v.map(x=>x/l*r); p[2]*=ELONG; return p; };
let P=Array.from({length:N},randPt); const evalP=Q=>{ try{ const g=tippingGraph(Q,{policy}); return {f:tippingFitness(g),g}; }catch(e){ return {f:1e6}; } };
let cur=evalP(P), best={f:cur.f,P:P.map(p=>p.slice())}; const t0=Date.now(); let it=0,acc=0,T0=TEMP; 
while(Date.now()-t0<secs*1000){ it++; const frac=(Date.now()-t0)/(secs*1000); const T=T0*(1-frac)+0.01; const i=Math.floor(rnd()*N); const sig=SIG*(1-0.9*frac); const old=P[i]; const q=[old[0]+gauss()*sig,old[1]+gauss()*sig,old[2]+gauss()*sig]; P[i]=q; const ev=evalP(P);
  if(ev.f<=cur.f||rnd()<Math.exp((cur.f-ev.f)/T)){ cur=ev; acc++; if(ev.f<best.f){ best={f:ev.f,P:P.map(p=>p.slice())}; } } else P[i]=old; }
const r=polyEquilibria(best.P); const g=tippingGraph(best.P,{policy});
const res={N,policy,seconds:secs,steps:it,accepted:acc,fitness:+best.f.toFixed(3),sinks:g.sinks.length,S:r.S,U:r.U,H:r.H,F:r.F,E:r.E,V:r.V,C:r.F+r.E+r.V-2,PoincareHopf:r.poincareHopf,cyclicFaces:g.cycles};
console.log(JSON.stringify(res)); if(process.env.OUT) fs.writeFileSync(process.env.OUT,JSON.stringify(best.P));
