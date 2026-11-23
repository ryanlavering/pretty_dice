// Round 17 owner note 1: edge-saddle vertex bias. node r17-saddle.mjs body.json out.json
// For each saddle edge (exact, from poly-check exactCheck) insert a vertex at the CoM foot point on the edge, pushed outward by eps*rbar along (foot-c), plus a spiral offset in the perpendicular plane;
// hull + exact certificate + exact S,U,H each time (r14-lib evalPI). Greedy rounds keep the best (S=1, lowest U, then H).
import fs from 'fs'; import {evalPI,fromF,toF,sub,dot,cr,norm,SC} from './r14-lib.mjs';
const J=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); let PI0=J.vertices.map(p=>p.map(BigInt));
let e=evalPI(PI0); const log={base:{S:e.r.S,U:e.r.U,H:e.r.H,V:e.PI.length,F:e.T.length},rounds:[],stats:[]};
const EPS=[0.0005,0.002,0.006,0.02], RHO=[0,0.002,0.006,0.015,0.03], NPHI=8;
function cands(e){ const out=[]; const c=e.c, rb=e.rbar; for(const [a,b] of e.r.saddles){ const A=e.P[a],B=e.P[b]; const ed=sub(B,A); const t=dot(sub(c,A),ed)/dot(ed,ed); const f=A.map((x,k)=>x+t*ed[k]); const u0=sub(f,c); const u=u0.map(x=>x/norm(u0)); const a1=cr(u,[0.31,0.77,0.55]); const l1=norm(a1); const e1=a1.map(x=>x/l1); const e2=cr(u,e1);
  for(const eps of EPS) for(const rho of RHO) for(let q=0;q<(rho===0?1:NPHI);q++){ const ph=2*Math.PI*q/NPHI+rho*40; const p=f.map((x,k)=>x+eps*rb*u[k]+rho*rb*(Math.cos(ph)*e1[k]+Math.sin(ph)*e2[k])); out.push({sad:[a,b],eps,rho,ph,mag:Math.hypot(eps,rho),p}); } } return out; }
let cur=e; const hist=[];
for(let round=0;round<10;round++){ const cs=cands(cur); let best=null; const cls={};
  for(const c of cs){ const PI=[...cur.PI,fromF([c.p])[0]]; const n=evalPI(PI); if(!n||!n.valid){ cls.invalid=(cls.invalid||0)+1; continue; } const S=n.r.S,U=n.r.U,H=n.r.H; const key=`dS${S-cur.r.S}_dU${U-cur.r.U}_dH${H-cur.r.H}`; const o=cls[key]||(cls[key]={n:0,minMag:1e9}); o.n++; if(c.mag<o.minMag) o.minMag=c.mag;
    const score=(S!==1?1000*(S-1):0)+U*10+H; if(!best||score<best.score||(score===best.score&&c.mag<best.mag)) best={score,mag:c.mag,e:n,c,S,U,H}; }
  const curScore=(cur.r.S!==1?1000*(cur.r.S-1):0)+cur.r.U*10+cur.r.H;
  log.rounds.push({round,from:{S:cur.r.S,U:cur.r.U,H:cur.r.H},nSaddles:cur.r.saddles.length,ncand:cs.length,classes:cls,best:best&&{S:best.S,U:best.U,H:best.H,mag:best.mag,eps:best.c.eps,rho:best.c.rho,sad:best.c.sad}});
  console.log('round',round,'from',cur.r.S,cur.r.U,cur.r.H,'cands',cs.length,'best',best&&[best.S,best.U,best.H,best.mag.toFixed(4)]);
  if(!best||best.score>=curScore) break; cur=best.e; log.final={S:cur.r.S,U:cur.r.U,H:cur.r.H,V:cur.PI.length,F:cur.T.length,PI:cur.PI.map(p=>p.map(String))}; }
fs.writeFileSync(process.argv[3],JSON.stringify(log,null,1));
