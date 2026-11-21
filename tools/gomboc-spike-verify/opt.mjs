import fs from 'fs'; import vm from 'vm'; import {icosphere,sph} from './verify.mjs';
const SH=vm.runInNewContext(fs.readFileSync('sh.js','utf8')+';SH'); const G=vm.runInNewContext(fs.readFileSync('core.js','utf8')+';Gomboc');
export const Lmax=+(process.env.LMAX||10); export const B=SH.make(Lmax); const N=B.N; const buf=new Float64Array(N);
export function Fof(c,x,y,z){ B.eval(x,y,z,buf); let s=1; for(let i=0;i<N;i++) s+=c[i]*buf[i]; return s; }
// project Sloan F onto basis
export function fitSloan(beta){ const S=new G.Shape(beta); const c=new Float64Array(N); const nz=200,nt=400; // quadrature
  const gl=(n)=>{ const nodes=[],w=[]; for(let i=0;i<n;i++){ let x=Math.cos(Math.PI*(i+.75)/(n+.5)),pp; for(let it=0;it<100;it++){ let p0=1,p1=x; for(let k=2;k<=n;k++){ const p2=((2*k-1)*x*p1-(k-1)*p0)/k; p0=p1;p1=p2; } pp=n*(x*p1-p0)/(x*x-1); const dx=p1/pp; x-=dx; if(Math.abs(dx)<1e-15) break; } nodes.push(x); w.push(2/((1-x*x)*pp*pp)); } return {nodes,w}; }; const {nodes,w}=gl(nz);
  for(let i=0;i<nz;i++){ const z=nodes[i],s=Math.sqrt(1-z*z); for(let j=0;j<nt;j++){ const t=(j+.5)*2*Math.PI/nt,x=s*Math.cos(t),y=s*Math.sin(t); const r=S.r(x,y,z), F=r**4; B.eval(x,y,z,buf); const dw=w[i]*2*Math.PI/nt; for(let k=0;k<N;k++) c[k]+=dw*F*buf[k]; } } return c; }
const tan=(u)=>{ const e1=[0,0,0],e2=[0,0,0]; G.basis(u,e1,e2); return [e1,e2]; };
const geo=(u,t,s)=>[u[0]*Math.cos(s)+t[0]*Math.sin(s),u[1]*Math.cos(s)+t[1]*Math.sin(s),u[2]*Math.cos(s)+t[2]*Math.sin(s)];
// convexity margin at u: lambda_min of (Hess_S w + w I) / w, w = F^(-1/4)
export function convMargin(c,u){ const [e1,e2]=tan(u); const h=2e-3; const W=(p)=>Math.pow(Fof(c,p[0],p[1],p[2]),-0.25); const w0=W(u);
  const H=(t)=>{ return (W(geo(u,t,h))+W(geo(u,t,-h))-2*w0)/(h*h); }; const s2=Math.SQRT1_2; const dp=[(e1[0]+e2[0])*s2,(e1[1]+e2[1])*s2,(e1[2]+e2[2])*s2], dm=[(e1[0]-e2[0])*s2,(e1[1]-e2[1])*s2,(e1[2]-e2[2])*s2];
  const h11=H(e1)+w0,h22=H(e2)+w0,h12=(H(dp)-H(dm))/2; const tr=h11+h22,det=h11*h22-h12*h12,disc=Math.sqrt(Math.max(0,tr*tr/4-det)); return (tr/2-disc)/w0; }
export function minConv(c,V){ let m=1e9; for(const u of V){ const v=convMargin(c,u); if(v<m) m=v; } return m; }
export function flat(c,V){ let mn=1e9,mx=0; for(const u of V){ const F=Fof(c,u[0],u[1],u[2]); mn=Math.min(mn,F); mx=Math.max(mx,F);} return Math.pow(mx/mn,0.25); }
// critical points of F: index count by winding of tangential gradient on triangles
function grad(c,u,e1,e2){ const h=1e-4; const a=(Fof(c,...geo(u,e1,h))-Fof(c,...geo(u,e1,-h)))/(2*h), b=(Fof(c,...geo(u,e2,h))-Fof(c,...geo(u,e2,-h)))/(2*h); return [a,b]; }
export function critIndex(c,ico,K){ const {V,T}=ico; let plus=0,minus=0; const hits=[];
  for(const [a,b,d] of T){ const P=[V[a],V[b],V[d]]; const pts=[]; for(let e=0;e<3;e++){ const p=P[e],q=P[(e+1)%3]; for(let k=0;k<K;k++){ const t=k/K; const v=[p[0]*(1-t)+q[0]*t,p[1]*(1-t)+q[1]*t,p[2]*(1-t)+q[2]*t]; G.norm(v); pts.push(v); } }
   const cen=[(P[0][0]+P[1][0]+P[2][0])/3,(P[0][1]+P[1][1]+P[2][1])/3,(P[0][2]+P[1][2]+P[2][2])/3]; G.norm(cen); const [f1,f2]=tan(cen);
   const ang=pts.map(v=>{ const [e1,e2]=tan(v); const g=grad(c,v,e1,e2); const gv=[g[0]*e1[0]+g[1]*e2[0],g[0]*e1[1]+g[1]*e2[1],g[0]*e1[2]+g[1]*e2[2]]; return Math.atan2(gv[0]*f2[0]+gv[1]*f2[1]+gv[2]*f2[2],gv[0]*f1[0]+gv[1]*f1[1]+gv[2]*f1[2]); });
   let w=0; for(let i=0;i<ang.length;i++){ let dd=ang[(i+1)%ang.length]-ang[i]; while(dd>Math.PI) dd-=2*Math.PI; while(dd<-Math.PI) dd+=2*Math.PI; w+=dd; } const idx=Math.round(w/(2*Math.PI)); if(idx>0){plus+=idx;hits.push([idx,cen]);} if(idx<0){minus-=idx;hits.push([idx,cen]);} }
  return {plus,minus,hits}; }
if(process.argv[1].endsWith('opt.mjs')&&process.argv[2]==='fit'){ const beta=+process.argv[3]||0.03; const c=fitSloan(beta); const ico3=icosphere(3), ico4=icosphere(4);
  // fit error
  let err=0; const S=new G.Shape(beta); for(const u of ico4.V) err=Math.max(err,Math.abs(Fof(c,...u)-S.r(...u)**4)); console.log('L',Lmax,'N',N,'max |F_fit-F_sloan|',err,'(relative to 4beta=',4*beta,')');
  console.log('flat',flat(c,ico4.V),'minConv',minConv(c,ico4.V),'crit',JSON.stringify((({plus,minus})=>({plus,minus}))(critIndex(c,ico4,4)))); }
