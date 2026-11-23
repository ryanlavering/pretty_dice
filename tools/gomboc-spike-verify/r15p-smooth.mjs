// Round 15: smooth-body regression (Sloan beta .03 and exact body 1.16) with the page's physics. GOM_HTML=<page> node r15p-smooth.mjs seed0 count
import fs from 'fs'; import {Gomboc,roll} from './r15p-node.mjs'; import path from 'path'; import {fileURLToPath} from 'url';
const src=fs.readFileSync(process.env.GOM_HTML||path.join(path.dirname(fileURLToPath(import.meta.url)),'..','gomboc-spike.html'),'utf8');
const i=src.indexOf('const EXACTS='), j=src.indexOf('];',i)+1; const EX=new Function(src.slice(i,j)+';return EXACTS;')().find(b=>b.id==='x116');
const cases=[{name:'sloan',shape:new Gomboc.Shape(0.03),pl:{stable:[[-1,0,0]],dt:1/120}},{name:'x116',shape:new Gomboc.Shape({c:EX.c,Lmax:EX.Lmax}),pl:{stable:[EX.stable],dt:1/180}}];
const [s0,n]=process.argv.slice(2);
for(const c of cases) for(let k=0;k<+n;k++){ const r=roll(c.shape,c.pl,+s0+k,{DT:c.pl.dt}); console.log(c.name,+s0+k,'tRest',r.tRest&&r.tRest.toFixed(3),'dist',r.distDeg.toFixed(3),'minFz',r.minFz.toFixed(1),'pos',r.pos.map(x=>x.toFixed(3)).join(',')); }
