// Story dice tray (PD-160 spike): the swept dice as glyph tiles in a pool row, rings 1..n above them. Click a pool tile to fill the next ring, click a placed tile to send it back, drag onto a ring to place or (autoswap) swap.
// A pure view of the engine's `order` (ring -> die index or null): every change calls onOrder(newOrder) and the caller re-shows. DOM only; the 3D dice are hidden by the caller while the tray is up.
import { newArrangement, fillNext, removeDie, dropDie, poolOf } from './story.js';

const HUES=[200,20,140,280,50,170,330,100,240];
export function createStoryTray(host){
  const root=document.createElement('div'); root.id='storytray'; root.hidden=true;
  let ro=null;   // PD-174: lay out again whenever the stage changes size (full-view toggle, rotate, resize)
  let tiles=[], rings=[], key='', cur=null, drag=null;
  const NN=()=>cur?cur.glyphs.length:5, two=n=>n>5&&root.clientWidth<root.clientHeight*1.1, per=n=>two(n)?Math.ceil(n/2):n;   // PD-174: two rows only in portrait / narrow; a landscape screen keeps one row even for 9 dice
     // more than 5 dice: the rings and the pool each split into two roughly even rows, so they stay on screen on a phone
  const size=()=>{ const n=NN(), m=per(n), w=(root.clientWidth*.97-(m-1)*12)/m, hcap=two(n)?(root.clientHeight*.88-60)/4.5:root.clientHeight*.3;
    return cur&&cur.dice3d?Math.min(210,hcap,Math.max(40,w)):Math.min(92,hcap,Math.max(40,root.clientWidth/(m+1.5))); },   // 3D dice are shown large (up to 210 px), limited by the row width and the tray height
  W=()=>root.clientWidth, H=()=>root.clientHeight;
  const rowOf=(k,t)=>{ const a=Math.ceil(t/2); return k<a?{row:0,i:k,c:a}:{row:1,i:k-a,c:t-a}; };   // position k of t items -> row, index in row, items in that row
  const ringY=()=>H()*(two(NN())?.12:.2);
  const ringXY=(k,n)=>{ const s=size(), gap=Math.min(12,s*.15), r=two(n)?rowOf(k,n):{row:0,i:k,c:n}, tot=r.c*s+(r.c-1)*gap; return [(W()-tot)/2+r.i*(s+gap), ringY()+r.row*s*1.08]; };
  const poolXY=(k,m)=>{ const s=size(), gap=10, n=NN(), r=two(n)&&m>per(n)?rowOf(k,m):{row:0,i:k,c:m}, tot=r.c*s+(r.c-1)*gap;
    const base=two(n)?ringY()+2*s*1.08+s*.2:(cur&&cur.dice3d?Math.max(H()*.2+s*1.1,Math.min(H()*.62,H()-s-80)):H()*.62);
    return [(W()-tot)/2+r.i*(s+gap), base+r.row*s*1.08]; };
  const arr=()=>({n:cur.glyphs.length, rings:cur.order.slice()});
  const change=a=>{ if(cur) cur.onOrder(a.rings); };
  function build(){ root.textContent=''; const n=cur.glyphs.length;
    rings=[...Array(n).keys()].map(i=>{ const r=document.createElement('div'); r.className='sring'; r.textContent=i+1; root.append(r); return r; });
    tiles=cur.glyphs.map((g,i)=>{ const e=document.createElement('div'), h=HUES[i%9]; e.className='stile'+(g.tier==='o'||g.pack!=='noto'?' alt':''); e.style.setProperty('--hi',`hsl(${h} 55% 45%)`); e.style.setProperty('--lo',`hsl(${h} 60% 24%)`); e.dataset.i=i; e.title=g.n[0];
      if(cur.dice3d) e.classList.add('ghost'); else e.innerHTML=`<svg viewBox="${g.vb}"><path d="${g.path}"/></svg>`;   // 3D mode: the tile is an invisible hit target; the real die is drawn under it by the scene
      root.append(e); wire(e); return e; }); }
  function place(){ const n=cur.glyphs.length, s=size(), a=arr(), pool=poolOf(a); root.style.setProperty('--s',s+'px');
    rings.forEach((r,k)=>{ const [x,y]=ringXY(k,n); r.style.left=x+'px'; r.style.top=y+'px'; });
    tiles.forEach((e,i)=>{ if(drag&&drag.el===e) return; const k=a.rings.indexOf(i), [x,y]=k>=0?ringXY(k,n):poolXY(pool.indexOf(i),pool.length); e.style.left=x+'px'; e.style.top=y+'px'; e.classList.toggle('placed',k>=0); }); }
  const hit=e=>{ const s=size(), cx=parseFloat(e.style.left)+s/2, cy=parseFloat(e.style.top)+s/2; let best=-1, bd=s*.6; rings.forEach((r,j)=>{ const [x,y]=ringXY(j,rings.length), d=Math.hypot(cx-(x+s/2),cy-(y+s/2)); if(d<bd){ bd=d; best=j; } }); return best; };
  function wire(e){ let moved=false, ox=0, oy=0, sx=0, sy=0;
    e.addEventListener('pointerdown',ev=>{ if(cur.locked) return; e.setPointerCapture(ev.pointerId); moved=false; sx=ev.clientX; sy=ev.clientY; const b=e.getBoundingClientRect(); ox=ev.clientX-b.left; oy=ev.clientY-b.top; });
    e.addEventListener('pointermove',ev=>{ if(!e.hasPointerCapture(ev.pointerId)) return; if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<6) return; moved=true; drag={el:e}; e.classList.add('drag'); const m=root.getBoundingClientRect(); e.style.left=(ev.clientX-ox-m.left)+'px'; e.style.top=(ev.clientY-oy-m.top)+'px'; const k=hit(e); rings.forEach((r,j)=>r.classList.toggle('hot',j===k)); });
    e.addEventListener('pointerup',()=>{ if(!cur||cur.locked) return; const i=+e.dataset.i, a=arr(); rings.forEach(r=>r.classList.remove('hot'));
      let next; if(!moved) next=a.rings.includes(i)?removeDie(a,i):fillNext(a,i); else { const k=hit(e); next=k>=0?dropDie(a,i,k,{autoswap:cur.autoswap!==false}):removeDie(a,i); }
      e.classList.remove('drag'); drag=null; moved=false; change(next); place(); }); }
  return {
    /* o: {glyphs:[glyph objects per die], order:[ring -> die|null], onOrder(order), autoswap, locked} */
    show(o){ if(!root.isConnected) host.append(root); if(!ro&&window.ResizeObserver){ ro=new ResizeObserver(()=>{ if(cur&&!root.hidden&&!drag) place(); }); ro.observe(root); } cur=o; const k=o.glyphs.map(g=>g.id).join('|')+(o.dice3d?'|3d':''); root.hidden=false; if(k!==key||!tiles.length){ key=k; build(); } place(); },
    hide(){ root.hidden=true; cur=null; key=''; root.textContent=''; tiles=[]; rings=[]; drag=null; },
    get visible(){ return !root.hidden; }, get size(){ return cur?size():0; }, get tiles(){ return tiles; }, get rings(){ return rings; }, root };
}
