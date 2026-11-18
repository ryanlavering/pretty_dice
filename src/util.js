// Small pure helpers shared by the geometry code (4.1 factoring step S1; was the 'utils' section of index.html). rng/SEED stay in index.html: rng is reassigned by reseed().
import * as THREE from 'three';

export const mulberry32 = a => () => { a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
export const pick = (arr, r) => arr[Math.floor(r()*arr.length)];
export const range = (a,b) => Array.from({length:b-a+1},(_,i)=>a+i);
export const PHI = (1+Math.sqrt(5))/2;
export const V = (x,y,z) => new THREE.Vector3(x,y,z);
export const signs = (x,y,z) => { const o=[]; for(const a of [1,-1]) for(const b of [1,-1]) for(const c of [1,-1]) o.push(V(a*x,b*y,c*z)); return o; };

