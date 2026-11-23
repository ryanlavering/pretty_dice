// Round 13: incremental S optimiser on a FIXED-topology triangle mesh (O(local) move, float cost, exact BigInt confirm elsewhere).
//   node r13-inc.mjs seed.json level seconds rngSeed outPrefix [T0] [T1]
// Mesh: vertices P (CoM-centred at start), triangles T (outward CCW), subdivided `level` times by midpoints (flat sub-triangles). Move = displace ONE vertex; accept only if every edge of the
// incident triangles stays locally convex (n_t.(opp-a) <= tol, coplanar allowed) and r_max <= ASP*h_min. Incremental state: per-triangle unit normal/offset/volume; running volume sum V6 and moment M (CoM);
// per-triangle foot margin m_f (signed in-plane distance of the CoM foot to the nearest edge line, >0 inside) cached with the cumulative CoM path length L_f at its computation: since the foot moves by at most |dC|,
// the stable/unstable sign of face f is certain while |m_f| > L - L_f, so only incident and "stale" faces are recomputed. Per move cost = O(deg) + a linear scan of F floats (about 5 ns per face).
// Cost = sum over stable faces except the lowest stable one of (1 + 0.5 min(m/mref,1)) + wn * sum over unstable faces with -delta<m<0 of (1+m/delta)  [smooth pressure from near-stable faces]. S=1 -> cost ~ wn*(near)
import fs from 'fs';
const [seedF,LEV,SECS,RS,OUT,T0a,T1a]=process.argv.slice(2); const ASP=+(process.env.ASP||3), WN=+(process.env.WN||0.02), CONVTOL=+(process.env.CONVTOL||-1e-10);
let s=(+RS)>>>0; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; const gauss=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
const J=JSON.parse(fs.readFileSync(seedF,'utf8')); let Pa=J.P.map(p=>p.slice()), Ta=J.T.map(t=>t.slice());
function subdiv(P,T){ const m=new Map(), nt=[]; const mid=(a,b)=>{ const k=a<b?a*1e7+b:b*1e7+a; if(m.has(k)) return m.get(k); P.push([(P[a][0]+P[b][0])/2,(P[a][1]+P[b][1])/2,(P[a][2]+P[b][2])/2]); m.set(k,P.length-1); return P.length-1; };
  for(const [a,b,c] of T){ const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a); nt.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]); } return nt; }
for(let l=0;l<+LEV;l++) Ta=subdiv(Pa,Ta);
export class Mesh{
 constructor(P,T){ const V=P.length,F=T.length; this.V=V; this.F=F; this.P=new Float64Array(3*V); P.forEach((p,i)=>{ this.P[3*i]=p[0]; this.P[3*i+1]=p[1]; this.P[3*i+2]=p[2]; }); this.T=new Int32Array(3*F); T.forEach((t,i)=>{ this.T[3*i]=t[0]; this.T[3*i+1]=t[1]; this.T[3*i+2]=t[2]; });
  const dir=new Map(); for(let t=0;t<F;t++) for(let k=0;k<3;k++) dir.set(this.T[3*t+k]*V+this.T[3*t+(k+1)%3],t);
  this.opp=new Int32Array(3*F); // opposite vertex across edge k of t
  for(let t=0;t<F;t++) for(let k=0;k<3;k++){ const a=this.T[3*t+k],b=this.T[3*t+(k+1)%3]; const u=dir.get(b*V+a); if(u===undefined) throw new Error('open mesh'); let o=-1; for(let q=0;q<3;q++){ const w=this.T[3*u+q]; if(w!==a&&w!==b) o=w; } this.opp[3*t+k]=o; }
  const cnt=new Int32Array(V+1); for(let t=0;t<F;t++) for(let k=0;k<3;k++) cnt[this.T[3*t+k]+1]++; for(let i=0;i<V;i++) cnt[i+1]+=cnt[i]; this.ioff=cnt; this.inc=new Int32Array(3*F); const pos=cnt.slice(0,V); for(let t=0;t<F;t++) for(let k=0;k<3;k++) this.inc[pos[this.T[3*t+k]]++]=t;
  this.nx=new Float64Array(F); this.ny=new Float64Array(F); this.nz=new Float64Array(F); this.dd=new Float64Array(F); this.vol=new Float64Array(F); this.m=new Float64Array(F); this.Lf=new Float64Array(F);
  this.V6=0; this.M=[0,0,0]; this.C=[0,0,0]; this.L=0; this.full(); }
 geom(t){ const P=this.P,T=this.T,a=3*T[3*t],b=3*T[3*t+1],c=3*T[3*t+2]; const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];
  let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx; const l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1e-300; nx/=l; ny/=l; nz/=l; this.nx[t]=nx; this.ny[t]=ny; this.nz[t]=nz; this.dd[t]=nx*P[a]+ny*P[a+1]+nz*P[a+2];
  const bx=P[b],by=P[b+1],bz=P[b+2],cx=P[c],cy=P[c+1],cz=P[c+2]; this.vol[t]=P[a]*(by*cz-bz*cy)-P[a+1]*(bx*cz-bz*cx)+P[a+2]*(bx*cy-by*cx); }
 contrib(t,sg){ const P=this.P,T=this.T,a=3*T[3*t],b=3*T[3*t+1],c=3*T[3*t+2]; const v=this.vol[t]*sg; this.V6+=v; this.M[0]+=v*(P[a]+P[b]+P[c]); this.M[1]+=v*(P[a+1]+P[b+1]+P[c+1]); this.M[2]+=v*(P[a+2]+P[b+2]+P[c+2]); }
 setC(){ const d=4*this.V6; const n0=this.C[0],n1=this.C[1],n2=this.C[2]; this.C[0]=this.M[0]/d; this.C[1]=this.M[1]/d; this.C[2]=this.M[2]/d; return Math.hypot(this.C[0]-n0,this.C[1]-n1,this.C[2]-n2); }
 full(){ this.V6=0; this.M=[0,0,0]; for(let t=0;t<this.F;t++){ this.geom(t); this.contrib(t,1); } this.setC(); for(let t=0;t<this.F;t++){ this.margin(t); } }
 margin(t){ const P=this.P,T=this.T,C=this.C; const nx=this.nx[t],ny=this.ny[t],nz=this.nz[t]; const h=this.dd[t]-nx*C[0]-ny*C[1]-nz*C[2]; const fx=C[0]+h*nx,fy=C[1]+h*ny,fz=C[2]+h*nz; let m=1e9;
  for(let k=0;k<3;k++){ const a=3*T[3*t+k],b=3*T[3*t+(k+1)%3]; const ex=P[b]-P[a],ey=P[b+1]-P[a+1],ez=P[b+2]-P[a+2]; const wx=fx-P[a],wy=fy-P[a+1],wz=fz-P[a+2]; const sx=ey*wz-ez*wy, sy=ez*wx-ex*wz, sz=ex*wy-ey*wx; const d=(sx*nx+sy*ny+sz*nz)/Math.sqrt(ex*ex+ey*ey+ez*ez); if(d<m) m=d; }
  this.m[t]=m; this.Lf[t]=this.L; return m; }
 convexAround(v){ const P=this.P,T=this.T,o=this.opp; for(let q=this.ioff[v];q<this.ioff[v+1];q++){ const t=this.inc[q]; for(let k=0;k<3;k++){ const a=3*T[3*t+k], d=3*o[3*t+k]; if(this.nx[t]*(P[d]-P[a])+this.ny[t]*(P[d+1]-P[a+1])+this.nz[t]*(P[d+2]-P[a+2])>CONVTOL) return false; } } return true; }
 // scan: returns {S,cost,hmin,low}
 scan(mref,delta){ const F=this.F,C=this.C,nx=this.nx,ny=this.ny,nz=this.nz,dd=this.dd,m=this.m,Lf=this.Lf,L=this.L; let S=0,sum=0,hmin=1e9,lowH=1e9,lowPen=0,near=0;
  for(let f=0;f<F;f++){ const h=dd[f]-nx[f]*C[0]-ny[f]*C[1]-nz[f]*C[2]; if(h<hmin) hmin=h; let mf=m[f]; if(mf<=L-Lf[f]&&mf>=-(L-Lf[f])) mf=this.margin(f);
   if(mf>-1e-9){ S++; const pen=1+0.5*Math.min(Math.max(mf,0)/mref,1); sum+=pen; if(h<lowH){ lowH=h; lowPen=pen; } } else if(mf>-delta){ near+=1+mf/delta; } }
  let rm2=0; const P=this.P; for(let v=0;v<this.V;v++){ const x=P[3*v]-C[0],y=P[3*v+1]-C[1],z=P[3*v+2]-C[2]; const r=x*x+y*y+z*z; if(r>rm2) rm2=r; }
  return {S,hmin,rm2,cost:sum-lowPen+WN*near}; }
 stableList(){ const o=[]; for(let f=0;f<this.F;f++){ this.margin(f); if(this.m[f]>-1e-9) o.push(f); } return o; }
}
if(process.argv[1]&&process.argv[1].endsWith('r13-inc.mjs')){
 const M=new Mesh(Pa,Ta); const F=M.F, V=M.V; const edge=Math.sqrt(4*Math.PI/F*1.0); const mref=0.5*edge, delta=0.5*edge;
 if(process.env.CHK){ let bad=0,worst=0; for(let t=0;t<F;t++) for(let k=0;k<3;k++){ const a=3*M.T[3*t+k],d=3*M.opp[3*t+k]; const x=M.nx[t]*(M.P[d]-M.P[a])+M.ny[t]*(M.P[d+1]-M.P[a+1])+M.nz[t]*(M.P[d+2]-M.P[a+2]); if(x>CONVTOL){ bad++; worst=Math.max(worst,x); } } console.error('nonconvex edge-sides',bad,'worst',worst); }
 if(process.env.CHK2){ let okc=0,tot=0; const ed=[]; for(let t=0;t<F;t++){ const a=M.T[3*t],b=M.T[3*t+1]; ed.push(Math.hypot(M.P[3*a]-M.P[3*b],M.P[3*a+1]-M.P[3*b+1],M.P[3*a+2]-M.P[3*b+2])); } ed.sort((x,y)=>x-y); console.error('edge len quantiles',[0,.01,.1,.5,.9,1].map(q=>ed[Math.min(ed.length-1,Math.floor(q*ed.length))].toExponential(2)).join(' '));
 for(const sg of [1e-7,1e-6,1e-5,1e-4,1e-3]){ okc=0; tot=0; for(let v=0;v<V;v+=3){ tot++; const o=[M.P[3*v],M.P[3*v+1],M.P[3*v+2]]; const q0=M.ioff[v]; const t=M.inc[q0]; const d=[gauss()*sg,gauss()*sg,gauss()*sg]; for(let q=0;q<3;q++) M.P[3*v+q]+=d[q]; for(let q=M.ioff[v];q<M.ioff[v+1];q++) M.geom(M.inc[q]); if(M.convexAround(v)) okc++; for(let q=0;q<3;q++) M.P[3*v+q]=o[q]; for(let q=M.ioff[v];q<M.ioff[v+1];q++) M.geom(M.inc[q]); } console.error('sigma',sg,'convex-ok fraction',(okc/tot).toFixed(3)); } }
 const t0=performance.now(); let cur=M.scan(mref,delta); if(!(cur.hmin>0)) throw new Error('bad seed'); console.error('start F',F,'V',V,'S',cur.S,'cost',cur.cost.toFixed(2),'hmin',cur.hmin.toFixed(3));
 let best=cur.cost, bestS=cur.S, bestSS=cur.S; const T0=+(T0a||0.5), T1=+(T1a||0.02); const secs=+SECS; let it=0, acc=0, bad=0, lastLog=0; const log=[]; const saveBest=(tag,S)=>{ if(OUT){ const P=[]; for(let i=0;i<V;i++) P.push([M.P[3*i]-M.C[0],M.P[3*i+1]-M.C[1],M.P[3*i+2]-M.C[2]]); fs.writeFileSync(OUT+'_S'+S+'.json',JSON.stringify({P,T:Array.from({length:F},(_,t)=>[M.T[3*t],M.T[3*t+1],M.T[3*t+2]]),S,F,tag})); } };
 const sv={nx:0,ny:0,nz:0,dd:0,vol:0,m:0,Lf:0}; const old=[]; const stab=[];
 while(true){ const el=(performance.now()-t0)/1000; if(el>secs) break; const frac=el/secs; const Temp=T0*Math.pow(T1/T0,frac); it++;
  if(it%20000===0){ M.full(); cur=M.scan(mref,delta); }
  // pick vertex: 30% from a bad stable face (every 500 its refresh list)
  if(it%500===1){ stab.length=0; const st=M.stableList(); st.forEach(f=>stab.push(f)); }
  let v; if(stab.length>1&&rnd()<0.3){ const f=stab[(rnd()*stab.length)|0]; v=M.T[3*f+((rnd()*3)|0)]; } else v=(rnd()*V)|0;
  const sig=edge*Math.pow(10,-3+2.5*rnd()); const dx=sig*gauss(),dy=sig*gauss(),dz=sig*gauss(); const P=M.P; const o3=[P[3*v],P[3*v+1],P[3*v+2]];
  const q0=M.ioff[v],q1=M.ioff[v+1]; old.length=0; const V6o=M.V6, Mo=M.M.slice(), Co=M.C.slice(); for(let q=q0;q<q1;q++){ const t=M.inc[q]; old.push([t,M.nx[t],M.ny[t],M.nz[t],M.dd[t],M.vol[t],M.m[t],M.Lf[t]]); M.contrib(t,-1); }
  P[3*v]+=dx; P[3*v+1]+=dy; P[3*v+2]+=dz; for(let q=q0;q<q1;q++){ const t=M.inc[q]; M.geom(t); M.contrib(t,1); } const dC=M.setC(); M.L+=dC; if(process.env.DBG&&it<6) console.error("dC",dC,"sig",sig,"V6",M.V6); let ok=true;
  if(M.V6<=0) ok=false; else for(let q=q0;q<q1&&ok;q++){ const t=M.inc[q]; if(!(M.margin(t)<1e9)) ok=false; } if(ok) ok=M.convexAround(v);
  let nw=null; if(ok){ nw=M.scan(mref,delta); if(!(nw.hmin>1e-6)||nw.rm2>ASP*ASP*nw.hmin*nw.hmin) ok=false; } else bad++;
  if(ok){ const dE=nw.cost-cur.cost; if(dE<=0||rnd()<Math.exp(-dE/Temp)){ cur=nw; acc++; if(process.env.DBG){ const Pp=[];for(let i=0;i<V;i++)Pp.push([M.P[3*i],M.P[3*i+1],M.P[3*i+2]]); const M2=new Mesh(Pp,Array.from({length:F},(_,t)=>[M.T[3*t],M.T[3*t+1],M.T[3*t+2]])); const tr=M2.scan(mref,delta); if(tr.S!==cur.S) console.error('MISMATCH it',it,'inc S',cur.S,'true S',tr.S,'Cdiff',Math.hypot(M.C[0]-M2.C[0],M.C[1]-M2.C[1],M.C[2]-M2.C[2]),'L',M.L); } if(cur.cost<best-1e-12){ best=cur.cost; } if(cur.S<bestS){ bestS=cur.S; saveBest('anneal',cur.S); console.error('  new best S',bestS,'cost',cur.cost.toFixed(3),'it',it,'t',el.toFixed(1)); } continue; } }
  // reject: restore
  P[3*v]=o3[0]; P[3*v+1]=o3[1]; P[3*v+2]=o3[2]; for(const [t,a,b,c,d,vo,m,lf] of old){ M.nx[t]=a;M.ny[t]=b;M.nz[t]=c;M.dd[t]=d;M.vol[t]=vo; } M.V6=V6o; M.M=Mo; const dC2=Math.hypot(M.C[0]-Co[0],M.C[1]-Co[1],M.C[2]-Co[2]); M.C=Co; M.L+=dC2;
  for(const [t,a,b,c,d,vo,m,lf] of old){ M.margin(t); }
  if(el-lastLog>10){ lastLog=el; console.error(`t ${el.toFixed(0)}s it ${it} (${(it/el).toFixed(0)}/s) acc ${(100*acc/it).toFixed(1)}% bad ${(100*bad/it).toFixed(0)}% S ${cur.S} cost ${cur.cost.toFixed(2)} best S ${bestS}`); log.push({t:el,it,S:cur.S,cost:cur.cost}); } }
 M.full(); const fin=M.scan(mref,delta); const el=(performance.now()-t0)/1000; console.log(JSON.stringify({seed:seedF,level:+LEV,F,V,secs:el,iters:it,perSec:it/el,usPerMove:1e6*el/it,accept:acc/it,startS:null,finalS:fin.S,bestS,finalCost:fin.cost,rs:+RS,T0,T1}));
 saveBest('final',fin.S); }
