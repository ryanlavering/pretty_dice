// Face-adjacency "tipping graph" of a convex polyhedron of uniform density, and a cheap fitness for a low-poly (monostable / mono-monostatic) search.
//   import {tippingGraph, tippingFitness} from './tipping-graph.mjs';   const g = tippingGraph(vertices, {policy:'steepest'});
// A face is a sink (a stable resting face) iff the foot of the perpendicular from the CoM lies inside it. Otherwise the body, resting on that face with no
// momentum, tips over each boundary edge whose outer side contains the foot; it can have several such edges. Policies for choosing the next face:
//   'steepest'  : among the tipping edges take the neighbour with the lowest CoM height (steepest descent in potential energy);  default
//   'worst'     : the edge over which the foot is furthest outside (largest tipping moment arm).
// next(f) = neighbour face across the chosen edge. terminal(f) = the sink reached by following next (or -1 on a cycle). Sinks equal the stable faces S of
// poly-equilibria.mjs (checked in tipping-test.mjs). The graph alone does not see unstable vertices: a true mono-monostatic answer also needs U = 1 (poly-equilibria).
import {hull,centroid} from './hull.mjs';
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function tippingGraph(vertices,opt={}){ const policy=opt.policy||'steepest'; const tol=opt.tol||1e-9; let P=vertices.map(v=>v.slice()); let tri=hull(P); const c=opt.com||centroid(P,tri); P=P.map(p=>sub(p,c)); tri=hull(P);
  const faces=[]; for(const t of tri){ let f=faces.find(g=>dot(g.n,t.n)>1-1e-12&&Math.abs(g.d-t.d)<1e-9); if(!f){ f={n:t.n,d:t.d,tris:[]}; faces.push(f); } f.tris.push(t); }
  const dir=new Map(); faces.forEach((f,i)=>{ for(const t of f.tris) for(let k=0;k<3;k++) dir.set(t.v[k]+'_'+t.v[(k+1)%3],i); });
  for(const f of faces){ f.edges=[]; for(const t of f.tris) for(let k=0;k<3;k++){ const a=t.v[k],b=t.v[(k+1)%3]; const nb=dir.get(b+'_'+a); if(nb!==undefined&&faces[nb]!==f) f.edges.push({a,b,nb}); } // boundary edges only (neighbour in another face)
    const foot=[f.n[0]*f.d,f.n[1]*f.d,f.n[2]*f.d]; f.foot=foot; f.out=[]; for(const e of f.edges){ const A=P[e.a],B=P[e.b]; const dd=Math.sqrt(dot(sub(B,A),sub(B,A))); const s=dot(cross(sub(B,A),sub(foot,A)),f.n)/dd; if(s<-tol) f.out.push({nb:e.nb,dist:-s,a:e.a,b:e.b}); } }
  const next=faces.map((f,i)=>{ if(!f.out.length) return -1; let best=f.out[0]; for(const e of f.out){ if(policy==='worst'? e.dist>best.dist : faces[e.nb].d<faces[best.nb].d) best=e; } return best.nb; });
  const sinks=[]; faces.forEach((f,i)=>{ if(!f.out.length) sinks.push(i); });
  const terminal=faces.map((f,i)=>{ let cur=i,steps=0; while(next[cur]!==-1&&steps<=faces.length){ cur=next[cur]; steps++; } return next[cur]===-1?cur:-2; }); // -2 = cycle
  const cycles=terminal.filter(t=>t===-2).length; let nonDescending=0; faces.forEach((f,i)=>{ if(next[i]>=0&&faces[next[i]].d>=f.d-1e-12) nonDescending++; });
  return {faces,F:faces.length,next,sinks,terminal,cycles,nonDescending,com:c,heights:faces.map(f=>f.d)}; }
// fitness (lower is better; 0 = one sink, every face tips to it, no cycles): 10 per extra sink, plus the fraction of faces ending in a sink other than the lowest one, plus 5 per cyclic face
export function tippingFitness(g){ if(!g.sinks.length) return 1e3; let low=g.sinks[0]; for(const s of g.sinks) if(g.faces[s].d<g.faces[low].d) low=s; const other=g.terminal.filter(t=>t>=0&&t!==low).length; return 10*(g.sinks.length-1)+other/g.F+5*g.cycles/g.F; }
