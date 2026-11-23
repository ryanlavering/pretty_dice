// Round 17 (PD-218 controls): EXACT checker for an arbitrary convex polytope given by float64 planes N_i.x <= D_i (planes taken as the exact dyadic rationals; NOT normalised, NOT rounded).
//   node r17-exact.mjs body.json [--com origin|centroid|x,y,z] [--triples triples.json] [--out result.json]
//   body.json: {normals:[[..]..], offs:[..]}  (floats). Frame: --com origin (default: c = the data origin), centroid (exact rational volume centroid), or an explicit float triple (taken exactly).
// Vertices: every plane triple with nonzero det is solved exactly (BigInt rational) and kept iff all planes hold (exact), duplicates merged by exact value, so NON-SIMPLE vertices are handled by exact incidence.
//   (F<=40 default; for large F pass --triples (candidate triples from a float hull) -- still verified exactly, but then completeness of the vertex set is certified by closure checks only, see 'closure').
// Edges: plane pairs with >=2 common vertices; consecutive vertices along the line (exact ordering). Faces: polygons by edge walk. Then (all exact): Euler, c strictly inside, S (foot strictly inside every plane),
//   U (all neighbour edges descend), H (saddle edges), Poincare-Hopf, tipping graph over planes adjacent by an edge.
import fs from 'fs';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; const sg=x=>x>0n?1:x<0n?-1:0;
const gcd=(a,b)=>{ a=a<0n?-a:a; b=b<0n?-b:b; while(b){ [a,b]=[b,a%b]; } return a; };
// ---- float64 -> exact (mantissa, exponent)
const dv=new DataView(new ArrayBuffer(8));
function decomp(x){ if(x===0) return {m:0n,e:0}; dv.setFloat64(0,x); const hi=dv.getUint32(0), lo=dv.getUint32(4); const s=hi>>>31?-1n:1n; const ex=(hi>>>20)&0x7ff; let m=(BigInt(hi&0xfffff)<<32n)|BigInt(lo); let e; if(ex===0){ e=-1074; } else { m|=1n<<52n; e=ex-1075; } while(m!==0n&&(m&1n)===0n){ m>>=1n; e++; } return {m:s*m,e}; }
function toBigInts(arr){ const ds=arr.map(decomp); let emin=0; for(const d of ds) if(d.m!==0n&&d.e<emin) emin=d.e; return {ints:ds.map(d=>d.m===0n?0n:d.m<<BigInt(d.e-emin)),emin}; }
// ---- rationals
class Q{ constructor(n,d=1n){ if(d<0n){ n=-n; d=-d; } const g=gcd(n,d)||1n; this.n=n/g; this.d=d/g; } add(o){ return new Q(this.n*o.d+o.n*this.d,this.d*o.d); } sub(o){ return new Q(this.n*o.d-o.n*this.d,this.d*o.d); } mul(o){ return new Q(this.n*o.n,this.d*o.d); } div(o){ return new Q(this.n*o.d,this.d*o.n); } }
export function analyse(Nf,Df,opts={}){
  const F=Nf.length; const bn=toBigInts(Nf.flat()), bd=toBigInts(Df); const N=[]; for(let i=0;i<F;i++) N.push([bn.ints[3*i],bn.ints[3*i+1],bn.ints[3*i+2]]); let D=bd.ints; const out={F,scaleN:bn.emin,scaleD:bd.emin,maxBits:Math.max(...N.flat().map(x=>x.toString(2).length),...D.map(x=>x.toString(2).length))};
  // plane triples
  let triples=opts.triples; if(!triples){ triples=[]; for(let i=0;i<F;i++) for(let j=i+1;j<F;j++) for(let k=j+1;k<F;k++) triples.push([i,j,k]); }
  const vmap=new Map(), V=[]; let nonFeasible=0, singular=0;
  for(const [i,j,k] of triples){ const det=dot(N[i],cr(N[j],N[k])); if(det===0n){ singular++; continue; } const a=cr(N[j],N[k]),b=cr(N[k],N[i]),c=cr(N[i],N[j]); let X=[0,1,2].map(q=>D[i]*a[q]+D[j]*b[q]+D[k]*c[q]), den=det; if(den<0n){ X=X.map(x=>-x); den=-den; }
    const g=gcd(gcd(gcd(X[0],X[1]),X[2]),den)||1n; X=X.map(x=>x/g); den/=g; const key=X.join(',')+'/'+den; if(vmap.has(key)) continue;
    let ok=true; const inc=[]; for(let l=0;l<F;l++){ const e=sg(dot(N[l],X)-D[l]*den); if(e>0){ ok=false; break; } if(e===0) inc.push(l); } if(!ok){ nonFeasible++; continue; } vmap.set(key,V.length); V.push({X,den,inc}); }
  out.V=V.length; out.degreeHist={}; for(const v of V) out.degreeHist[v.inc.length]=(out.degreeHist[v.inc.length]||0)+1;
  // faces' vertex lists
  const fv=Array.from({length:F},()=>[]); V.forEach((v,t)=>v.inc.forEach(l=>fv[l].push(t)));
  out.facesWithFewerThan3Vertices=fv.filter(a=>a.length<3).length;
  // edges
  const ekey=(a,b)=>a<b?a+'_'+b:b+'_'+a; const edges=new Map();
  for(let i=0;i<F;i++) for(let j=i+1;j<F;j++){ const cm=fv[i].filter(t=>V[t].inc.includes(j)); if(cm.length<2) continue; const tdir=cr(N[i],N[j]); const pr=cm.map(t=>({t,p:dot(tdir,V[t].X),den:V[t].den})); pr.sort((x,y)=>{ const d=x.p*y.den-y.p*x.den; return d<0n?-1:d>0n?1:0; });
    for(let q=0;q+1<pr.length;q++){ const k=ekey(pr[q].t,pr[q+1].t); if(!edges.has(k)) edges.set(k,{a:pr[q].t,b:pr[q+1].t,planes:new Set()}); edges.get(k).planes.add(i).add(j); } }
  const E=[...edges.values()]; out.E=E.length; out.eulerOK=(V.length-E.length+F===2); out.edgesWithNot2Planes=E.filter(e=>e.planes.size!==2).length;
  const nb=Array.from({length:V.length},()=>[]); E.forEach((e,ei)=>{ nb[e.a].push([e.b,ei]); nb[e.b].push([e.a,ei]); });
  out.vertexDegreeMismatch=V.reduce((s,v,t)=>s+(nb[t].length!==v.inc.length?1:0),0); // a vertex on m planes has m edges (simple polytope-face structure)
  // closure: every plane's vertex polygon closed (each vertex has exactly 2 edges inside the plane)
  let badFace=0; for(let i=0;i<F;i++){ for(const t of fv[i]){ const cnt=nb[t].filter(([w])=>V[w].inc.includes(i)).length; if(cnt!==2) badFace++; } } out.badFaceIncidence=badFace;
  out.cInsideFrame=D.every(d=>d>0n);
  // ---- exact centroid (rational, in units where vertices are X/den)
  // order polygons by edge walk
  const poly=[]; for(let i=0;i<F;i++){ const vs=fv[i]; if(vs.length<3){ poly.push(vs); continue; } const seq=[vs[0]]; let prev=-1, cur=vs[0]; for(let s=0;s<vs.length-1;s++){ const nx=nb[cur].map(([w])=>w).filter(w=>w!==prev&&V[w].inc.includes(i)); const w=nx[0]; if(w===undefined) break; seq.push(w); prev=cur; cur=w; } 
    // orientation: outward CCW  => (p1-p0)x(p2-p0).N_i > 0
    const P=seq.map(t=>V[t]); const sub=(u,v)=>[u.X[0]*v.den-v.X[0]*u.den,u.X[1]*v.den-v.X[1]*u.den,u.X[2]*v.den-v.X[2]*u.den]; const d1=sub(P[1],P[0]), d2=sub(P[2],P[0]); if(sg(dot(cr(d1,d2),N[i]))<0) seq.reverse(); poly.push(seq); }
  const toQ=(v)=>[new Q(v.X[0],v.den),new Q(v.X[1],v.den),new Q(v.X[2],v.den)]; const P0=toQ(V[0]); let vol=new Q(0n), cs=[new Q(0n),new Q(0n),new Q(0n)];
  const qs=(a,b)=>a.map((x,i)=>x.sub(b[i])); const qdot=(a,b)=>a[0].mul(b[0]).add(a[1].mul(b[1])).add(a[2].mul(b[2])); const qcr=(a,b)=>[a[1].mul(b[2]).sub(a[2].mul(b[1])),a[2].mul(b[0]).sub(a[0].mul(b[2])),a[0].mul(b[1]).sub(a[1].mul(b[0]))];
  for(const seq of poly){ if(seq.length<3) continue; const p0=qs(toQ(V[seq[0]]),P0); for(let k=1;k+1<seq.length;k++){ const a=qs(toQ(V[seq[k]]),P0), b=qs(toQ(V[seq[k+1]]),P0); const v6=qdot(p0,qcr(a,b)); vol=vol.add(v6); const s=[0,1,2].map(q=>p0[q].add(a[q]).add(b[q])); // tetra centroid (0+p0+a+b)/4, weight v6
      cs=cs.map((c,q)=>c.add(v6.mul(s[q]))); } }
  const cx=cs.map((c,q)=>c.div(vol).mul(new Q(1n,4n)).add(P0[q])); // exact centroid in vertex units
  out.centroidFloat=cx.map(q=>Number(q.n*10n**30n/q.d)/1e30);
  // ---- frame
  const com=opts.com||'origin'; let cn,cd; if(com==='centroid'){ cd=cx[0].d*cx[1].d*cx[2].d; cn=cx.map(q=>q.n*(cd/q.d)); } else if(com==='origin'){ cd=1n; cn=[0n,0n,0n]; } else { // explicit floats in plane units: need same units as vertices: vertex units are x*2^(bd.emin-bn.emin) ... use exact dyadic with that unit
    const u=bd.emin-bn.emin; const cf=toBigInts(com); let sc=cf.emin-u; // c_units = c * 2^-(u)  where unit scale = 2^(bd.emin-bn.emin) means value*2^(-u)
    cd=1n<<BigInt(Math.max(0,-sc)); cn=cf.ints.map(x=>x*(sc>0?1n<<BigInt(sc):1n)); }
  out.comMode=com; out.centroidMinusComFloat=cx.map((q,i)=>Number((q.n*cd-cn[i]*q.d)*10n**30n/(q.d*cd))/1e30);
  // shift: x'' = cd x - cn  (vertex num X cd - cn den, den same), planes D'' = D cd - N.cn
  const X2=V.map(v=>({X:v.X.map((x,q)=>x*cd-cn[q]*v.den),den:v.den,inc:v.inc})); D=D.map((d,i)=>d*cd-dot(N[i],cn)); out.cStrictlyInside=D.every(d=>d>0n); out.minOffsetSign=D.some(d=>d<=0n)?'c on/outside a plane':'ok';
  // ---- classification (all exact), frame c = origin
  const NN=N.map(a=>dot(a,a)); const stable=[]; let degS=0; const viol=Array.from({length:F},()=>0);
  for(let i=0;i<F;i++){ let ok=true; for(let k=0;k<F;k++){ if(k===i) continue; const e=D[i]*dot(N[i],N[k])-D[k]*NN[i]; if(e>0n){ ok=false; } else if(e===0n){ ok=false; degS++; } } if(ok) stable.push(i); } out.S=stable.length; out.stable=stable; out.degS=degS;
  const asc=(v,w)=>{ const num=dot(X2[w].X,X2[v].X)*X2[v].den-dot(X2[v].X,X2[v].X)*X2[w].den; return sg(num)*sg(X2[w].den); }; // sign of (xw-xv).xv * den_w den_v^2
  const peaks=[]; let degU=0; for(let v=0;v<V.length;v++){ let all=true,zero=false; for(const [w] of nb[v]){ const a=asc(v,w); if(a>0) all=false; if(a===0) zero=true; } if(all){ if(zero) degU++; else peaks.push(v); } }
  out.U=peaks.length; out.peaks=peaks.map(v=>({v,planes:V[v].inc})); out.degU=degU;
  const saddles=[]; let degH=0; E.forEach(e=>{ if(e.planes.size!==2) return; const [i,j]=[...e.planes]; if(!(asc(e.a,e.b)<0&&asc(e.b,e.a)<0)) return; const g=dot(N[i],N[j]); const ai=D[i]*NN[j]-D[j]*g, aj=D[j]*NN[i]-D[i]*g; if(ai>0n&&aj>0n) saddles.push({planes:[i,j],v:[e.a,e.b]}); else if(ai===0n||aj===0n) degH++; });
  out.H=saddles.length; out.saddles=saddles; out.degH=degH; out.PH=out.S+out.U-out.H;
  // tipping graph over planes adjacent by an edge
  const adj=Array.from({length:F},()=>new Set()); for(const e of E){ if(e.planes.size!==2) continue; const [i,j]=[...e.planes]; adj[i].add(j); adj[j].add(i); }
  let notLower=0,noTip=0; const next=new Array(F).fill(-1); for(let i=0;i<F;i++){ let best=-1; for(const k of adj[i]){ if(D[i]*dot(N[i],N[k])-D[k]*NN[i]>0n){ if(!(D[k]*D[k]*NN[i]<D[i]*D[i]*NN[k])) notLower++; if(best<0||D[k]*D[k]*NN[best]<D[best]*D[best]*NN[k]) best=k; } } next[i]=best; if(best<0&&!stable.includes(i)) noTip++; }
  const sink=new Array(F).fill(-1); for(let i=0;i<F;i++){ let x=i,g=0; while(next[x]>=0&&g++<F+2) x=next[x]; sink[i]=x; } out.tip={notLower,noAdjacentTipNonStable:noTip,sinks:[...new Set(sink)].length};
  out.counts={triplesTried:triples.length,singular,nonFeasible}; out.convexCert=out.eulerOK&&out.edgesWithNot2Planes===0&&badFace===0&&out.facesWithFewerThan3Vertices===0&&out.cStrictlyInside;
  out.vf=X2.map(v=>v.X.map(x=>Number((x*10n**30n)/v.den)/1e30)); return out; }
if(process.argv[1]&&process.argv[1].endsWith('r17-exact.mjs')){ const a=process.argv.slice(2); const J=JSON.parse(fs.readFileSync(a[0],'utf8')); const get=k=>{ const i=a.indexOf(k); return i>=0?a[i+1]:null; };
  let com=get('--com')||'origin'; if(com.includes(',')) com=com.split(',').map(Number); const trip=get('--triples')?JSON.parse(fs.readFileSync(get('--triples'),'utf8')):undefined;
  const o=analyse(J.normals||J.n,J.offs||J.H,{com,triples:trip}); const rm={...o}; delete rm.vf; delete rm.saddles; console.log(JSON.stringify({...rm,saddles:o.saddles})); if(get('--out')) fs.writeFileSync(get('--out'),JSON.stringify(o)); }
