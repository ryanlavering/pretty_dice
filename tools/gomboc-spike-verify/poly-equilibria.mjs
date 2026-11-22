// Reusable equilibrium counter for a convex polyhedron of uniform density, given its vertex list.
//   import {polyEquilibria, fibonacciMesh} from './poly-equilibria.mjs';
//   const r = polyEquilibria(vertices, {com:[x,y,z]});  // optional: use this centre of mass instead of the volume centroid (approximate mode / CoM nudge)
//   const r = polyEquilibria(vertices);   // vertices: [[x,y,z],...]; non-extreme points are dropped by the hull
//   r.S stable (face) equilibria, r.U unstable (vertex), r.H saddle (edge), r.poincareHopf (S+U-H must be 2), r.faces, r.verts.
// Method: hull (hull.mjs, incremental), coplanar triangles merged into faces, centre of mass = volume centroid of the hull.
// A resting position is an equilibrium iff the support point of direction u=x/|x| is x, with x a candidate contact point: the foot of the
// perpendicular from the CoM on a face (stable), on a real edge (saddle), or a vertex (unstable). This is the classical
// Varkonyi-Domokos classification; degenerate (non-generic) cases within `tol` are reported in r.degenerate.
import {hull,fib,centroid} from './hull.mjs';
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], len=a=>Math.hypot(a[0],a[1],a[2]);
export function polyEquilibria(vertices,opt={}){ const tol=opt.tol||1e-9; let P=vertices.map(v=>v.slice()); let tri=hull(P); const c=opt.com||centroid(P,tri); P=P.map(p=>sub(p,c)); tri=hull(P);
  // merge coplanar triangles into faces
  const faces=[]; for(const t of tri){ let f=faces.find(g=>dot(g.n,t.n)>1-1e-9&&Math.abs(g.d-t.d)<1e-9); if(!f){ f={n:t.n,d:t.d,tris:[],vs:new Set()}; faces.push(f); } f.tris.push(t); t.v.forEach(i=>f.vs.add(i)); }
  const used=new Set(); faces.forEach(f=>f.vs.forEach(i=>used.add(i))); const verts=[...used];
  const support=u=>{ let m=-1e9; for(const i of verts){ const s=dot(P[i],u); if(s>m) m=s; } return m; };
  const isEq=(x)=>{ const l=len(x); if(l<1e-12) return false; const u=[x[0]/l,x[1]/l,x[2]/l]; return support(u)<=l+tol; };
  let S=0,U=0,H=0; const stable=[],unstable=[],saddle=[];
  // faces: foot inside the (merged) face = inside one of its triangles
  for(const f of faces){ const foot=[f.n[0]*f.d,f.n[1]*f.d,f.n[2]*f.d]; const inside=f.tris.some(t=>{ for(let k=0;k<3;k++){ const a=P[t.v[k]],b=P[t.v[(k+1)%3]]; if(dot(cross(sub(b,a),sub(foot,a)),f.n)<-tol) return false; } return true; }); if(inside){ S++; stable.push({n:f.n,h:f.d}); } }
  for(const i of verts){ if(isEq(P[i])){ U++; unstable.push({v:i,h:len(P[i])}); } }
  // real edges: boundary edges of merged faces shared by two different faces
  const edgeFaces=new Map(); faces.forEach((f,fi)=>{ for(const t of f.tris) for(let k=0;k<3;k++){ const a=t.v[k],b=t.v[(k+1)%3]; const key=a<b?a+'_'+b:b+'_'+a; const e=edgeFaces.get(key)||{a,b,fs:new Set()}; e.fs.add(fi); edgeFaces.set(key,e); } });
  let E=0; for(const e of edgeFaces.values()){ if(e.fs.size<2) continue; E++; const A=P[e.a],B=P[e.b],d=sub(B,A),dd=dot(d,d); const t=-dot(A,d)/dd; if(t<=tol||t>=1-tol) continue; const foot=[A[0]+t*d[0],A[1]+t*d[1],A[2]+t*d[2]]; if(isEq(foot)){ H++; saddle.push({a:e.a,b:e.b,h:len(foot)}); } }
  const F=faces.length,V=verts.length;
  return {S,U,H,poincareHopf:S+U-H,F,V,E,eulerOK:V-E+F===2,com:c,stable,unstable,saddle}; }
// generators --------------------------------------------------------------
export function fibonacciMesh(radialFn,N){ return fib(N).map(u=>{ const r=radialFn(u[0],u[1],u[2]); return [r*u[0],r*u[1],r*u[2]]; }); }   // radialFn(x,y,z) -> r, e.g. new Gomboc.Shape(...).r
export const cube=()=>{ const v=[]; for(const x of [-1,1]) for(const y of [-1,1]) for(const z of [-1,1]) v.push([x,y,z]); return v; };
export const tetra=()=>[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]];
if(process.argv[1]&&process.argv[1].endsWith('poly-equilibria.mjs')){ const fs=await import('fs'); if(process.argv[2]){ const V=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const r=polyEquilibria(V); delete r.stable;delete r.unstable;delete r.saddle; console.log(JSON.stringify(r)); }
  else for(const [n,v] of [['cube',cube()],['tetrahedron',tetra()]]){ const r=polyEquilibria(v); console.log(n,'S',r.S,'U',r.U,'H',r.H,'S+U-H',r.poincareHopf,'F',r.F,'V',r.V,'E',r.E); } }
