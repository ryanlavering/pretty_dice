// Round 18 shared: pairs (elder rule), valley-fill / collapse candidate generators, exact evaluation (r14-lib evalPI: hull + certificate + exact S,U,H at the exact centroid).
import {evalPI,fromF,sub,dot,cr,norm} from './r14-lib.mjs';
export const aspectOf=e=>{ const c=e.c; let rm=0; for(const p of e.P) rm=Math.max(rm,norm(sub(p,c))); let hm=1e9; e.mg.forEach(m=>{hm=Math.min(hm,Math.abs(m.h));}); return rm/hm; };
export const stat=e=>({S:e.r.S,U:e.r.U,H:e.r.H,F:e.T.length,V:e.PI.length});
export function nbrs(e){ const nb=Array.from({length:e.PI.length},()=>new Set()); e.T.forEach(([a,b,c])=>{[[a,b],[b,c],[a,c]].forEach(([x,y])=>{nb[x].add(y);nb[y].add(x);});}); return nb; }
// steepest ascent (edge slope away from c) from vertex v to a peak
export function ascend(e,nb,v){ const c=e.c; const path=[v]; for(let it=0;it<60;it++){ const rv=sub(e.P[v],c); const nr=norm(rv); let best=-1,bs=1e-12; for(const w of nb[v]){ const d=sub(e.P[w],e.P[v]); const s=dot(d,rv)/(norm(d)*nr); if(s>bs){bs=s;best=w;} } if(best<0) break; v=best; path.push(v); } return path; }
// pairs: one per saddle edge and ascending endpoint; elder rule: the lower peak is cancelled
export function pairs(e){ const nb=nbrs(e),c=e.c; const out=[]; for(const [a,b] of e.r.saddles){ const A=e.P[a],B=e.P[b]; const ed=sub(B,A); const t=dot(sub(c,A),ed)/dot(ed,ed); const f=A.map((x,k)=>x+t*ed[k]); const hs=norm(sub(f,c));
  const pa=ascend(e,nb,a),pb=ascend(e,nb,b); const peaks=[pa[pa.length-1],pb[pb.length-1]]; const rr=peaks.map(p=>norm(sub(e.P[p],c)));
  const lo=rr[0]<=rr[1]?0:1; const chain=lo===0?pa:pb; out.push({chain,edge:[a,b],t,foot:f,hs,peaks,rpk:rr,low:peaks[lo],lowR:rr[lo],barrier:rr[lo]-hs,barrierHi:Math.max(...rr)-hs,sameChain:peaks[0]===peaks[1],hsFrac:hs/e.rbar}); } return out; }
const unit=(c,p)=>{ const d=sub(p,c); const n=norm(d); return d.map(x=>x/n); };
// valley-fill candidates for one pair at raise delta (absolute, same units as P)
export function fillPts(e,pr,delta,mode){ const c=e.c,[a,b]=pr.edge,A=e.P[a],B=e.P[b]; const up=(p,d)=>{ const u=unit(c,p); return p.map((x,k)=>x+d*u[k]); };
  const foot=pr.foot; if(mode==='foot') return {add:[up(foot,delta)],move:{}};
  if(mode==='ends') return {add:[],move:{[a]:up(A,delta),[b]:up(B,delta)}};
  if(mode==='footends') return {add:[up(foot,delta)],move:{[a]:up(A,delta),[b]:up(B,delta)}};
  if(mode==='cap3'){ const pts=[0.25,0.5,0.75].map(t=>up(A.map((x,k)=>x+t*(B[k]-x)),delta)); return {add:pts,move:{}}; }
  if(mode==='footPk'){ // foot raised plus a second vertex pulled toward the lower peak (ridge ramp): midpoint of foot and lower peak raised by half
    const P=e.P[pr.low]; const mid=foot.map((x,k)=>(x+P[k])/2); return {add:[up(foot,delta),up(mid,delta/2)],move:{}}; }
  if(mode.startsWith('ramp')){ const K=+mode.slice(4); const Pp=e.P[pr.low]; const rp=pr.lowR, r0=pr.hs; const add=[]; for(let k=0;k<=K;k++){ const t=k/(K+1); const q=foot.map((x,j)=>x+t*(Pp[j]-x)); const rad=r0+delta+t*(rp-r0-delta)*0.98; const u=unit(c,q); const rq=norm(sub(q,c)); add.push(c.map((x,j)=>x+u[j]*Math.max(rad,rq))); } return {add,move:{}}; }
  if(mode==='chain'){ const mv={}; const rp=pr.lowR; for(const v of pr.chain.slice(0,-1)){ const rv=norm(sub(e.P[v],c)); mv[v]=up(e.P[v],Math.max(0,delta*(rp-rv)/Math.max(pr.barrier,1e-9)*0.5)); } return {add:[],move:mv}; }
  throw new Error(mode); }
export function applyMove(e,m){ let PI=e.PI.map((p,i)=>m.move[i]?fromF([m.move[i]])[0]:p); if(m.add.length) PI=[...PI,...fromF(m.add)]; return evalPI(PI); }
export const key=e=>e.PI.map(p=>p.join(',')).join(';');
export const peakSet=e=>new Set(e.r.peaks.map(i=>e.PI[i].join(',')));
