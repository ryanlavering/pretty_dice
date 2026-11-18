// Polyhedra: vertex sets, convex hull with merged coplanar faces, the SHAPES table and opposite-face label assignment (4.1 factoring step S2).
import * as THREE from 'three';
import { PHI, V, range, signs } from './util.js';

/* ---------- polyhedra: vertex sets -> hull -> merged coplanar faces ---------- */
export const trapezohedron = n => {           // d10 (n=5), d14 (n=7)
  const H=1, c=Math.cos(Math.PI/n), t=H*(1-c)/(1+c), v=[V(0,H,0),V(0,-H,0)];
  for(let k=0;k<2*n;k++){const a=k*Math.PI/n; v.push(V(Math.cos(a),k%2?-t:t,Math.sin(a)));}
  return v;
};
export const dipyramid = (n,h) => { const v=[V(0,h,0),V(0,-h,0)]; for(let k=0;k<n;k++){const a=2*Math.PI*k/n; v.push(V(Math.cos(a),0,Math.sin(a)));} return v; };
export const SHAPES = {
  d4:  {label:'d4',  verts:()=>[V(1,1,1),V(1,-1,-1),V(-1,1,-1),V(-1,-1,1)], labels:range(1,4)},
  d6:  {label:'d6',  verts:()=>signs(1,1,1), labels:range(1,6)},
  d8:  {label:'d8',  verts:()=>[V(1,0,0),V(-1,0,0),V(0,1,0),V(0,-1,0),V(0,0,1),V(0,0,-1)], labels:range(1,8)},
  d10: {label:'d10', verts:()=>trapezohedron(5), labels:range(0,9)},
  d100:{label:'d%',  pair:true},
  d12: {label:'d12', verts:()=>{const i=1/PHI,o=signs(1,1,1);
        for(const a of [1,-1])for(const b of [1,-1]){o.push(V(0,a*i,b*PHI),V(a*i,b*PHI,0),V(b*PHI,0,a*i));} return o;}, labels:range(1,12)},
  d20: {label:'d20', verts:()=>{const o=[];
        for(const a of [1,-1])for(const b of [1,-1]){o.push(V(0,a,b*PHI),V(a,b*PHI,0),V(b*PHI,0,a));} return o;}, labels:range(1,20)},
  d14: {label:'d14', verts:()=>trapezohedron(7), labels:range(1,14)},
  d16: {label:'d16', verts:()=>dipyramid(8,0.9), labels:range(1,16)},
  set7:{label:'Standard 7', set:true},
  custom:{label:'Custom', set:true},
  rd12:{label:'rhombic d12', verts:()=>{const o=signs(1,1,1); for(const s of [2,-2]) o.push(V(s,0,0),V(0,s,0),V(0,0,s)); return o;}, labels:range(1,12)},
};

export function hull(verts){
  const eps=1e-4, n=verts.length, out=[], seen=new Set();
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)for(let k=j+1;k<n;k++){
    const nr=new THREE.Vector3().subVectors(verts[j],verts[i]).cross(new THREE.Vector3().subVectors(verts[k],verts[i]));
    if(nr.lengthSq()<1e-12) continue; nr.normalize();
    let d=nr.dot(verts[i]), pos=0, neg=0;
    for(const v of verts){const s=nr.dot(v)-d; if(s>eps)pos++; else if(s<-eps)neg++;}
    if(pos&&neg) continue;
    if(pos){nr.negate(); d=-d;}
    const idx=[]; verts.forEach((v,m)=>{if(Math.abs(nr.dot(v)-d)<=eps) idx.push(m);});
    const key=idx.join(','); if(seen.has(key)) continue; seen.add(key);
    const c=new THREE.Vector3(); idx.forEach(m=>c.add(verts[m])); c.multiplyScalar(1/idx.length);
    const e1=new THREE.Vector3().subVectors(verts[idx[0]],c).normalize(), e2=new THREE.Vector3().crossVectors(nr,e1);
    idx.sort((a,b)=>{const pa=new THREE.Vector3().subVectors(verts[a],c),pb=new THREE.Vector3().subVectors(verts[b],c);
      return Math.atan2(pa.dot(e2),pa.dot(e1))-Math.atan2(pb.dot(e2),pb.dot(e1));});
    out.push({n:nr, d, idx:[...idx], pts:idx.map(m=>verts[m].clone())});
  }
  return out;
}

export function assignLabels(faces, labels, rng){
  const N=faces.length, out=Array(N).fill(null); let lo=0, hi=N-1;
  for(let i=0;i<N;i++){
    if(out[i]!==null) continue;
    const j=faces.findIndex((f,m)=>m!==i&&out[m]===null&&f.n.dot(faces[i].n)<-0.999);
    if(j>=0){out[i]=labels[lo++]; out[j]=labels[hi--];} else out[i]=labels[lo++];
  }
  return out;
}

