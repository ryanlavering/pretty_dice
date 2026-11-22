import fs from 'fs'; import vm from 'vm'; import {icosphere,sph} from './verify.mjs';
const G=vm.runInNewContext(fs.readFileSync('core.js','utf8')+';Gomboc');
const beta=+process.argv[2]||0.02, L=+process.argv[3]||5, K=+process.argv[4]||6; const S=(process.env.SHAPEFILE?new G.Shape(JSON.parse(fs.readFileSync(process.env.SHAPEFILE,'utf8'))):new G.Shape(beta)); const {V,T}=icosphere(L); const r={h:0,x:[0,0,0],n:[0,0,0]};
if(process.env.NUDGE){ const SJ=process.env.SHAPEFILE?JSON.parse(fs.readFileSync(process.env.SHAPEFILE,'utf8')):{}; const d=SJ.stable||[-1,0,0]; const e=+process.env.NUDGE; S.setNudge(d.map(x=>x*e)); console.log('NUDGE: CoM moved',e,'of the radius toward the stable point',JSON.stringify(d.map(x=>+x.toFixed(4)))); }
function field(u){ S.support(u,null,r); const d=r.x[0]*u[0]+r.x[1]*u[1]+r.x[2]*u[2]; return [r.x[0]-d*u[0],r.x[1]-d*u[1],r.x[2]-d*u[2]]; }
let plus=0,minus=0,sum=0; const hits=[];
for(const [a,b,c] of T){ const pts=[]; const P=[V[a],V[b],V[c]]; for(let e=0;e<3;e++){ const p=P[e],q=P[(e+1)%3]; for(let k=0;k<K;k++){ const t=k/K; const v=[p[0]*(1-t)+q[0]*t,p[1]*(1-t)+q[1]*t,p[2]*(1-t)+q[2]*t]; G.norm(v); pts.push(v); } }
 const cen=[(P[0][0]+P[1][0]+P[2][0])/3,(P[0][1]+P[1][1]+P[2][1])/3,(P[0][2]+P[1][2]+P[2][2])/3]; G.norm(cen); const e1=[0,0,0],e2=[0,0,0]; G.basis(cen,e1,e2);
 let ang=[]; for(const v of pts){ const g=field(v); ang.push(Math.atan2(g[0]*e2[0]+g[1]*e2[1]+g[2]*e2[2],g[0]*e1[0]+g[1]*e1[1]+g[2]*e1[2])); }
 let w=0; for(let i=0;i<ang.length;i++){ let d=ang[(i+1)%ang.length]-ang[i]; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI; w+=d; }
 const idx=Math.round(w/(2*Math.PI)); if(idx>0){plus+=idx;hits.push([idx,sph(cen)]);} if(idx<0){minus-=idx;hits.push([idx,sph(cen)]);} sum+=idx; }
console.log(`beta=${beta} L=${L} (${T.length} triangles, ${K} samples/edge): triangles with index>0: ${plus}, index<0: ${minus}, total index=${sum}`); for(const h of hits) console.log('  idx',h[0],JSON.stringify(h[1]));
