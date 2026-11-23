// Round 14 shared helpers: exact evaluation of a point set (rounded to 2^-40) = hull + exact certificate + exact S, plus float margins for guidance.
import fs from 'fs'; import {quantize,buildHull,exactCheck,globalConvexCert} from './poly-check.mjs';
export const SC=2**40;
export const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const norm=a=>Math.hypot(...a);
export function load(file){ const J=JSON.parse(fs.readFileSync(file,'utf8')); return J.vertices.map(p=>p.map(BigInt)); }
export const toF=PI=>PI.map(p=>p.map(x=>Number(x)/SC));
export const fromF=P=>P.map(p=>p.map(x=>BigInt(Math.round(x*SC))));
// float margin of face (triangle a,b,c outward oriented) for CoM c: signed distance of the foot to the nearest edge line (positive = inside = stable)
export function margins(P,T,c){ return T.map(([a,b,d])=>{ const A=P[a],B=P[b],C=P[d]; const n=cr(sub(B,A),sub(C,A)); const l=norm(n); const u=n.map(x=>x/l); const h=dot(u,sub(A,c)); const foot=[c[0]+h*u[0],c[1]+h*u[1],c[2]+h*u[2]]; let m=1e9; for(const [p,q] of [[A,B],[B,C],[C,A]]){ const e=sub(q,p); const s=dot(cr(e,sub(foot,p)),u)/norm(e); if(s<m) m=s; } return {m,h,u}; }); }
// Full evaluation. Returns null if the hull is not exactly certified strictly convex. PI: BigInt points (any, interior ones dropped).
export function evalPI(PI0){ let T; try{ T=buildHull(PI0); }catch(e){ return null; } const used=[...new Set(T.flat())].sort((a,b)=>a-b); const mp=new Map(used.map((v,i)=>[v,i])); const PI=used.map(v=>PI0[v]); T=T.map(t=>t.map(v=>mp.get(v)));
  let r; try{ r=exactCheck(PI,T); }catch(e){ return null; } if(!r.convexCert) return {PI,T,r,valid:false}; const g=globalConvexCert(PI,T); const valid=g&&g.violations===0&&!r.degenerate.edge&&!r.degenerate.vertex&&!r.degenerate.face;
  const P=toF(PI); const c=r.centroid; const mg=margins(P,T,c); const rbar=P.reduce((s,p)=>s+norm(sub(p,c)),0)/P.length; return {PI,T,r,valid,P,c,mg,rbar,S:r.S,stable:r.stableFaces}; }
// cost: S-like count weighted by margin; lowest stable face (smallest height) is the wanted one
export function costOf(e){ const st=e.stable; let low=st[0]; for(const i of st) if(e.mg[i].h*e.mg[i].h<e.mg[low].h*e.mg[low].h && false) low=i; // h is signed distance (negative); lowest = largest |h| is highest; use smallest |h|
  low=st[0]; for(const i of st) if(Math.abs(e.mg[i].h)<Math.abs(e.mg[low].h)) low=i; let cst=0; for(const i of st){ if(i===low) continue; cst+=1+Math.min(1,e.mg[i].m/(0.5*e.rbar)); } for(let i=0;i<e.T.length;i++){ if(e.mg[i].m<=0&&!st.includes(i)){ const x=e.mg[i].m/e.rbar+0.05; if(x>0) cst+=0.3*x; } } return {cost:cst,low}; }
// Exact (BigInt) stable-face count for a CoM cI (BigInt triple, 2^-40 units): foot of cI on plane i strictly inside triangle i. Also strict inclusion of cI in the body.
export function exactAtC(PI,T,cI){ const s=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], d=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], x=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; const stable=[]; let degenerate=0, inside=true;
  T.forEach(([a,b,c],i)=>{ const A=PI[a],B=PI[b],C=PI[c]; const n=x(s(B,A),s(C,A)); let all=true; for(const [u,v] of [[A,B],[B,C],[C,A]]){ const g=d(x(s(v,u),s(cI,u)),n); if(g<=0n) all=false; if(g===0n) degenerate++; } if(all) stable.push(i); if(d(n,cI)>=d(n,A)) inside=false; });
  return {S:stable.length,stable,degenerate,inside}; }
export function certifyShifted(P,c){ const PI0=fromF(P); const e=evalPI(PI0); if(!e||!e.valid) return {ok:false,why:'hull not certified',e}; const cI=c.map(v=>BigInt(Math.round(v*SC))); const x=exactAtC(e.PI,e.T,cI); const Pf=e.P, g=e.c; const shift=norm(sub(c,g))/e.rbar; return {ok:x.S===1&&x.inside&&x.degenerate===0,exact:x,e,cI,shift,homS:e.S,F:e.T.length,V:e.PI.length,rbar:e.rbar,g,margins:(()=>{ const m=margins(e.P,e.T,c); return m; })()}; }
