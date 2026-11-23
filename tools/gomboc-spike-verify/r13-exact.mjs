// Round 13: exact (BigInt) check of an optimiser mesh {P,T}: quantise to 2^-40, exact edge flips to convex, exactCheck + global test. node r13-exact.mjs mesh.json [out_exact.json]
import fs from 'fs'; import {quantize,flipToConvex,exactCheck,globalConvexCert} from './poly-check.mjs';
const J=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const PI=quantize(J.P); const fl=flipToConvex(PI,J.T); const r=exactCheck(PI,fl.T); const g=r.convexCert?globalConvexCert(PI,fl.T):null;
console.log(JSON.stringify({file:process.argv[2].split('/').pop(),V:PI.length,F:fl.T.length,flips:fl.flips,S:r.S,U:r.U,H:r.H,PH:r.poincareHopf,convexCert:r.convexCert,nonConvex:r.nonConvexEdges,flat:r.flatEdges,global:g,heights:r.heights&&r.heights.slice(0,6)}));
if(process.argv[3]&&r.convexCert) fs.writeFileSync(process.argv[3],JSON.stringify({vertices:PI.map(p=>p.map(x=>x.toString())),faces:fl.T,scale:'2^40'}));
