// Story dice tray (PD-160 spike): the swept dice as glyph tiles in a pool row, rings 1..n above them. Click a pool tile to fill the next ring, click a placed tile to send it back, drag onto a ring to place or (autoswap) swap.
// A pure view of the engine's `order` (ring -> die index or null): every change calls onOrder(newOrder) and the caller re-shows. DOM only; the 3D dice are hidden by the caller while the tray is up.
import { newArrangement, fillNext, removeDie, dropDie, poolOf } from './story.js';

const HUES=[200,20,140,280,50,170,330,100,240];
export function createStoryTray(host){
  const root=document.createElement('div'); root.id='storytray'; root.hidden=true; host.append(root);
  let tiles=[], rings=[], key='', cur=null, drag=null;
  const size=()=>Math.min(92,Math.max(46,root.clientWidth/((cur?cur.glyphs.length:5)+1.5))), W=()=>root.clientWidth, H=()=>root.clientHeight;
  const ringXY=(k,n)=>{ const s=size(), gap=Math.min(12,s*.15), tot=n*s+(n-1)*gap; return [(W()-tot)/2+k*(s+gap), H()*.2]; };
  const poolXY=(k,m)=>{ const s=size(), gap=10, tot=m*s+(m-1)*gap; return [(W()-tot)/2+k*(s+gap), H()*.62]; };
  const arr=()=>({n:cur.glyphs.length, rings:cur.order.slice()});
  const change=a=>{ if(cur) cur.onOrder(a.rings); };
  function build(){ root.textContent=''; const n=cur.glyphs.length;
    rings=[...Array(n).keys()].map(i=>{ const r=document.createElement('div'); r.className='sring'; r.textContent=i+1; root.append(r); return r; });
    tiles=cur.glyphs.map((g,i)=>{ const e=document.createElement('div'), h=HUES[i%9]; e.className='stile'+(g.tier==='o'||g.pack!=='noto'?' alt':''); e.style.setProperty('--hi',`hsl(${h} 55% 45%)`); e.style.setProperty('--lo',`hsl(${h} 60% 24%)`); e.dataset.i=i; e.title=g.n[0];
      e.innerHTML=`<svg viewBox="${g.vb}"><path d="${g.path}"/></svg>`; root.append(e); wire(e); return e; }); }
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
    show(o){ cur=o; const k=o.glyphs.map(g=>g.id).join('|'); root.hidden=false; if(k!==key||!tiles.length){ key=k; build(); } place(); },
    hide(){ root.hidden=true; cur=null; key=''; root.textContent=''; tiles=[]; rings=[]; drag=null; },
    get visible(){ return !root.hidden; }, root };
}
