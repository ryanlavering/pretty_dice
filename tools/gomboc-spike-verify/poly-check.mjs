// Round 11: exhaustive equilibrium check of a convex polyhedron of uniform density, in EXACT integer arithmetic (BigInt).
//   import {quantize, buildHull, exactCheck, floatCheck, globalConvexCert} from './poly-check.mjs'
// Rigor: the polyhedron is DEFINED as the convex hull of integer points (doubles rounded to a 2^-Q grid, so every vertex is an exact dyadic rational).
//  * centroid: exact rational (BigInt numerator / BigInt denominator), sum of signed tetrahedra about the origin
//  * convexity certificate: closed manifold (each directed edge once, reverse once), Euler V-E+F=2, every edge strictly locally convex (exact orientation),
//    positive volume, centroid strictly inside every face plane (star-shaped) -> boundary of a strictly convex polyhedron (Hadamard)
//  * stable faces / edge saddles / vertex peaks / tipping graph: exact sign tests, no tolerance
import {hull,fib} from './hull.mjs';
const Q=40n, SC=2**40;
export function quantize(P){ return P.map(p=>p.map(x=>BigInt(Math.round(x*SC)))); }
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sg=x=>x>0n?1:x<0n?-1:0;
export function buildHull(PI){ // PI: BigInt points; float hull on the exactly representable doubles, returns outward-oriented triangles [a,b,c]
  const Pf=PI.map(p=>p.map(x=>Number(x)/SC)); const tri=hull(Pf); return tri.map(t=>t.v.slice()); }
export function exactCheck(PI,T,tm={}){ const t0=performance.now(); const lap=(k)=>{ const t=performance.now(); tm[k]=(t-t0)/1000; };
  const V=PI.length,F=T.length; const out={V,F,E:3*F/2,eulerOK:V-3*F/2+F===2};
  // --- centroid (exact)
  let tA=performance.now(); let D6=0n, N=[0n,0n,0n]; for(const [a,b,c] of T){ const A=PI[a],B=PI[b],C=PI[c]; const v=dot(A,cr(B,C)); D6+=v; N[0]+=v*(A[0]+B[0]+C[0]); N[1]+=v*(A[1]+B[1]+C[1]); N[2]+=v*(A[2]+B[2]+C[2]); }
  const Dn=4n*D6; // centroid = N/Dn (scaled units 2^-40)
  out.volumePositive=D6>0n; const Cn=N, D=Dn; // C = Cn/D
  tm.centroid=(performance.now()-tA)/1000; out.centroid=Cn.map(x=>Number(x*(1n<<60n)/D)/2**60/SC);
  // --- manifold + convexity certificate + face data
  tA=performance.now(); const key=(a,b)=>a*V+b; const dir=new Map(); T.forEach((t,i)=>{ for(let k=0;k<3;k++){ const a=t[k],b=t[(k+1)%3]; dir.set(key(a,b),i); } });
  let manifold=dir.size===3*F; let allRev=true; for(const t of T){ for(let k=0;k<3;k++){ if(!dir.has(key(t[(k+1)%3],t[k]))) allRev=false; } }
  const NRM=T.map(([a,b,c])=>cr(sub(PI[b],PI[a]),sub(PI[c],PI[a]))); const OFF=T.map((t,i)=>dot(NRM[i],PI[t[0]]));
  let nonConvexEdges=0, flatEdges=0; for(let i=0;i<F;i++){ const t=T[i]; for(let k=0;k<3;k++){ const a=t[k],b=t[(k+1)%3],c=t[(k+2)%3]; const j=dir.get(key(b,a)); const tj=T[j]; const d=tj.find(x=>x!==a&&x!==b); const s=sg(dot(NRM[i],PI[d])-OFF[i]); if(s>0) nonConvexEdges++; else if(s===0) flatEdges++; } }
  // centroid strictly inside each plane: n.C - off*D has sign opposite to D when inside (n outward): n.(C) < off  => n.Cn - off*D <0 (D>0)
  let outsideC=0; const HS=new Array(F); for(let i=0;i<F;i++){ const s=dot(NRM[i],Cn)-OFF[i]*D; if(s>=0n) outsideC++; HS[i]=s; }
  out.manifold=manifold&&allRev; out.nonConvexEdges=nonConvexEdges/1; out.flatEdges=flatEdges/1; out.centroidOutsidePlanes=outsideC; out.convexCert=out.manifold&&out.eulerOK&&nonConvexEdges===0&&flatEdges===0&&outsideC===0&&out.volumePositive;
  tm.cert=(performance.now()-tA)/1000;
  // --- classification: faces (stable), edges (saddle), vertices (unstable)
  tA=performance.now(); const viol=new Array(F); const stable=[]; // viol[i] = list of [edgeIndexK, neighbourFace, signValue]
  for(let i=0;i<F;i++){ const t=T[i]; const vs=[]; for(let k=0;k<3;k++){ const a=t[k],b=t[(k+1)%3]; const e=sub(PI[b],PI[a]); const w=sub(Cn,PI[a].map(x=>x*D)); const s=dot(cr(e,w),NRM[i]); if(s<0n) vs.push([a,b,dir.get(key(b,a)),s]); else if(s===0n) out.degenerateStable=(out.degenerateStable||0)+1; } viol[i]=vs; if(!vs.length) stable.push(i); }
  const edgesSeen=new Set(); let H=0, degH=0; const saddles=[]; for(const [kk,i] of dir){ const a=Math.floor(kk/V), b=kk%V; if(a>b) continue; const j=dir.get(key(b,a)); const e=sub(PI[b],PI[a]); const w=sub(Cn,PI[a].map(x=>x*D)); const we=dot(w,e), ee=dot(e,e); // t=we/(D*ee) in (0,1)
    if(!(we>0n && we<D*ee)) continue; const Vv=[we*e[0]-ee*w[0],we*e[1]-ee*w[1],we*e[2]-ee*w[2]]; // direction C->foot scaled by ee, minus sign? foot-C = -w + (we/ee) e -> times ee
    const nf=NRM[i], ng=NRM[j]; // edge a->b is in face i ccw, so (nf x ng).(b-a) sign
    const s0=dot(cr(nf,ng),e); const al=dot(cr(Vv,ng),e), be=dot(cr(nf,Vv),e); const sa=sg(al)*sg(s0), sb=sg(be)*sg(s0);
    // V = F-C direction is -w+...: Vv defined as we*e - ee*w = ee*(F'-C') with F'-C' = (we/ee)e - w: correct
    if(sa>0&&sb>0){ H++; saddles.push([a,b]); } else if(sa>=0&&sb>=0&&(sa===0||sb===0)) degH++; }
  const nbrs=Array.from({length:V},()=>[]); for(const kk of dir.keys()){ const a=Math.floor(kk/V), b=kk%V; nbrs[a].push(b); }
  let U=0,degU=0; const peaks=[]; for(let v=0;v<V;v++){ const vp=sub(PI[v].map(x=>x*D),Cn); let allNeg=true, anyZero=false; for(const w of nbrs[v]){ const s=dot(sub(PI[w],PI[v]),vp); if(s>0n){allNeg=false;break;} if(s===0n) anyZero=true; } if(allNeg){ if(anyZero) degU++; else { U++; peaks.push(v); } } }
  out.tipEdgeList=[]; for(let i=0;i<F;i++) for(const [a,b,j] of viol[i]) out.tipEdgeList.push([i,j]); out.S=stable.length; out.U=U; out.H=H; out.degenerate={edge:degH,vertex:degU,face:out.degenerateStable||0}; out.poincareHopf=out.S+U-H; out.stableFaces=stable; out.peaks=peaks; out.saddles=saddles;
  tm.classify=(performance.now()-tA)/1000;
  // --- tipping graph: every violating edge leads to a strictly lower face (exact comparison of squared heights)
  tA=performance.now(); const hcmp=(i,j)=>{ // sign of h_i^2 - h_j^2, h_i = -HS[i]/(|n_i| D) ; h_i^2 = HS_i^2/(|n_i|^2 D^2)
    const li=dot(NRM[i],NRM[i]), lj=dot(NRM[j],NRM[j]); return sg(HS[i]*HS[i]*lj-HS[j]*HS[j]*li); };
  let tipEdges=0, notLower=0; for(let i=0;i<F;i++) for(const [a,b,j] of viol[i]){ tipEdges++; if(hcmp(j,i)>=0) notLower++; }
  // sinks and basin sizes: follow the steepest (lowest-neighbour) violating edge
  const sink=new Int32Array(F).fill(-1); const next=i=>{ let best=-1; for(const [a,b,j] of viol[i]){ if(best<0||hcmp(j,best)<0) best=j; } return best; };
  for(let i=0;i<F;i++){ let x=i, guard=0; const path=[]; while(sink[x]<0&&viol[x].length&&guard++<F+2){ path.push(x); x=next(x); } const s=sink[x]>=0?sink[x]:x; for(const p of path) sink[p]=s; sink[x]=s; }
  const basin=new Map(); for(let i=0;i<F;i++) basin.set(sink[i],(basin.get(sink[i])||0)+1);
  out.tip={edges:tipEdges,notLower,sinks:basin.size,sinksAreStable:[...basin.keys()].every(s=>viol[s].length===0),basin:[...basin.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6)};
  tm.tipping=(performance.now()-tA)/1000;
  out.pass1=out.convexCert&&out.S===1&&out.poincareHopf===2&&out.tip.notLower===0&&out.tip.sinks===1&&out.tip.sinksAreStable&&!out.degenerate.edge&&!out.degenerate.vertex&&!out.degenerate.face;
  out.heights=stable.map(i=>Math.sqrt(Number(HS[i]*HS[i]*(1n<<80n)/(dot(NRM[i],NRM[i])*D*D)))/2**40/SC);
  return out; }
// global convexity: every vertex on or below every face plane (float filter with a safe error bound, exact when ambiguous). O(V F).
export function globalConvexCert(PI,T){ const Pf=PI.map(p=>p.map(x=>Number(x))); const NRM=T.map(([a,b,c])=>cr(sub(PI[b],PI[a]),sub(PI[c],PI[a]))); const OFF=T.map((t,i)=>dot(NRM[i],PI[t[0]]));
  const Nf=NRM.map(n=>n.map(Number)), Of=OFF.map(Number); let ambiguous=0, violations=0; for(let i=0;i<T.length;i++){ const n=Nf[i]; const nm=Math.abs(n[0])+Math.abs(n[1])+Math.abs(n[2]); for(let v=0;v<PI.length;v++){ if(T[i].includes(v)) continue; const p=Pf[v]; const s=n[0]*p[0]+n[1]*p[1]+n[2]*p[2]-Of[i]; const err=1e-13*(nm*2**41+Math.abs(Of[i])); if(s<-err) continue; ambiguous++; const se=dot(NRM[i],PI[v])-OFF[i]; if(se>=0n) violations++; } } return {ambiguous,violations}; }
// plain float version (doubles, volumetric centroid in doubles) for timing comparison and cross-check
export function floatCheck(Pf,T){ const V=Pf.length,F=T.length; let v6=0,c=[0,0,0]; const dotf=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], crf=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], sf=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  for(const [a,b,d] of T){ const A=Pf[a],B=Pf[b],C=Pf[d]; const v=dotf(A,crf(B,C)); v6+=v; for(let k=0;k<3;k++) c[k]+=v*(A[k]+B[k]+C[k]); } c=c.map(x=>x/(4*v6)); const P=Pf.map(p=>sf(p,c)); let S=0,minMargin=1e9; for(const [a,b,d] of T){ const n=crf(sf(P[b],P[a]),sf(P[d],P[a])); const nl=Math.hypot(...n); const tt=[a,b,d]; let ok=true; for(let k=0;k<3;k++){ const A=P[tt[k]],B=P[tt[(k+1)%3]]; const s=dotf(crf(sf(B,A),sf([0,0,0],A)),n)/nl; if(s<0) ok=false; if(Math.abs(s)<minMargin) minMargin=Math.abs(s); } if(ok) S++; } return {S,centroid:c,minFootMargin:minMargin}; }
export function bodyPoints(shapeFile,N,kind='fib'){ return null; }
// Flip non-convex edges until the triangulation is the boundary of the convex hull (all vertices stay if they are extreme). Exact orientation tests.
export function flipToConvex(PI,T0,maxFlips=5e6){ const T=T0.map(t=>t.slice()), V=PI.length, key=(a,b)=>a*V+b; const dir=new Map(); T.forEach((t,i)=>{ for(let k=0;k<3;k++) dir.set(key(t[k],t[(k+1)%3]),i); });
  const orient=(a,b,c,d)=>{ const A=PI[a]; return dot(cr(sub(PI[b],A),sub(PI[c],A)),sub(PI[d],A)); }; // >0: d on the outer side of oriented triangle a,b,c
  const q=[]; for(let i=0;i<T.length;i++) for(let k=0;k<3;k++) q.push([T[i][k],T[i][(k+1)%3]]); let flips=0;
  while(q.length&&flips<maxFlips){ const [a,b]=q.pop(); const i=dir.get(key(a,b)); const j=dir.get(key(b,a)); if(i===undefined||j===undefined) continue; const ti=T[i], tj=T[j]; if(!(ti.includes(a)&&ti.includes(b)&&tj.includes(a)&&tj.includes(b))) continue;
    const c=ti.find(x=>x!==a&&x!==b), d=tj.find(x=>x!==a&&x!==b); if(orient(a,b,c,d)<=0n) continue; if(dir.has(key(c,d))||dir.has(key(d,c))) continue; // would create a duplicate edge
    // also the flipped quad must be convex as seen from outside: c,d must straddle properly: check new triangles have positive orientation consistent: orient(c,a,d,b) must be <0 and orient(d,b,c,a) <0
    if(orient(c,a,d,b)>=0n||orient(d,b,c,a)>=0n) continue;
    for(const t of [ti,tj]) for(let k=0;k<3;k++) dir.delete(key(t[k],t[(k+1)%3]));
    T[i]=[c,a,d]; T[j]=[d,b,c]; for(const [t,idx] of [[T[i],i],[T[j],j]]) for(let k=0;k<3;k++){ dir.set(key(t[k],t[(k+1)%3]),idx); q.push([t[k],t[(k+1)%3]]); } flips++; }
  return {T,flips}; }
