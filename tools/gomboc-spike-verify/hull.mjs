export function hull(P){ const n=P.length; const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 // initial tetra
 let i0=0,i1=1,i2=-1,i3=-1; for(let i=2;i<n&&i2<0;i++){ const c=cr(sub(P[i1],P[i0]),sub(P[i],P[i0])); if(Math.hypot(...c)>1e-6) i2=i; } const nn=cr(sub(P[i1],P[i0]),sub(P[i2],P[i0])); for(let i=2;i<n;i++){ if(Math.abs(dot(nn,sub(P[i],P[i0])))>1e-6){i3=i;break;} }
 let faces=[]; const mk=(a,b,c)=>{ const nrm=cr(sub(P[b],P[a]),sub(P[c],P[a])); const l=Math.hypot(...nrm); return {v:[a,b,c],n:nrm.map(x=>x/l),d:0,alive:true}; };
 const cen=[0,1,2,3].map(k=>P[[i0,i1,i2,i3][k]]).reduce((s,p)=>[s[0]+p[0]/4,s[1]+p[1]/4,s[2]+p[2]/4],[0,0,0]);
 const add=(a,b,c)=>{ let f=mk(a,b,c); f.d=dot(f.n,P[a]); if(dot(f.n,cen)-f.d>0){ f=mk(a,c,b); f.d=dot(f.n,P[a]); } faces.push(f); };
 add(i0,i1,i2);add(i0,i1,i3);add(i0,i2,i3);add(i1,i2,i3);
 for(let p=0;p<n;p++){ if(p===i0||p===i1||p===i2||p===i3) continue; const vis=[]; for(const f of faces) if(f.alive&&dot(f.n,P[p])-f.d>1e-12) vis.push(f); if(!vis.length) continue;
  const edges=new Map(); for(const f of vis){ f.alive=false; for(let k=0;k<3;k++){ const a=f.v[k],b=f.v[(k+1)%3]; const key=a+'_'+b, rk=b+'_'+a; if(edges.has(rk)) edges.delete(rk); else edges.set(key,[a,b]); } }
  for(const [a,b] of edges.values()){ const f=mk(a,b,p); f.d=dot(f.n,P[a]); faces.push(f); }
  if(faces.length>4*n) faces=faces.filter(f=>f.alive); }
 faces=faces.filter(f=>f.alive); return faces; }
export function fib(N){ const out=[]; const ga=Math.PI*(3-Math.sqrt(5)); for(let i=0;i<N;i++){ const z=1-2*(i+.5)/N, r=Math.sqrt(1-z*z), t=ga*i; out.push([r*Math.cos(t),r*Math.sin(t),z]); } return out; }
export function centroid(P,faces){ let V=0,c=[0,0,0]; for(const f of faces){ const [a,b,d]=f.v.map(i=>P[i]); const vol=(a[0]*(b[1]*d[2]-b[2]*d[1])-a[1]*(b[0]*d[2]-b[2]*d[0])+a[2]*(b[0]*d[1]-b[1]*d[0]))/6; V+=vol; for(let k=0;k<3;k++) c[k]+=vol*(a[k]+b[k]+d[k])/4; } return c.map(x=>x/V); }
export function stableFaces(P,faces){ // CoM at origin; a face is a stable rest if the foot of the perpendicular from the origin lies inside the (triangular) face; merged coplanar not needed
 let cnt=0; const list=[]; faces.forEach((f,idx)=>{ const foot=f.n.map(x=>x*f.d); let inside=true; for(let k=0;k<3;k++){ const a=P[f.v[k]],b=P[f.v[(k+1)%3]]; const e=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], w=[foot[0]-a[0],foot[1]-a[1],foot[2]-a[2]]; const c=[e[1]*w[2]-e[2]*w[1],e[2]*w[0]-e[0]*w[2],e[0]*w[1]-e[1]*w[0]]; if(c[0]*f.n[0]+c[1]*f.n[1]+c[2]*f.n[2]<0){inside=false;break;} } if(inside){cnt++;list.push(idx);} }); return {cnt,list}; }
