// Discrete Morse count of ray-cast radial samples (from mesh-radial.mjs) at the native level and coarser levels.   node radial-morse.mjs radial.json
import fs from 'fs'; import {icosphere,morse} from './verify.mjs';
const j=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const ico=icosphere(j.level); const r=Float64Array.from(j.r);
const good=[]; r.forEach((x,i)=>{ if(x>0) good.push(i); }); let miss=0; for(let i=0;i<r.length;i++) if(!(r[i]>0)){ miss++; let bs=-2,bk=0; for(const k of good){ const s=ico.V[k][0]*ico.V[i][0]+ico.V[k][1]*ico.V[i][1]+ico.V[k][2]*ico.V[i][2]; if(s>bs){bs=s;bk=k;} } r[i]=r[bk]; }
const out=(lab,vals,I)=>{ const m=morse(vals,I.V,I.T); console.log(`${lab}: ${m.cnt.min} minima, ${m.cnt.max} maxima, ${m.cnt.saddle} saddles (chi ${m.cnt.min-m.cnt.saddle+m.cnt.max})`); return m; };
const m=out(`ray-cast r on icosphere L${j.level} (${ico.V.length} dirs, ${miss} misses filled)`,r,ico);
for(const L of [3,4].filter(l=>l<j.level)){ const I=icosphere(L); const v=I.V.map(u=>{ let bs=-2,bk=0; for(let k=0;k<ico.V.length;k++){ const s=ico.V[k][0]*u[0]+ico.V[k][1]*u[1]+ico.V[k][2]*u[2]; if(s>bs){bs=s;bk=k;} } return r[bk]; }); out(`same r sampled at L${L} (${I.V.length} dirs)`,v,I); }
let imin=0,imax=0; r.forEach((x,i)=>{ if(x<r[imin]) imin=i; if(x>r[imax]) imax=i; }); console.log('global r min',r[imin].toFixed(4),'at',ico.V[imin].map(x=>x.toFixed(3)).join(','),'; r max',r[imax].toFixed(4),'at',ico.V[imax].map(x=>x.toFixed(3)).join(','));
const rep=ids=>ids.slice(0,12).map(i=>r[i].toFixed(4)+'@('+ico.V[i].map(x=>x.toFixed(2)).join(',')+')').join(' '); console.log('minima (first 12):',rep(m.list.min)); console.log('maxima (first 12):',rep(m.list.max));
