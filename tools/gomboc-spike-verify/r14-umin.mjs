// Round 14: homogeneous bodies. Keep S=1 (float margin slack EPS) and aspect rmax/hmin <= RHO, minimise U (unstable vertices; mono-monostatic = U 1), then EXACT certification (r12-certify style).
//   node r14-umin.mjs start.json out.json seconds [seed]   (start.json: {vertices:[BigInt strings 2^-40]} )
import fs from 'fs'; import {hull} from './hull.mjs'; import {load,toF,sub,dot,cr,norm,evalPI} from './r14-lib.mjs';
const [,,startf,outf,secs='60',sd='1']=process.argv; let s=(+sd*2654435761)>>>0; const rnd=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; const gauss=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
const EPS=+(process.env.EPS||0.004), RHO=+(process.env.RHO||2), MU=+(process.env.MU||30), T0=+(process.env.T0||0.3), NU=+(process.env.NU||1);
let P=toF(load(startf));
function ev(P){ const H=hull(P); let v6=0,g=[0,0,0]; const tri=[]; for(const f of H){ const [a,b,d]=f.v.map(i=>P[i]); const v=dot(a,cr(b,d)); v6+=v; for(let k=0;k<3;k++) g[k]+=v*(a[k]+b[k]+d[k]); tri.push(f.v); } g=g.map(x=>x/(4*v6)); let rb=0; for(const p of P) rb+=norm(sub(p,g)); rb/=P.length;
  let hmin=1e9, best=-1e9, wi=-1; const ms=new Float64Array(tri.length); for(let i=0;i<tri.length;i++){ const [A,B,C]=tri[i].map(k=>P[k]); const n=cr(sub(B,A),sub(C,A)); const l=norm(n); const h=dot(n,sub(A,g))/l; if(h<hmin) hmin=h; let m=1e9; for(const [p,q] of [[A,B],[B,C],[C,A]]){ const e=sub(q,p); const t=dot(cr(e,sub(g,p)),n)/(norm(e)*l); if(t<m) m=t; } ms[i]=m; if(m>best){ best=m; wi=i; } }
  let rmax=0; for(const p of P){ const r=norm(sub(p,g)); if(r>rmax) rmax=r; } const asp=rmax/hmin; let viol=Math.max(0,EPS*rb-best); for(let i=0;i<tri.length;i++) if(i!==wi) viol+=Math.max(0,ms[i]+EPS*rb); viol=viol/rb+Math.max(0,asp-RHO)*0.5;
  const nb=new Map(); for(const t of tri) for(let k=0;k<3;k++){ const a=t[k],b=t[(k+1)%3]; (nb.get(a)||nb.set(a,[]).get(a)).push(b); (nb.get(b)||nb.set(b,[]).get(b)).push(a); } let U=0; for(const [v,ws] of nb){ const vp=sub(P[v],g); let all=true; for(const w of ws) if(dot(sub(P[w],P[v]),vp)>=-1e-9*rb*rb){ all=false; break; } if(all) U++; }
  return {cost:MU*viol+NU*Math.max(0,U-1),viol,U,F:tri.length,rb,asp}; }
let cur=ev(P); let best=cur.viol<1e-12?{P:P.map(p=>p.slice()),...cur}:null; const t0=Date.now(),T=+secs*1000; let it=0; const trace=[]; let lastLog=0;
while(Date.now()-t0<T){ it++; const fr=(Date.now()-t0)/T; const Temp=T0*Math.pow(0.02/T0,fr); const sg=cur.rb*Math.pow(10,-4+3.2*rnd()); const i=Math.floor(rnd()*P.length); const P2=P.slice(); P2[i]=P[i].map(x=>x+sg*gauss()); const e=ev(P2); if(process.env.HARD&&e.viol>1e-12) continue; if(e.cost<=cur.cost||rnd()<Math.exp((cur.cost-e.cost)/Temp)){ P=P2; cur=e; if(cur.viol<1e-12&&(!best||cur.U<best.U)) best={P:P.map(p=>p.slice()),...cur}; }
  if(Date.now()-lastLog>20000){ lastLog=Date.now(); trace.push({t:Math.round((Date.now()-t0)/1000),it,U:cur.U,viol:+cur.viol.toFixed(4),bestU:best&&best.U,F:cur.F}); } }
const res={start:startf,secs:+secs,seed:+sd,iters:it,RHO,trace,floatBestU:best&&best.U};
if(best){ const e=evalPI(best.P.map(p=>p.map(x=>BigInt(Math.round(x*2**40))))); res.exact=e&&{valid:e.valid,S:e.S,U:e.r.U,H:e.r.H,F:e.T.length,PH:e.r.poincareHopf,pass:e.r.pass1}; if(e&&e.valid&&e.S===1) fs.writeFileSync(outf,JSON.stringify({vertices:e.PI.map(p=>p.map(String)),faces:e.T,scale:'2^40',res})); }
console.log(JSON.stringify(res));
