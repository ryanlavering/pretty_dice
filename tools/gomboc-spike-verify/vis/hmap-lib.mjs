// Shared helpers: persistence-filtered critical points of a function h on an icosphere (float).
import {morse} from '../verify.mjs'; import {persistence} from '../persistence.mjs';
export function edgesOf(T,n){ const seen=new Set(), E=[]; for(const [x,y,z] of T) for(const [p,q] of [[x,y],[y,z],[z,x]]){ const k=p<q?p*n+q:q*n+p; if(!seen.has(k)){ seen.add(k); E.push([p,q,-1e9]); } } return E; }
export function neighbours(T,n){ const nb=Array.from({length:n},()=>new Set()); for(const [a,b,c] of T){ nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); } return nb.map(s=>[...s]); }
// returns {min,max,saddle (vertex indices), raw:{min,max,saddle counts}}; persistent = persistence >= thr (the global extremum always kept)
export function criticalPersistent(ico,h,thr){ const n=ico.V.length; const E=edgesOf(ico.T,n); const m=morse(h,ico.V,ico.T);
  const pm=persistence(n,h,E), hn=Float64Array.from(h,x=>-x), pM=persistence(n,hn,E);
  const keepMin=new Set(m.list.min.filter(i=>!pm.pairs.some(p=>p.node===i&&p.pers<thr))), keepMax=new Set(m.list.max.filter(i=>!pM.pairs.some(p=>p.node===i&&p.pers<thr)));
  // saddles: each persistent pair dies at a saddle level; match to the unassigned discrete saddle with the nearest h
  const sad=m.list.saddle.slice(), used=new Set(), saddles=[]; const take=lvl=>{ let b=-1,bd=1e9; for(const s of sad){ if(used.has(s)) continue; const d=Math.abs(h[s]-lvl); if(d<bd){ bd=d; b=s; } } if(b>=0){ used.add(b); saddles.push(b); } };
  for(const p of pm.pairs) if(p.pers>=thr) take(p.death); for(const p of pM.pairs) if(p.pers>=thr) take(-p.death);
  return {min:[...keepMin],max:[...keepMax],saddle:saddles,raw:m.cnt}; }
