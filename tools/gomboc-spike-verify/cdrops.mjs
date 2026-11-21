import fs from 'fs'; import vm from 'vm'; import {hull,fib,centroid} from './hull.mjs';
import * as CANNON from '../../vendor/cannon-es/dist/cannon-es.js';
const G=vm.runInNewContext(fs.readFileSync('core.js','utf8')+';Gomboc');
const [beta,N,drops,seed,inert]=[+process.argv[2],+process.argv[3],+process.argv[4],+process.argv[5]||1,process.argv[6]||'sphere'];
const S=new G.Shape(beta); let P=fib(N).map(u=>S.point(u[0],u[1],u[2],[0,0,0])); let faces=hull(P); const c=centroid(P,faces); P=P.map(p=>[p[0]-c[0],p[1]-c[1],p[2]-c[2]]); faces=hull(P);
let s=seed>>>0; const rnd=()=>{s=(s*1664525+1013904223)>>>0; return s/4294967296;};
const verts=P.map(p=>new CANNON.Vec3(p[0],p[1],p[2])); const fidx=faces.map(f=>f.v.slice());
const shape=new CANNON.ConvexPolyhedron({vertices:verts,faces:fidx});
const results=[]; const stable=[-1,0,0];
for(let k=0;k<drops;k++){
 const world=new CANNON.World({gravity:new CANNON.Vec3(0,-34,0)}); world.allowSleep=true; world.defaultContactMaterial.friction=.2; world.defaultContactMaterial.restitution=.3;
 const pl=new CANNON.Body({mass:0,shape:new CANNON.Plane()}); pl.quaternion.setFromEuler(-Math.PI/2,0,0); world.addBody(pl);
 const b=new CANNON.Body({mass:1,linearDamping:.04,angularDamping:+(process.argv[7]||.1),sleepSpeedLimit:.1,sleepTimeLimit:1,shape}); 
 if(inert==='sphere'){ b.inertia.set(.4,.4,.4); b.invInertia.set(2.5,2.5,2.5); b.updateMassProperties=()=>{}; }
 b.position.set((rnd()-.5)*2,4+rnd()*3,(rnd()-.5)*2); const u=[rnd()*2-1,rnd()*2-1,rnd()*2-1]; const l=Math.hypot(...u)||1; const ang=rnd()*6.28; b.quaternion.setFromAxisAngle(new CANNON.Vec3(u[0]/l,u[1]/l,u[2]/l),ang);
 b.velocity.set((rnd()-.5)*4,-2-rnd()*4,(rnd()-.5)*4); b.angularVelocity.set((rnd()-.5)*40,(rnd()-.5)*40,(rnd()-.5)*40); world.addBody(b);
 let t=0, settled=false; for(let i=0;i<60*(process.argv[8]||40);i++){ world.step(1/60); t+=1/60; if(t>3.5&&!process.argv[7]){ b.angularDamping=.5; b.linearDamping=.25; } if(b.sleepState===CANNON.Body.SLEEPING){ settled=true; break; } }
 const q=b.quaternion.inverse(); const nb=q.vmult(new CANNON.Vec3(0,-1,0)); let best=-1,bd=-2; faces.forEach((f,i)=>{ const d=f.n[0]*nb.x+f.n[1]*nb.y+f.n[2]*nb.z; if(d>bd){bd=d;best=i;} });
 results.push({settled,t,face:best,nb:[nb.x,nb.y,nb.z],dist:Math.acos(Math.max(-1,Math.min(1,nb.x*stable[0]+nb.y*stable[1]+nb.z*stable[2])))*57.3});
}
const ok=results.filter(r=>r.settled); const faceSet=new Set(ok.map(r=>r.face));
// cluster rest directions (within 3 deg)
const cl=[]; for(const r of ok){ let f=cl.find(c=>Math.acos(Math.min(1,c.nb[0]*r.nb[0]+c.nb[1]*r.nb[1]+c.nb[2]*r.nb[2]))*57.3<3); if(f) f.n++; else cl.push({nb:r.nb,n:1}); }
cl.sort((a,b)=>b.n-a.n); const near=ok.filter(r=>r.dist<5).length;
console.log(JSON.stringify({beta,N,inert,drops,settled:ok.length,distinctFacets:faceSet.size,clusters3deg:cl.length,topClusterShare:(cl[0]?cl[0].n/ok.length:0).toFixed(3),withinDegOfTrueStable:{le5:near,le15:ok.filter(r=>r.dist<15).length},meanT:(ok.reduce((a,r)=>a+r.t,0)/ok.length).toFixed(1)}));
