// Die geometry: flat numbered faces, optional rounded edge strips and vertex patches, filigree drawn into the atlas (4.1 factoring step S4).
import * as THREE from 'three';
import { LAYOUT_UNIT } from './atlas.js';
import { V } from './util.js';

/* ---------- geometry: flat numbered faces + (optional) rounded edge strips and vertex patches ---------- */
export const slerp=(a,b,t)=>{const th=Math.acos(THREE.MathUtils.clamp(a.dot(b),-1,1)); if(th<1e-6) return a.clone();
  return a.clone().multiplyScalar(Math.sin((1-t)*th)).addScaledVector(b,Math.sin(t*th)).multiplyScalar(1/Math.sin(th));};

/* Filigree: vector ornament along each face edge, drawn into the number atlas. Etched into the bump map (darken) and
   written to the mask's green channel (lighten) so the shader can fill it with enamel. poly = face corners in atlas px (x right, y up). */
const LITE_FLAT=typeof location!=='undefined'&&new URLSearchParams(location.search).has('lite');   // ?lite is the test-only render profile (PD-178): the 0.6 px softening of every filigree stroke is a canvas filter pass per stroke, 3-6 s of software rendering per build of a filigree look; tests need the enamel painted, not softened
export function drawFiligree(atlas,col,row,poly,rp,insetPx,style,soft){
  const cell=atlas.cell, k=Math.max(.3,1-insetPx/rp), Q=poly.map(([x,y])=>[x*k,-y*k]), lw=Math.max(2.2,rp*.034);
  for(const [img,colr,comp,blur] of [[atlas.bump.image,'#000','darken',soft*.5],[atlas.mask.image,'#0f0','lighten',.6]]){
    const g=img.getContext('2d'); g.save(); g.beginPath(); g.rect(col*cell,row*cell,cell,cell); g.clip();
    g.translate((col+.5)*cell,(row+.5)*cell); g.globalCompositeOperation=comp; g.strokeStyle=g.fillStyle=colr; g.lineCap=g.lineJoin='round'; g.lineWidth=lw; if(blur&&!LITE_FLAT) g.filter=`blur(${blur}px)`;
    const dot=(x,y,r,fill)=>{ g.beginPath(); g.arc(x,y,r,0,7); fill?g.fill():g.stroke(); };
    for(let i=0;i<Q.length;i++){
      const A=Q[i], B=Q[(i+1)%Q.length], dx=B[0]-A[0], dy=B[1]-A[1], L=Math.hypot(dx,dy), ux=dx/L, uy=dy/L, mx=(A[0]+B[0])/2, my=(A[1]+B[1])/2;
      let nx=-uy, ny=ux; if(nx*mx+ny*my>0){nx=-nx; ny=-ny;}                    // inward normal
      const at=(s,o)=>[A[0]+ux*s+nx*o, A[1]+uy*s+ny*o], line=(s0,s1,o)=>{ g.beginPath(); g.moveTo(...at(s0,o)); g.lineTo(...at(s1,o)); g.stroke(); }, trim=rp*.13;
      if(style==='scroll'){
        const n=Math.max(2,Math.round((L-2*trim)/(rp*.8))), p=(L-2*trim)/n, amp=rp*.085, rc=rp*.05;
        g.beginPath(); for(let s=0;s<=L-2*trim;s+=2){ const [x,y]=at(trim+s,amp*Math.sin(2*Math.PI*s/p)); s?g.lineTo(x,y):g.moveTo(x,y); } g.stroke();
        for(let j=0;j<n;j++){ const [x,y]=at(trim+p*(j+.25),amp+rc); dot(x,y,rc,false); dot(x,y,lw*.7,true);
          const [x2,y2]=at(trim+p*(j+.75),-amp-rc*.9); dot(x2,y2,rc*.55,true); }
        line(trim*.5,L-trim*.5,-amp-rc*2.6);
      } else if(style==='beads'){
        const n=Math.max(3,Math.round((L-2*trim)/(rp*.15)));
        for(let j=0;j<=n;j++){ const [x,y]=at(trim+(L-2*trim)*j/n,0); dot(x,y,lw*1.35,true); }
        line(trim*.5,L-trim*.5,lw*4.2); line(trim*.5,L-trim*.5,-lw*4.2);
      } else {
        line(trim*.5,L-trim*.5,0); line(trim*.5,L-trim*.5,lw*3.4);
        const n=Math.max(2,Math.round((L-2*trim)/(rp*.3))), p=(L-2*trim)/n;
        for(let j=0;j<n;j++){ const s=trim+p*(j+.5); g.beginPath(); g.moveTo(...at(s-p*.22,lw*6.5)); g.lineTo(...at(s,lw*10)); g.lineTo(...at(s+p*.22,lw*6.5)); g.stroke(); }
      }
    }
    for(const [x,y] of Q){ dot(x,y,rp*.05,false); dot(x,y,lw*1.1,true); }       // corner rosettes
    g.restore();
  }
}

export function buildGeometry(faces, atlas, radius, numSize, numRot, opts={}){
  const pos=[],nor=[],uv=[],cb=[],rc=[]; let curRC=0; const panelF=opts.panel||0;
  let curCell=[0,0,1,1];
  const maxHD=Math.max(...atlas.info.map(i=>i.halfDiag));   // one scale for every label so 8 and 10 print at the same size
  const push=(p,n,u,v)=>{pos.push(p.x,p.y,p.z); nor.push(n.x,n.y,n.z); uv.push(u,v); cb.push(...curCell); rc.push(curRC);};
  let R=0, SV=null;                                   // R: clamped radius, SV: shrunk vertex per original vertex id
  if(radius>0){
    R=Math.min(radius, 0.3*Math.min(...faces.map(f=>f.d)));
    const byV=new Map(); faces.forEach(f=>f.idx.forEach(v=>{if(!byV.has(v))byV.set(v,[]); byV.get(v).push(f);}));
    SV=new Map();
    for(const [v,fs] of byV){
      const A=new THREE.Matrix3().set(0,0,0,0,0,0,0,0,0), b=new THREE.Vector3(), e=A.elements;
      for(const f of fs){ const n=f.n, q=[n.x,n.y,n.z];
        for(let r=0;r<3;r++)for(let c=0;c<3;c++) e[c*3+r]+=q[r]*q[c];
        b.addScaledVector(n,f.d-R); }
      SV.set(v,{p:b.applyMatrix3(A.invert()), fs});
    }
    faces=faces.map(f=>({...f, pts:f.idx.map(v=>SV.get(v).p.clone().addScaledVector(f.n,R))}));
  }
  // flat faces
  faces.forEach((f,i)=>{
    const P=f.pts, n=f.n, m=P.length, p0=P[0], C=new THREE.Vector3(); let A=0;
    for(let k=1;k<m-1;k++){const a=new THREE.Vector3().subVectors(P[k],p0).cross(new THREE.Vector3().subVectors(P[k+1],p0)).length();
      C.add(new THREE.Vector3().add(p0).add(P[k]).add(P[k+1]).multiplyScalar(a/3)); A+=a;}
    C.multiplyScalar(1/A);
    let far=P[0]; P.forEach(p=>{if(p.distanceTo(C)>far.distanceTo(C)+1e-6) far=p;});
    const equi=P.every(p=>Math.abs(p.distanceTo(C)-far.distanceTo(C))<1e-4*far.distanceTo(C)+1e-6);
    const up=new THREE.Vector3().subVectors(far,C).normalize();
    if(m===4&&equi){ up.copy(new THREE.Vector3().subVectors(P[1],P[0]).cross(n).normalize()); }   // squares: edge-aligned, like real d6 pips
    if(atlas.layout!=='tips') up.applyAxisAngle(n,THREE.MathUtils.degToRad(numRot));   // corner numbers must keep pointing at their vertices
    const right=new THREE.Vector3().crossVectors(up,n);
    let r=1e9; for(let k=0;k<m;k++){const a=P[k],b=P[(k+1)%m],o=new THREE.Vector3().subVectors(b,a).cross(n).normalize();
      r=Math.min(r,-new THREE.Vector3().subVectors(C,a).dot(o));}
    const col=i%atlas.cols, row=Math.floor(i/atlas.cols), cu=(col+.5)/atlas.cols, cv=1-(row+.5)/atlas.rows;
    const opx=atlas.layout?(numSize/.65)*r/LAYOUT_UNIT[atlas.layout]:numSize*r/maxHD;                      // object units per atlas pixel: text box fits numSize * inradius
    curCell=[col/atlas.cols,1-(row+1)/atlas.rows,(col+1)/atlas.cols,1-row/atlas.rows];
    const put=(p,nn=n,rcv=0)=>{const d=new THREE.Vector3().subVectors(p,C); curRC=rcv; push(p,nn,cu+d.dot(right)/opx/(atlas.cols*atlas.cell), cv+d.dot(up)/opx/(atlas.rows*atlas.cell));};
    if(opts.filigree&&opts.filigree!=='none'&&atlas.layout!=='tips'){
      const poly=P.map(p=>{const d=new THREE.Vector3().subVectors(p,C); return [d.dot(right)/opx, d.dot(up)/opx];});
      drawFiligree(atlas,col,row,poly,r/opx,(panelF+.03)*r/opx,opts.filigree,opts.soft||3); }
    if(panelF>0){                                      // recessed panel: sloped rim wall + lowered floor
      const hP=(opts.panelDepth??.5)*.16*r, Cn=C.clone().addScaledVector(n,-hP), Q=P.map(p=>new THREE.Vector3().lerpVectors(C,p,1-panelF).addScaledVector(n,-hP));
      for(let k=0;k<m;k++){ const k2=(k+1)%m, a=P[k], b=P[k2];
        put(Cn,n,1); put(Q[k],n,1); put(Q[k2],n,1);
        const o=new THREE.Vector3().subVectors(b,a).cross(n).normalize(), rk=-new THREE.Vector3().subVectors(C,a).dot(o);
        const nw=n.clone().multiplyScalar(panelF*rk).addScaledVector(o,-hP).normalize();
        put(a,nw,0); put(b,nw,0); put(Q[k2],nw,1);  put(a,nw,0); put(Q[k2],nw,1); put(Q[k],nw,1); }
    } else for(let k=0;k<m;k++){put(C);put(P[k]);put(P[(k+1)%m]);}
  });
  curCell=[0,0,1,1];
  if(R>0){
    const BU=.001, BV=.999;                           // blank atlas corner: no paint, no bump
    const tri=(p0,n0,p1,n1,p2,n2)=>{ const c=new THREE.Vector3().subVectors(p1,p0).cross(new THREE.Vector3().subVectors(p2,p0));
      const avg=n0.clone().add(n1).add(n2); if(c.dot(avg)<0){[p1,p2]=[p2,p1];[n1,n2]=[n2,n1];}
      push(p0,n0,BU,BV);push(p1,n1,BU,BV);push(p2,n2,BU,BV); };
    const S=8, L=3, at=(v,n)=>SV.get(v).p.clone().addScaledVector(n,R);
    // edge strips
    const edges=new Map();
    faces.forEach(f=>f.idx.forEach((v,k)=>{const w=f.idx[(k+1)%f.idx.length], key=Math.min(v,w)+'_'+Math.max(v,w);
      if(!edges.has(key)) edges.set(key,{v,w,fs:[]}); edges.get(key).fs.push(f);}));
    for(const {v,w,fs} of edges.values()){ if(fs.length!==2) continue;
      for(let s=0;s<S;s++){ const na=slerp(fs[0].n,fs[1].n,s/S), nb=slerp(fs[0].n,fs[1].n,(s+1)/S);
        tri(at(v,na),na,at(w,na),na,at(w,nb),nb); tri(at(v,na),na,at(w,nb),nb,at(v,nb),nb); } }
    // vertex patches: spherical fan over the ordered face normals
    for(const [v,{p,fs}] of SV){
      const ax=p.clone().normalize(), e1=new THREE.Vector3().crossVectors(ax,Math.abs(ax.y)<.9?V(0,1,0):V(1,0,0)).normalize(), e2=new THREE.Vector3().crossVectors(ax,e1);
      const ns=fs.map(f=>f.n).sort((a,b)=>Math.atan2(a.dot(e2),a.dot(e1))-Math.atan2(b.dot(e2),b.dot(e1)));
      const c=ns.reduce((a,n)=>a.add(n),new THREE.Vector3()).normalize();
      const sub=(a,b,cc,l)=>{ if(l===0){tri(p.clone().addScaledVector(a,R),a,p.clone().addScaledVector(b,R),b,p.clone().addScaledVector(cc,R),cc);return;}
        const ab=a.clone().add(b).normalize(), bc=b.clone().add(cc).normalize(), ca=cc.clone().add(a).normalize();
        sub(a,ab,ca,l-1); sub(ab,b,bc,l-1); sub(ca,bc,cc,l-1); sub(ab,bc,ca,l-1); };
      ns.forEach((n,i)=>sub(n,ns[(i+1)%ns.length],c,L));
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('cellB',new THREE.Float32BufferAttribute(cb,4));
  g.setAttribute('rec',new THREE.Float32BufferAttribute(rc,1));
  if(opts.filigree&&opts.filigree!=='none'){ atlas.bump.needsUpdate=true; atlas.mask.needsUpdate=true; }
  return g;
}

