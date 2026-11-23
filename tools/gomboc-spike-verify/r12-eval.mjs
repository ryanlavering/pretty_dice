// Round 12: float evaluator of a convex polytope given as halfspaces (n_i . x <= d_i, unit n_i, origin strictly inside), by the dual hull.
//   evalHS(N,D) -> {ok,F,V,S,stable:[plane idx],margin:[per face],h:[per face height from centroid],verts,c,faceIdx}
// Rigor: FLOAT (doubles). Stable face = foot of the perpendicular from the volumetric centroid inside the polygon (margin > -tolM, conservative).
import {hull} from './hull.mjs';
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function evalHS(N,D,tolM=1e-9){ const n=N.length; for(let i=0;i<n;i++) if(!(D[i]>1e-6)) return {ok:false};
  const Q=N.map((u,i)=>[u[0]/D[i],u[1]/D[i],u[2]/D[i]]); let tri; try{ tri=hull(Q); }catch(e){ return {ok:false}; }
  for(const t of tri) if(!(t.d>1e-9)) return {ok:false}; // origin must be strictly inside (polytope bounded)
  const verts=tri.map(t=>[t.n[0]/t.d,t.n[1]/t.d,t.n[2]/t.d]); // primal vertex of each dual triangle
  const inc=new Map(); tri.forEach((t,k)=>t.v.forEach(i=>{ if(!inc.has(i)) inc.set(i,[]); inc.get(i).push(k); }));
  const nb=new Map(); for(const t of tri) for(let k=0;k<3;k++){ const a=t.v[k],b=t.v[(k+1)%3]; if(!nb.has(a)) nb.set(a,new Set()); if(!nb.has(b)) nb.set(b,new Set()); nb.get(a).add(b); nb.get(b).add(a); }
  // order rings, centroid by fans from origin (origin inside: signed volumes positive)
  const ring=new Map(); let V6=0, C=[0,0,0];
  for(const [i,ks] of inc){ const u=N[i]; let e1=Math.abs(u[0])<0.9?[1,0,0]:[0,1,0]; e1=sub(e1,u.map(x=>x*dot(e1,u))); const l=Math.hypot(...e1); e1=e1.map(x=>x/l); const e2=cr(u,e1);
    const mc=[0,0,0]; for(const k of ks) for(let q=0;q<3;q++) mc[q]+=verts[k][q]/ks.length; const m=ks.map(k=>{ const p=sub(verts[k],mc); return [k,Math.atan2(dot(p,e2),dot(p,e1))]; }).sort((a,b)=>a[1]-b[1]).map(x=>x[0]); ring.set(i,m);
    for(let j=1;j+1<m.length;j++){ const A=verts[m[0]],B=verts[m[j]],Cc=verts[m[j+1]]; const v=dot(A,cr(B,Cc)); V6+=v; for(let k=0;k<3;k++) C[k]+=v*(A[k]+B[k]+Cc[k]); } }
  if(!(V6>0)) return {ok:false}; const c=C.map(x=>x/(4*V6));
  const faceIdx=[...inc.keys()]; const stable=[], margin=[], h=[]; let hmin=1e9, rmax=0;
  for(const i of faceIdx){ const u=N[i]; const hi=D[i]-dot(u,c); h.push(hi); if(hi<hmin) hmin=hi; if(!(hi>1e-9)) return {ok:false};
    const foot=[c[0]+hi*u[0],c[1]+hi*u[1],c[2]+hi*u[2]]; let m=1e9; for(const j of nb.get(i)){ const w=N[j]; const sl=D[j]-dot(w,foot); const t=sub(w,u.map(x=>x*dot(w,u))); const tl=Math.hypot(...t); const dist=tl>1e-12?sl/tl:(sl>0?1e9:-1e9); if(dist<m) m=dist; } margin.push(m); if(m>-tolM) stable.push(i); }
  for(const p of verts){ const r=Math.hypot(...sub(p,c)); if(r>rmax) rmax=r; }
  return {ok:true,F:faceIdx.length,V:verts.length,S:stable.length,stable,margin,h,faceIdx,verts,c,hmin,rmax,ring}; }
// planes from a vertex cloud's hull (outward unit normals, offsets from the origin)
export function planesOfHull(P){ const tri=hull(P); return {N:tri.map(t=>t.n),D:tri.map(t=>t.d),tri}; }
