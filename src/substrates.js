// Substrates and palettes: SUBSTRATES, STONES, palette generators and the automatic number paint (4.1 factoring step S6). Marble palettes read the live state's stone through bindState(), which index.html calls right after it creates state.
import * as THREE from 'three';
import { pick } from './util.js';

/* ---------- substrates & palettes ---------- */
let liveState=null;   // the app's state object (main calls bindState once it exists): marble palettes follow the chosen stone
export function bindState(s){ liveState=s; }
export const hsl=(h,s,l)=>'#'+new THREE.Color().setHSL(((h%1)+1)%1,s,l).getHexString();
export const METALS=['#d4af37','#cfd3d8','#b87333','#a97142','#6b7280','#c9a24a','#8fa3b5'];
export const SUBSTRATES = {
  solid: {label:'Solid plastic',    mode:0, metal:0,  rough:.38, coat:.5, trans:0, flake:0,   brush:0,
          pal:r=>{const h=r();return [hsl(h,.6+r()*.3,.38+r()*.15),'#000000','#000000'];}},
  swirl: {label:'Swirled plastic',  mode:1, metal:0,  rough:.3,  coat:.8, trans:0, flake:0,   brush:0,
          pal:r=>{const h=r(),d=.08+r()*.3;return [hsl(h,.7,.42),hsl(h+d,.75,.55),hsl(h-d*(r()<.5?1:-1.6),.7,.68)];}},
  pearl: {label:'Metallic plastic', mode:1, metal:.75,rough:.3,  coat:.4, trans:0, flake:.35, brush:0,
          pal:r=>{const h=r();return [hsl(h,.6,.45),hsl(h+.05,.65,.32),hsl(h-.04,.5,.6)];}},
  metal: {label:'Solid metal',      mode:0, metal:1,  rough:.3,  coat:0,  trans:0, flake:0,   brush:.08,
          pal:r=>[pick(METALS,r),'#000000','#000000']},
  epoxy: {label:'Clear epoxy',      mode:3, metal:0,  rough:.05, coat:.4, trans:1, flake:0,  brush:0,
          pal:r=>{const h=r(),d=.06+r()*.2;return [hsl(h,.85,.5),hsl(h+d,.85,.6),hsl(h-d,.7,.78)];}},
  marble:{label:'Stone (marble, granite…)', mode:2, metal:0,  rough:.22, coat:.6, trans:0, flake:0,   brush:0,
          pal:r=>STONES[liveState.stone].pal(r)},
};
export const rnd=(r,a,b)=>a+(b-a)*r();
export const ACCENTS=['#c9a24a','#b0541f','#2f6f4f','#8a1c2b','#e8e4dc','#2b2d35','#7f9bd6','#b46a8a'];   // gold, rust, emerald, crimson, bone, charcoal, steel blue, rose
export const STONES = {
  marble:   {label:'Marble',            id:0, rough:.22, coat:.6,  pal:r=>{ const k=r();
    const [b1,b2]= k<.5?[hsl(rnd(r,.05,.15),.06,.93),hsl(rnd(r,.55,.7),.1,.72)] : k<.7?[hsl(rnd(r,.05,.1),.08,.1),hsl(.6,.1,.22)] : k<.85?[hsl(rnd(r,.36,.45),.35,.22),hsl(rnd(r,.36,.45),.3,.38)] : [hsl(rnd(r,.93,.99),.3,.82),hsl(rnd(r,.0,.08),.25,.68)];
    return [b1,b2, k<.7&&k>=.5 ? pick(['#c9a24a','#e8e4dc','#b0541f'],r) : pick(ACCENTS,r)]; }},
  granite:  {label:'Granite',           id:1, rough:.32, coat:.3,  pal:r=>{ const h=rnd(r,.0,.12), pink=r()<.4;
    return [pink?hsl(rnd(r,.0,.05),.3,.62):hsl(h,.05,.62), pink?hsl(.05,.22,.8):hsl(h,.04,.4), pick(['#1a1a1e','#3a2a22','#2a4a4a','#5a2a2a'],r)]; }},
  malachite:{label:'Malachite',         id:2, rough:.2,  coat:.7,  pal:r=>[hsl(rnd(r,.36,.42),.75,.08),hsl(rnd(r,.38,.46),.65,.26),pick(['#0a1f12','#9fd6b0','#3c7a58','#d8e6c8'],r)]},
  lapis:    {label:'Lapis lazuli',      id:3, rough:.25, coat:.5,  pal:r=>[hsl(rnd(r,.6,.67),.9,.1),hsl(rnd(r,.58,.66),.8,.15),pick(['#d4af37','#c0c4cc','#b87333','#e6c36a'],r)]},
  agate:    {label:'Agate / onyx',      id:4, rough:.12, coat:.8,  pal:r=>{ const h=r(), d=rnd(r,.04,.18); return [hsl(h,rnd(r,.3,.8),rnd(r,.25,.5)),hsl(h+d,rnd(r,.3,.8),rnd(r,.6,.85)),r()<.5?pick(ACCENTS,r):hsl(h+rnd(r,.3,.6),.7,.5)]; }},
  jasper:   {label:'Jasper',            id:5, rough:.28, coat:.5,  pal:r=>{ const sets=[[.0,.7,.24],[.06,.7,.32],[.11,.6,.38],[.33,.4,.2],[.02,.35,.18]]; const [h,s,l]=pick(sets,r);
    return [hsl(h,s,l),hsl(h+rnd(r,.04,.1),s,l+.12),r()<.6?hsl(h+rnd(r,-.1,.1),.6,.12):pick(ACCENTS,r)]; }},
  obsidian: {label:'Obsidian',          id:6, rough:.06, coat:.9,  pal:r=>[hsl(rnd(r,.6,.8),.15,.05),hsl(rnd(r,.7,.95),.3,.1),pick(['#c9a24a','#2fb8a8','#b04ad0','#d8dde6','#d0603a'],r)]},
  turquoise:{label:'Turquoise',         id:7, rough:.3,  coat:.4,  pal:r=>[hsl(rnd(r,.46,.52),.55,.58),hsl(rnd(r,.5,.57),.6,.45),pick(['#3a2a1c','#1c1c20','#8a6a2a','#5a3a2a'],r)]},
  amethyst: {label:'Amethyst',         id:8, rough:.06, coat:.9,  pal:r=>{ const h=rnd(r,.74,.8); return [hsl(h,rnd(r,.55,.75),rnd(r,.1,.17)),hsl(h+rnd(r,-.02,.03),rnd(r,.5,.7),rnd(r,.32,.46)),pick(['#efe6fa','#f7f3ff','#cdb8f0'],r)]; }},
  tigerseye:{label:"Tiger's eye",       id:9, rough:.3,  coat:.15, metal:.55, brush:.18, scaleMap:v=>v<=1.4?v:1.4+(v-1.4)*.2,   // stripes get busy fast: the top of the swirl-scale slider is squeezed into a narrow range
     // brushed-metal sheen: the chatoyance
     paint:'#f3e6c4', pal:r=>['#6b4f27','#7e5c00','#c88a28']},   // owner 2026-11-14 (PD-142.21.1): fixed preset colours with light cream numbers
  opal:     {label:'Opal',              id:10,rough:.1,  coat:.85, pal:r=>{ const dark=r()<.35;   // black opal or milky white/crystal opal
    return [dark?hsl(rnd(r,.55,.75),rnd(r,.2,.5),rnd(r,.05,.12)):hsl(rnd(r,.08,.15),rnd(r,.05,.2),rnd(r,.68,.8)), dark?hsl(rnd(r,.5,.7),rnd(r,.3,.5),rnd(r,.12,.22)):hsl(rnd(r,.5,.7),rnd(r,.15,.35),rnd(r,.5,.66)), pick(['#7fe0d0','#e07fc8','#8fb0ff','#f0c060'],r)]; }},
};
export const STONE_KEYS=Object.keys(STONES);
export const lum=hex=>{const c=new THREE.Color(hex),o={};c.getRGB(o,THREE.SRGBColorSpace);return .299*o.r+.587*o.g+.114*o.b;};
export function pickPaint(cols,sub,r,mode='auto'){
  if(mode==='random') return hsl(r(),.3+r()*.7,.1+r()*.8);
  const S=SUBSTRATES[sub], L=S.mode===0?lum(cols[0]):(lum(cols[0])+lum(cols[1]))/2;
  const hue=new THREE.Color(cols[0]).getHSL({}).h, light=L<.5;
  const ink=light?.88:.12;                              // lightness opposite the base => contrast
  const kind=r();
  if(kind<.4) return light?pick(['#f4f1e8','#f2c14e','#d9dde3'],r):pick(['#0b0b10','#2a1a12'],r);   // neutrals / metallics
  if(kind<.75) return hsl(hue+.5,.55+r()*.35,ink);       // complementary
  return hsl(hue+(r()<.5?.08:-.08),.6+r()*.3,light?.9:.1);   // analogous
}

