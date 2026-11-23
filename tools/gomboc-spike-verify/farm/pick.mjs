// node pick.mjs workdir  -> writes workdir/start.json and prints the job {seed,target,kind,gens,sigma}
// kinds: cont (a catalogued/reference body, tiny perturbation), near (perturbation 2-4 CMA scale units), far (6-12 units, twist/oval/axial parameters differ), rand (broad random draw around the Sloan start)
import fs from 'fs'; import {refBodies,catalogue,readJSON} from './lib.mjs';
const W=process.argv[2]; fs.mkdirSync(W,{recursive:true});
let s=(Date.now()^(process.pid*2654435761))>>>0; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; const gauss=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
const TARGETS=[[1.10,1],[1.11,1],[1.12,3],[1.13,3],[1.14,3],[1.15,3],[1.16,3],[1.17,3],[1.18,1.5]]; let tot=TARGETS.reduce((a,b)=>a+b[1],0), u=rnd()*tot, target=1.15; for(const [t,w] of TARGETS){ if((u-=w)<0){ target=t; break; } }
const SCALE={a0:0.03,a1:0.03,a2:0.03,a3:0.03,p1:0.4,p3:0.4,p5:0.3,b0:0.01,b1:0.01,b2:0.01,q0:0.5,q2:0.5,q4:0.4,e:0.01,e4:0.01,c3:0.005};
if(process.env.FARM_TARGET) target=+process.env.FARM_TARGET;
const pool=[...refBodies(),...catalogue().bodies.map(b=>({id:b.id,params:b.params}))]; const base=(process.env.FARM_BASE&&pool.find(b=>b.id===process.env.FARM_BASE))||pool[Math.floor(rnd()*pool.length)]||{params:{a0:0.12,p1:3*Math.PI/2,p3:-Math.PI/2}};
const r=rnd(); const kind=process.env.FARM_KIND||(r<0.2?'cont':r<0.55?'near':r<0.85?'far':'rand');
const amp={cont:0.5,near:3,far:9}[kind]; let params;
if(kind==='rand'){ params={a0:0.10+0.06*rnd(),p1:(0.5+1.5*rnd())*Math.PI*1.5/1.5,p3:-Math.PI*rnd()*1.2}; for(const k of Object.keys(SCALE)) if(!(k in params)) params[k]=SCALE[k]*3*gauss(); params.q0=Math.PI*2*(rnd()-0.5)*1.5; }
else { params={...base.params}; for(const k of Object.keys(SCALE)){ const f=(/^(p|q|b|e|c)/.test(k)&&kind==='far')?1.3:1; params[k]=(params[k]||0)+SCALE[k]*amp*f*gauss(); } }
const seed=1+Math.floor(rnd()*1e6); fs.writeFileSync(W+'/start.json',JSON.stringify({params}));
const gens=+(process.env.FARM_GENS||(kind==='cont'||kind==='near'?450:350)); console.log(JSON.stringify({seed,target,kind,base:base.id||null,gens,sigma:kind==='rand'||kind==='far'?0.3:0.15}));
