// Round 16 exact checker for a SIMPLE polytope given by planes N_i.x <= D_i (c = origin, weighted body at its CoM c).
// node r16-exact.mjs body.json [out.json]   body.json: {n:[[..]], H:[..], tri:[[i,j,k]..] (optional, else computed by python)}  planes are rounded to 2^-40 grid:
//   N_i = round(n_i*2^40) (BigInt, NOT unit), D_i = round(H_i*2^40). Everything below is exact BigInt (rational vertices as numerator/denominator).
// Certificate: every vertex (3 planes) strictly below every other plane; every vertex has 3 neighbours (triples sharing two planes) -> the listed vertex set is the full vertex set (closed under adjacency);
//   D_i>0 (c strictly inside). Then S (foot inside), U (all 3 edges descend), H (saddle edges), tipping graph exact.
import fs from 'fs';
const SC=2**40;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sg=x=>x>0n?1:x<0n?-1:0;
export function check(Nf,Hf,tri){
  const F=Nf.length; const N=Nf.map(r=>r.map(x=>BigInt(Math.round(x*SC)))), D=Hf.map(x=>BigInt(Math.round(x*SC)));
  const out={F}; out.cInside=D.every(d=>d>0n);
  // vertices
  const X=[],den=[]; let degVert=0;
  for(const [i,j,k] of tri){ const det=dot(N[i],cr(N[j],N[k])); if(det===0n){ degVert++; X.push([0n,0n,0n]); den.push(0n); continue; }
    // solve [Ni;Nj;Nk] v = [Di;Dj;Dk]: v = (D_i (Nj x Nk) + D_j (Nk x Ni) + D_k (Ni x Nj)) / det
    const a=cr(N[j],N[k]),b=cr(N[k],N[i]),c=cr(N[i],N[j]); X.push([0,1,2].map(q=>D[i]*a[q]+D[j]*b[q]+D[k]*c[q])); den.push(det); }
  const V=tri.length; out.V=V; out.degenerateVertices=degVert;
  // strict convexity: every other plane strictly above the vertex:  N_l.X/den < D_l
  let viol=0,flat=0; for(let t=0;t<V;t++){ const s=sg(den[t]); for(let l=0;l<F;l++){ if(tri[t].includes(l)) continue; const e=sg(dot(N[l],X[t])-D[l]*den[t])*s; if(e>0) viol++; else if(e===0) flat++; } }
  out.violations=viol; out.flatContacts=flat;
  // adjacency closure
  const ed=new Map(); tri.forEach((t,ti)=>{ for(const [a,b] of [[t[0],t[1]],[t[0],t[2]],[t[1],t[2]]]){ const k=a*F+b; if(!ed.has(k)) ed.set(k,[]); ed.get(k).push(ti);} });
  let badEdges=0; for(const v of ed.values()) if(v.length!==2) badEdges++; out.badEdges=badEdges; out.eulerOK=(V-ed.size+F===2); out.E=ed.size;
  const nb=Array.from({length:V},()=>[]); for(const [k,v] of ed){ if(v.length===2){ nb[v[0]].push([v[1],Math.floor(k/F),k%F]); nb[v[1]].push([v[0],Math.floor(k/F),k%F]); } }
  out.faceCountOK=tri.flat().every((x,_,a)=>true) && new Set(tri.flat()).size===F;
  out.convexCert=out.cInside&&viol===0&&flat===0&&badEdges===0&&out.eulerOK&&degVert===0&&out.faceCountOK&&nb.every(a=>a.length===3);
  // stable faces: foot D_i N_i/|N_i|^2 strictly inside all planes: D_i (N_i.N_k) < D_k |N_i|^2
  const NN=N.map(a=>dot(a,a)); const stable=[],tip=[]; let degS=0; const viol_i=Array.from({length:F},()=>[]);
  for(let i=0;i<F;i++){ let ok=true; for(let k=0;k<F;k++){ if(k===i) continue; const e=D[i]*dot(N[i],N[k])-D[k]*NN[i]; if(e>0n){ ok=false; viol_i[i].push(k); } else if(e===0n){ ok=false; degS++; } } if(ok) stable.push(i); }
  out.S=stable.length; out.stable=stable; out.degS=degS;
  // peaks: v is peak iff for every neighbour w: (w-v).v < 0 ; (w-v).v = [ (Xw.Xv) dv - (Xv.Xv) dw ] / (dw dv^2)
  const peaks=[]; let degU=0; const asc=(v,w)=>{ const num=dot(X[w],X[v])*den[v]-dot(X[v],X[v])*den[w]; return sg(num)*sg(den[w]); };
  for(let v=0;v<V;v++){ let all=true, zero=false; for(const [w] of nb[v]){ const a=asc(v,w); if(a>0) all=false; if(a===0) zero=true; } if(all){ if(zero) degU++; else peaks.push(v); } }
  out.U=peaks.length; out.peaks=peaks; out.degU=degU;
  // saddles: edge (v,w) with faces i,j: interior foot iff both ends descend toward each other; saddle iff a_i>0,a_j>0 (Gram solve)
  const saddles=[]; let degH=0; for(const [k,ts] of ed){ if(ts.length!==2) continue; const i=Math.floor(k/F), j=k%F, [v,w]=ts; if(!(asc(v,w)<0&&asc(w,v)<0)) continue;
    const g=dot(N[i],N[j]); const det=NN[i]*NN[j]-g*g; const ai=D[i]*NN[j]-D[j]*g, aj=D[j]*NN[i]-D[i]*g; if(sg(ai)>0&&sg(aj)>0) saddles.push([i,j]); else if(ai===0n||aj===0n) degH++; }
  out.H=saddles.length; out.saddles=saddles; out.degH=degH; out.PH=out.S+out.U-out.H;
  // tipping graph over ADJACENT faces: violating adjacent k must be strictly lower (D_k^2 |N_i|^2 < D_i^2 |N_k|^2)
  const adjF=Array.from({length:F},()=>new Set()); for(const [k] of ed){ const i=Math.floor(k/F), j=k%F; adjF[i].add(j); adjF[j].add(i); }
  let notLower=0, noTip=0; const next=new Array(F).fill(-1);
  for(let i=0;i<F;i++){ let best=-1; for(const k of adjF[i]){ if(D[i]*dot(N[i],N[k])-D[k]*NN[i]>0n){ if(!(D[k]*D[k]*NN[i]<D[i]*D[i]*NN[k])) notLower++; if(best<0||D[k]*D[k]*NN[best]<D[best]*D[best]*NN[k]) best=k; } } next[i]=best; if(best<0&&!stable.includes(i)) noTip++; }
  const sink=new Array(F).fill(-1); for(let i=0;i<F;i++){ let x=i,g=0; while(next[x]>=0&&g++<F+2) x=next[x]; sink[i]=x; }
  out.tip={notLower,noAdjacentTipNonStable:noTip,sinks:[...new Set(sink)].length};
  out.pass=out.convexCert&&out.S===1&&out.U===1&&out.H===0&&out.PH===2&&out.degS===0&&out.degU===0&&out.degH===0&&notLower===0&&out.tip.sinks===1;
  // float geometry from the exact vertices
  const Vf=X.map((x,t)=>x.map(q=>Number((q<<60n)/den[t])/2**60/SC)); out.vf=Vf; return out; }
if (process.argv[1].endsWith('r16-exact.mjs')){
  const J=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const tri=J.tri; const o=check(J.n,J.H,tri); const rm={...o}; delete rm.vf;
  console.log(JSON.stringify(rm)); if(process.argv[3]) fs.writeFileSync(process.argv[3],JSON.stringify(o)); }
