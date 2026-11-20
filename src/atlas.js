// Number atlas: the bump and paint-mask canvases with the face numbers, pips or d4 tip numbers (4.1 factoring step S3).
import * as THREE from 'three';

/* ---------- number atlas (bump + paint mask) ---------- */
const LITE_CLIP=typeof location!=='undefined'&&new URLSearchParams(location.search).has('lite');
export const FONTS={ cinzel:{label:'Cinzel (classic)',css:'Cinzel,Georgia,serif',load:'700 100px Cinzel'}, metamorphous:{label:'Metamorphous (fantasy)',css:'Metamorphous,Georgia,serif',load:'400 100px Metamorphous'},
  uncial:{label:'Uncial Antiqua (runic)',css:'"Uncial Antiqua",Georgia,serif',load:'400 100px "Uncial Antiqua"'}, inter:{label:'Inter (clean sans)',css:'Inter,Arial,sans-serif',load:'800 100px Inter'},
  georgia:{label:'Georgia (serif)',css:'Georgia,serif',load:null}, mono:{label:'Courier (mono)',css:'"Courier New",monospace',load:null} };
export const PIPS={1:[[0,0]],2:[[-1,1],[1,-1]],3:[[-1,1],[0,0],[1,-1]],4:[[-1,1],[1,1],[-1,-1],[1,-1]],5:[[-1,1],[1,1],[0,0],[-1,-1],[1,-1]],6:[[-1,1],[1,1],[-1,0],[1,0],[-1,-1],[1,-1]]};
export const LAYOUT_UNIT={tips:80, pips:140};                 // atlas px that correspond to one face inradius (geometry scales to match)
// opts.layout: 'tips' -> opts.tips[i] = the 3 corner numbers of triangular face i; 'pips' -> labels are 1..6 drawn as dots
export function makeAtlas(N, labels, fontKey, soft, pad2, opts={}){      // pad2: percentile (tens) die prints 00, 10 ... 90
  const cols=Math.ceil(Math.sqrt(N)), rows=Math.ceil(N/cols), F=FONTS[fontKey]||FONTS.cinzel;
  let cell=opts.big?384:256;
  if(opts.big&&opts.numSize&&!opts.layout){      // PD-142.38.16: the filigree reaches the face corners (triangle circumradius = 2 x inradius); small print makes the face large in atlas px, so grow the cell until the corner fits
    const m=document.createElement('canvas').getContext('2d'), pxm=labels.some(l=>(pad2?String(l).padStart(2,'0'):String(l)).length>1)?112:136, wt=fontKey==='inter'?800:fontKey==='cinzel'?700:600;
    m.font=`${wt} ${pxm}px ${F.css}`; m.textAlign='center';
    let hd=1; for(const l of labels){ if(l&&typeof l==='object'){ hd=Math.max(hd,80); continue; } const t=(pad2?String(l).padStart(2,'0'):String(l))+(!pad2&&(l===6||l===9)?'.':''), b=m.measureText(t); hd=Math.max(hd,Math.hypot(b.actualBoundingBoxLeft+b.actualBoundingBoxRight,b.actualBoundingBoxAscent+b.actualBoundingBoxDescent)/2); }
    const need=2*2.1*hd/opts.numSize;                       // cell side so the farthest corner (2.1 x inradius, a little margin) stays inside
    cell=Math.min(Math.floor(4096/cols), 768, Math.max(384, Math.ceil(need/32)*32)); }
  if(opts.layout){
    const mk=bgc=>{const c=document.createElement('canvas'); c.width=cols*cell; c.height=rows*cell; const g=c.getContext('2d'); g.fillStyle=bgc; g.fillRect(0,0,c.width,c.height); return [c,g];};
    const [bc,bg]=mk('#fff'), [mc,mg]=mk('#000'), weight=fontKey==='inter'?800:fontKey==='cinzel'?700:600, px=72, D=LAYOUT_UNIT.tips, info=[];
    labels.forEach((lab,i)=>{
      const cx=(i%cols+.5)*cell, cy=(Math.floor(i/cols)+.5)*cell; info.push({halfDiag:1});
      for(const [g,fill,blur] of [[bg,'#000',soft],[mg,'#fff',0.6]]){
        g.fillStyle=fill; g.filter=blur?`blur(${blur}px)`:'none';
        if(opts.layout==='pips'){ for(const [px_,py_] of PIPS[lab]||[]){ g.beginPath(); g.arc(cx+px_*70,cy-py_*70,21,0,7); g.fill(); } }
        else for(let k=0;k<3;k++){                       // numbers sit in the corners, their tops pointing at the vertex
          const th=(90+120*k)*Math.PI/180, txt=String(opts.tips[i][k]);
          g.save(); g.translate(cx+D*Math.cos(th),cy-D*Math.sin(th)); g.rotate(-(th-Math.PI/2));
          g.font=`${weight} ${px}px ${F.css}`; g.textAlign='center'; const m=g.measureText(txt);
          g.fillText(txt,(m.actualBoundingBoxLeft-m.actualBoundingBoxRight)/2,(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2); g.restore(); }
        g.filter='none';
      }
    });
    const tex=c=>{const t=new THREE.CanvasTexture(c); t.anisotropy=8; return t;};
    return {bump:tex(bc), mask:tex(mc), cols, rows, cell, info, layout:opts.layout};
  }
  const mk=(bg)=>{const c=document.createElement('canvas'); c.width=cols*cell; c.height=rows*cell; const g=c.getContext('2d'); g.fillStyle=bg; g.fillRect(0,0,c.width,c.height); return [c,g];};
  const [bc,bg]=mk('#fff'), [mc,mg]=mk('#000'), info=[];
  const show=l=>pad2?String(l).padStart(2,'0'):String(l), px=labels.some(l=>show(l).length>1)?112:136, weight=fontKey==='inter'?800:fontKey==='cinzel'?700:600;
  labels.forEach((lab,i)=>{
    const cx=(i%cols+.5)*cell, cy=(Math.floor(i/cols)+.5)*cell;
    if(lab&&typeof lab==='object'&&lab.path){            // story dice (PD-160): a glyph label {id,path} is a 100x100 SVG path painted like a numeral (same bump and mask passes)
      /* the stroke after the fill adds a little weight: thin outline glyphs have to read at phone size */ const [vx,vy,gw,gh]=(lab.vb||'0 0 100 100').split(/[ ,]+/).map(Number), side=px*1.5, kk=side/Math.max(gw,gh), p2=lab._p2||(lab._p2=new Path2D(lab.path)); info.push({halfDiag:Math.hypot(side,side)/2});
      for(const [g,fill,blur] of [[bg,'#000',soft],[mg,'#fff',0.6]]){ g.save(); if(LITE_CLIP){ g.beginPath(); g.rect(cx-cell/2-8,cy-cell/2-8,cell+16,cell+16); g.clip(); } /* ?lite only (test-only profile): clipped to its cell, the blur's temporary layer is cell-sized instead of atlas-sized (seconds per build in software rendering). Not for production: it changes a few blur-edge values by 1 level, so the real render path is untouched */ g.fillStyle=fill; g.filter=blur?`blur(${blur}px)`:'none'; g.translate(cx-side/2+(side-gw*kk)/2,cy-side/2+(side-gh*kk)/2); g.scale(kk,kk); g.translate(-vx,-vy); g.fill(p2,'nonzero'); g.lineJoin='round'; g.lineWidth=Math.max(gw,gh)*.035; g.strokeStyle=fill; g.stroke(p2); g.restore(); g.filter='none'; }
      return; }
    let txt=show(lab); if(!pad2&&(lab===6||lab===9)) txt+='.';
    mg.font=`${weight} ${px}px ${F.css}`; mg.textAlign='center'; const m=mg.measureText(txt);   // align must be set before measuring or the first label is off-centre
    const w=m.actualBoundingBoxLeft+m.actualBoundingBoxRight, h=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
    info.push({halfDiag:Math.hypot(w,h)/2});            // text box half-diagonal in atlas px, used to fit it inside the face
    for(const [g,fill,blur] of [[bg,'#000',soft],[mg,'#fff',0.6]]){
      g.font=`${weight} ${px}px ${F.css}`; g.textAlign='center'; g.fillStyle=fill; g.filter=blur?`blur(${blur}px)`:'none';
      g.fillText(txt,cx+(m.actualBoundingBoxLeft-m.actualBoundingBoxRight)/2,cy+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);
      g.filter='none';
    }
  });
  const tex=c=>{const t=new THREE.CanvasTexture(c); t.anisotropy=8; return t;};
  return {bump:tex(bc), mask:tex(mc), cols, rows, cell, info};
}

