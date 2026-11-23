// node r12-certify.mjs vertices.json [out.json]  : EXACT check (BigInt) of the hull of the vertices (rounded to 2^-40), plus the global vertex-below-plane test.
import fs from 'fs'; import {quantize,buildHull,exactCheck,globalConvexCert} from './poly-check.mjs';
const V=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); let PI=quantize(V); let T=buildHull(PI); { const used=[...new Set(T.flat())].sort((a,b)=>a-b); const mp=new Map(used.map((v,i)=>[v,i])); PI=used.map(v=>PI[v]); T=T.map(t=>t.map(v=>mp.get(v))); } /* drop interior points of the state */ const r=exactCheck(PI,T); const g=globalConvexCert(PI,T);
console.log(JSON.stringify({vertices:PI.length,faces:T.length,S:r.S,U:r.U,H:r.H,PH:r.poincareHopf,convexCert:r.convexCert,pass:r.pass1,tip:r.tip,degenerate:r.degenerate,global:g,heights:r.heights}));
if(process.argv[3]) fs.writeFileSync(process.argv[3],JSON.stringify({vertices:PI.map(p=>p.map(x=>x.toString())),faces:T,scale:'2^40'}));
