// Experimental d1mono bodies (v42-gomboc-die): homogeneous convex mono-stable bodies from the built-in 172-triangle gomboc or a named candidate set ('lp', embedded from the low-poly farm).
// Grammar (the face-block grammar of PD-167, same shape): d1mono            the built-in 172-triangle body
//   d1mono{lp#4}       every die of the term is candidate 4 of set lp (0-based line index)
//   d1mono{lp#4!ordered}  the dice of the term are candidates 4, 5, 6 ... (invalid ones skipped)
//   d1mono{lp}         each die a pseudo-random valid candidate (stable for the same formula);  d1mono{lp!ordered} = from #0
import * as THREE from 'three';
import { GOMBOC172_TRIS, GOMBOC172_VERTS } from './gomboc172.js';
import { LP_SET_JSON, LP_SET_STAMP } from './lowpoly-set.js';

const SETS={ lp:{ label:'lowpoly farm', stamp:LP_SET_STAMP, json:LP_SET_JSON, rows:null } };
const rowsOf=name=>{ const s=SETS[name]; if(!s) return null; if(!s.rows) s.rows=JSON.parse(s.json); return s.rows; };
export const monoSetNames=()=>Object.keys(SETS);
const validIdx=name=>{ const r=rowsOf(name); return r?r.map((x,i)=>x.S===1?i:-1).filter(i=>i>=0):[]; };
const ranges=a=>{ const o=[]; for(let i=0;i<a.length;){ let j=i; while(j+1<a.length&&a[j+1]===a[j]+1) j++; o.push(j>i?a[i]+'-'+a[j]:''+a[i]); i=j+1; } return o.join(', '); };

/* The body of a d1mono term: "lp#4!ordered" -> {set,index,ordered} or {error}. */
export function parseMonoBlock(body){
  const m=/^([a-z0-9]+)(?:#(\d+))?(!ordered)?$/.exec(body);
  if(!m) return {error:`Can't read the d1mono block "{${body}}"; write {lp#4}, {lp#4!ordered} or {lp}`};
  const set=m[1], rows=rowsOf(set); if(!rows) return {error:`No d1mono set "${set}" (sets: ${monoSetNames().join(', ')})`};
  const index=m[2]===undefined?null:+m[2], ordered=!!m[3], valid=validIdx(set);
  if(index!==null&&index>=rows.length) return {error:`${set}#${index} is past the end of the set (0-${rows.length-1})`};
  if(index!==null&&rows[index].S!==1) return {error:`${set}#${index} has S=${rows[index].S} stable faces, so it is not a d1; valid indices: ${ranges(valid)}`};
  return {mono:{set,index,ordered}};
}
export const fmtMono=m=>m&&m.set?'{'+m.set+(m.index!==null?'#'+m.index:'')+(m.ordered?'!ordered':'')+'}':'';
/* The candidate index of each die c of a term: explicit index for all dice; !ordered runs on from the index (or 0); no index and not ordered: a stable pseudo-random valid pick. */
export function monoPicks(mono,count,seedKey=''){
  if(!mono||!mono.set) return Array.from({length:count},()=>null);
  const valid=validIdx(mono.set); if(!valid.length) return Array.from({length:count},()=>null);
  if(mono.ordered){ const at=Math.max(0,valid.findIndex(i=>i>=(mono.index||0))); return Array.from({length:count},(_,c)=>valid[(at+c)%valid.length]); }
  if(mono.index!==null) return Array.from({length:count},()=>mono.index);
  return Array.from({length:count},(_,c)=>{ let h=2166136261>>>0; for(const ch of `mono|${mono.set}|${c}|${seedKey}`){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619)>>>0; } return valid[h%valid.length]; });
}
export const monoFarmId=(set,index)=>{ const r=rowsOf(set); return r&&r[index]?r[index].id:null; };

const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
/* Vertices + triangles -> a die body: centred on the volume centroid (the centre of mass of the homogeneous body), unit circumradius, the stable face(s) found by the foot-of-perpendicular test,
   the apex (the vertex furthest from the plane of S), and one label per triangle (1 on S, 0 elsewhere). {error} unless exactly one stable face. */
export function bodyFrom(P,T){
  const m=P.reduce((a,p)=>[a[0]+p[0]/P.length,a[1]+p[1]/P.length,a[2]+p[2]/P.length],[0,0,0]); let V=0; const C=[0,0,0];
  for(const [a,b,c] of T){ const A=sub(P[a],m),B=sub(P[b],m),D=sub(P[c],m), v=Math.abs(dot(A,cr(B,D)))/6; V+=v; for(let k=0;k<3;k++) C[k]+=v*(A[k]+B[k]+D[k])/4; }
  const com=[m[0]+C[0]/V,m[1]+C[1]/V,m[2]+C[2]/V], Q=P.map(p=>sub(p,com)), R=Math.max(...Q.map(q=>Math.hypot(...q))), N=Q.map(q=>q.map(x=>x/R)), st=[];
  T.forEach(([a,b,c],i)=>{ let n=cr(sub(N[b],N[a]),sub(N[c],N[a])); const l=Math.hypot(...n); n=n.map(x=>x/l); let d=dot(n,N[a]); if(d<0){ n=n.map(x=>-x); d=-d; }
    const f=n.map(x=>x*d), s=(p,q)=>dot(cr(sub(q,p),sub(f,p)),n), ins=[[a,b],[b,c],[c,a]].map(([p,q])=>s(N[p],N[q])); if(ins.every(x=>x>=-1e-12)||ins.every(x=>x<=1e-12)) st.push({i,n}); });
  if(st.length!==1) return {error:`${st.length} stable faces (a d1 needs exactly 1)`};
  const S=st[0].n, apex=N.map((q,i)=>[-dot(q,S),i]).sort((a,b)=>b[0]-a[0])[0][1];
  return {verts:N,tris:T,stable:S,apex:N[apex],sIdx:st[0].i,labels:T.map((_,i)=>i===st[0].i?1:0)};
}
const cache=new Map();
/* set null/'g172' = the built-in body; else the candidate row. Returns {key,name,verts(),tris,apex,labels,farmId,S,U} or {error}. */
export function monoBody(set,index){
  const key=set?set+'#'+index:'g172'; if(cache.has(key)) return cache.get(key);
  let P,T,farm=null,meta={};
  if(!set){ P=GOMBOC172_VERTS; T=GOMBOC172_TRIS; }
  else { const r=rowsOf(set)&&rowsOf(set)[index]; if(!r) return {error:`No ${set}#${index}`}; P=[]; for(let k=0;k<r.v.length;k+=3) P.push([r.v[k]/1e6,r.v[k+1]/1e6,r.v[k+2]/1e6]); T=[]; for(let k=0;k<r.t.length;k+=3) T.push([r.t[k],r.t[k+1],r.t[k+2]]); farm=r.id; meta={S:r.S,U:r.U}; }
  const b=bodyFrom(P,T); if(b.error){ const e={error:`${key}: ${b.error}`}; cache.set(key,e); return e; }
  const body={key,farmId:farm,...meta,verts:()=>b.verts.map(p=>new THREE.Vector3(...p)),tris:b.tris,apex:b.apex,labels:b.labels,sIdx:b.sIdx,faces:T.length};
  cache.set(key,body); return body;
}
