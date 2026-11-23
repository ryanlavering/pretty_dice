// Round 15 (lane gomboc-phys): node harness running the page's own Gomboc physics (extracted from tools/gomboc-spike.html).
//   node r15p-node.mjs shapeId seed0 count [--log] [--dt=1/180]
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const html=fs.readFileSync(process.env.GOM_HTML||path.join(path.dirname(fileURLToPath(import.meta.url)),'..','gomboc-spike.html'),'utf8').split('\n');
const src=html[85].replace(/^<script>/,'').replace(/<\/script>$/,'')+'\n'+html.slice(88,html.findIndex(l=>l.startsWith('/* ---------- page'))).join('\n');
const mod=new Function(src+'\nreturn {Gomboc,POLYS};')(); export const {Gomboc,POLYS}=mod;
export function lcg(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
export const pageSrc=html.join('\n');
const gm=/function gauss\([^]*?\n/.exec(pageSrc); export const gaussPage=new Function(gm[0]+"return gauss;")();
export function mkShape(id){ const pl=POLYS.find(b=>b.id===id); return {pl,shape:new Gomboc.Shape({poly:{planes:pl.planes,verts:pl.verts,p:pl.p||40,com:pl.weighted?pl.weighted.com:null}})}; }
export function roll(shape,pl,seed,{G=654,damp=2.0,DT=pl.dt||1/180,log=false,tmax=300}={}){
  const B=new Gomboc.Body(shape,{g:G,damp}); const rnd=lcg(seed); const v=[gaussPage(rnd),gaussPage(rnd),gaussPage(rnd)]; Gomboc.norm(v); B.placeDown(v,rnd()*6.283);
  const sp=3+11*rnd(); const d=[gaussPage(rnd),gaussPage(rnd),0]; Gomboc.norm(d); B.setRollingVelocity([d[0]*sp,d[1]*sp]); B.om[2]+=gaussPage(rnd)*2;
  let hold=0,t=null,first=null,maxw=0;
  for(let i=0;i<tmax/DT;i++){ B.step(DT); const w=Math.hypot(...B.om); if(w>maxw) maxw=w;
    if(!isFinite(w)||w>1e5){ first={t:B.t,w,Fz:B.Fz,minN:B.minN}; break; }
    
    if(i%6===0){ if(w<0.05){ hold+=6*DT; if(hold>1.5){ t=B.t-1.5; break; } } else hold=0; } }
  const nb=Gomboc.qconjrot(B.q,[0,0,-1],[0,0,0]); const ang=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2])));
  let bd=9,fk=0; pl.stable.forEach((s,k)=>{ const a=ang(nb,s); if(a<bd){bd=a;fk=k;} });
  return {tRest:t,distDeg:bd*57.2958,face:fk,minFz:B.minN,maxw,first,t:B.t,nFly:B.nFly,nImp:B.nImp,flyT:B.flyT,nRef:B.nRef,pos:[B.pos[0],B.pos[1]]};
}
if(process.argv[1]&&process.argv[1].endsWith('r15p-node.mjs')){
  const [id,s0,cnt,...fl]=process.argv.slice(2); const {pl,shape}=mkShape(id); const log=fl.includes('--log'); let div=0,ok=0;
  for(let i=0;i<+cnt;i++){ const r=roll(shape,pl,+s0+i,{log}); const bad=r.tRest==null, good=!bad&&r.distDeg<3.5; div+=bad; ok+=good;
    console.log(+s0+i,'tRest',r.tRest&&r.tRest.toFixed(2),'dist',r.distDeg.toFixed(2),'face',r.face,'minFz',r.minFz.toExponential(1),'maxw',r.maxw.toFixed(0),'fly',r.nFly,'imp',r.nImp,'flyT',r.flyT.toFixed(2),'ref',r.nRef,r.first?JSON.stringify(r.first):''); }
  console.log(id,'rolls',cnt,'ok',ok,'bad',div); }
