import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import * as GAMES from 'pd-games';   // pure rules engine (docs/design/games-engine.md); the app rolls the dice, the engine scores them
import { PHI, mulberry32, pick, range } from './util.js';
import { SHAPES, assignLabels, hull } from './polyhedra.js';
import { FONTS, makeAtlas } from './atlas.js';
import { buildGeometry } from './geometry.js';
import { U, makeMaterial, makeUniforms } from './material.js';
import { STONES, STONE_KEYS, SUBSTRATES, bindState, hsl, pickPaint } from './substrates.js';
import { LOG_MAX, canonD, designOK, emptyBag, parseBag, slug, thumbKey, uniqueId, uniqueName } from './bagmodel.js';
import { GLASS_FM, MAT_HARD, RING } from './sound-tables.js';
import { SB, audioInit as audioInitM, audioStatus, hardnessFor, makeLimiter, makeSpatial, onImpact, playBlip, playChime, playFumble, playImpactNow, ringFor, rollTick, setSoundBackend, setVolume, sfx, tone, initSound, updateRolling, wrapAudioInit } from './sound.js';
import { FACE_SIDES, dealError, dealTerms, faceName, fmtFaces, parseFaceBlock } from './faces.js';
import { GLYPH_BY_ID, PACK_LIST, adLibFor, dealGlyphs, fingerprint, hintFor, poolFor, sentenceFor, setStorySecret } from './story.js';
import { createStoryTray } from './storyui.js';
import { STORY_MAX, STORY_MIN, STORY_SIDES, draftError, draftFormula, draftOf, draftTerm, gameReady, isStorySet, newDraft, previewOf, summaryOf } from './storysets.js';
let audioInit=audioInitM;   // reassigned by the lag monitor hook below (the sound module's own copy is wrapped through wrapAudioInit)

/* ---------- utils ---------- */
const SEED=+new URLSearchParams(location.search).get('seed')||0; let rng=SEED?mulberry32(SEED):Math.random;   // ?seed=N: reproducible looks and rolls (tests); audio and particle jitter stay on Math.random
/* ---------- scene ---------- */
const __bs=async(l,f)=>{ if(window.__bootStage){ window.__bootStage(l,f); await window.__bootYield(); } };   // boot progress: label + fraction, then let the browser paint it
await __bs('Setting up the 3D scene',.30);
const stage=document.getElementById('stage');
const LITE=new URLSearchParams(location.search).has('lite');   // ?lite: test-only render profile (PD-178): no MSAA, no shadow pass, and the animation loop does not draw (physics, state and DOM run as usual; __pd.renderOnce still draws, which is what tests that read pixels call)
const renderer=new THREE.WebGLRenderer({antialias:!LITE});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=!LITE; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.5;
stage.prepend(renderer.domElement);
const scene=new THREE.Scene();
{ const c=document.createElement('canvas'); c.width=c.height=512; const g=c.getContext('2d');
  const gr=g.createRadialGradient(256,230,20,256,256,380); gr.addColorStop(0,'#262b3a'); gr.addColorStop(1,'#0b0c11');
  g.fillStyle=gr; g.fillRect(0,0,512,512);
  // broad, very soft light bands (like studio strip lights): gives glass something gentle to refract without looking busy
  for(const [x0,w,a0] of [[120,70,.05],[330,110,.04],[450,50,.035]]){ const lg=g.createLinearGradient(x0-w,0,x0+w,0);
    lg.addColorStop(0,'rgba(190,205,240,0)'); lg.addColorStop(.5,`rgba(190,205,240,${a0})`); lg.addColorStop(1,'rgba(190,205,240,0)');
    g.save(); g.translate(256,256); g.rotate(.35); g.translate(-256,-256); g.fillStyle=lg; g.fillRect(-200,-200,912,912); g.restore(); }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; scene.background=t; }
await __bs('Building the lighting',.40);
scene.environment=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),0.04).texture;
const key=new THREE.DirectionalLight(0xffffff,1.6); key.position.set(3,6,4); key.castShadow=true; key.shadow.mapSize.set(2048,2048); key.shadow.bias=-.0004; key.shadow.normalBias=.03;
Object.assign(key.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:.5,far:30}); scene.add(key);
const TABLE_Y=-1.6;
const table=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  const gr=g.createRadialGradient(128,128,40,128,128,128);gr.addColorStop(0,'#fff');gr.addColorStop(1,'#000');g.fillStyle=gr;g.fillRect(0,0,256,256);
  const m=new THREE.Mesh(new THREE.CircleGeometry(7.5,64),new THREE.MeshStandardMaterial({color:0x1b2b24,roughness:.95,metalness:0,alphaMap:new THREE.CanvasTexture(c),transparent:true,opacity:0}));
  m.rotation.x=-Math.PI/2; m.position.y=TABLE_Y-.002; m.receiveShadow=true; m.visible=false; scene.add(m); return m;})();
const camera=new THREE.PerspectiveCamera(32,1,.3,600); camera.position.set(0,0,5.4);
const rig=new THREE.Group(); scene.add(rig);

/* ---------- state (persisted to localStorage) ---------- */
const $=id=>document.getElementById(id);
/* PD-169 gravity. Calibration: every die is normalised to circumradius 1 world unit; a d20/d12 face to face is then 2 x inradius = 2 x .7947 = 1.5894 u, and the owner measured that as 20 mm,
   so 1 m = 79.47 u and realistic gravity (9.81 m/s2) = 779.6 u/s2. The old fixed -34 u/s2 is therefore 0.0436 x realistic (a slow, floaty roll). The slider is log (x = LO * (HI/LO)^p) and shows the multiple of realistic. */
const GRAV_U_PER_M=2*0.79465447/0.02, GRAV_REAL=9.81*GRAV_U_PER_M, GRAV_OLD=34, GRAV_DEF=GRAV_OLD/GRAV_REAL;
const GRAV_LO=1/64, GRAV_HI=2;   // today's feel (.0436x, about 1/23) lies below the owner's .25x, so the range runs from 1/64x up to 2x realistic (the owner's .25x..2x sits inside); 128x of log range
/* PD-169 rework, measured: a die dropped 10 u in the live sim takes 0.7666 s at -34 u/s2 vs sqrt(2h/g)=0.7670 s (world.step(1/60,dt,4): no time scale, no speed multiplier; damping .04/s is negligible), so the 0.0436x factor is exact: at true 1x a 20 mm d20 falls 16 u (0.2 m) in 0.2 s and today's table is about 4.8x slower than real life in time (1/23 the gravity). A throw is scaled by throwK() so it covers the same path at any gravity. */
const gravFromPos=p=>GRAV_LO*Math.pow(GRAV_HI/GRAV_LO,Math.max(0,Math.min(1,p))), gravToPos=x=>Math.log(Math.max(GRAV_LO,Math.min(GRAV_HI,x))/GRAV_LO)/Math.log(GRAV_HI/GRAV_LO);
const DEFAULTS={gravity:GRAV_DEF, shape:'d20', substrate:'swirl', palettes:{}, paint:'#ffffff', paintMode:'auto', scale:1.6, radius:.04, font:'cinzel',
  shake:false, numSize:.65, numRot:0, d4Style:'tips', d6Style:'numbers', panel:0, panelDepth:.5, numRaised:false, numPaint:true, patina:0, filigree:'none', filiFill:true, enamelSame:true, enamel:'#c9a24a', numDepth:2.2, numSoft:3, spin:.3, bounce:.4, fricDice:.15, fricMat:.2, zoom:1, rollZoom:1, glitter:.5, bubbles:.3, clarity:.6, randshape:false, sound:false, soundBk:'mix', soundMix:.9, soundMixMode:'layer', surfaceMat:'leather', ringLevel:.5, spatialWidth:.5, rumble:false, volume:.6, inclusion:'none', inclSize:.7, inclTurn:35, inclY:0, polish:.5, stone:'marble', stoneAccent:.5, notation:'2d6+d20+3', off:[11,23,37], seed:1, randsub:true, expsize:'2048'};
const state=structuredClone(DEFAULTS); bindState(state);
const STORE='prettydice.v1', BAG_STORE='prettydice.bag.v1';
let bag=null;   // the dice bag (see docs/design/dice-bag-design.md); null until boot builds or restores it
const ICON_PAUSE='<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>', ICON_PLAY='<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>';
let spinLast=.3;
const ICON_SND_ON='<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>', ICON_SND_OFF='<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
if(new URLSearchParams(location.search).get('reset')){ try{ localStorage.removeItem(STORE); }catch{} history_replace_clean(); }
function history_replace_clean(){ try{ window.history.replaceState(null,'',location.pathname); }catch{} }
try{ const saved=JSON.parse(localStorage.getItem(STORE)||'{}');
  for(const k of Object.keys(DEFAULTS)) if(k in saved && typeof saved[k]===typeof DEFAULTS[k] && saved[k]!==null) state[k]=saved[k];   // ignore wrongly-typed or corrupt values
  if(!Array.isArray(state.off)||state.off.length!==3) state.off=[...DEFAULTS.off];
  if(Array.isArray(state.palettes)) state.palettes={};
}catch{}
function save(){ try{ const {colors,...rest}=lookSnap?{...state,...JSON.parse(lookSnap)}:state; localStorage.setItem(STORE,JSON.stringify(rest)); }catch{} saveBag(); scheduleBagUI(); }
/* One palette (3 colours) is shared by every substrate and stone type, so switching substrate keeps the colours (PD-61).
   Only Randomize makes new colours, using the logic of the substrate that is active at that moment (metal picks a metal, a stone picks its own palette).
   Substrates that use fewer than 3 colours (solid plastic, metal) still get 3, so every other substrate has a full set to show.
   Colours edited here, or made while another substrate was active, apply to metal and stone even when outside their usual range. */
const palKey=()=>'shared';
function freshPalette(sub,r){ const p=[...SUBSTRATES[sub].pal(r)];
  if(SUBSTRATES[sub].mode===0){ const o={}; new THREE.Color(p[0]).getHSL(o); const d=.08+r()*.3; p[1]=hsl(o.h+d,.7,.55); p[2]=hsl(o.h-d*(r()<.5?1:-1.6),.7,.68); }   // the unused slots get harmony colours of the first
  return p; }
function ensurePalette(r){ if(!state.palettes.shared){    // first run, or saved data from the per-substrate days: adopt the active substrate's old palette
    const old=state.palettes[state.substrate==='marble'?'marble:'+state.stone:state.substrate]||Object.values(state.palettes).find(v=>Array.isArray(v)&&v.length===3);
    state.palettes.shared=old?[...old]:freshPalette(state.substrate,r||mulberry32(state.seed)); }
  state.colors=state.palettes.shared; }
function setSubstrate(id,r){ state.substrate=id; ensurePalette(r); }
function setStone(t){ state.stone=STONES[t]?t:'marble'; ensurePalette(); }   // colours stay; only the stone pattern changes
if(!STONES[state.stone]) state.stone='marble';
if(state.inclusion==='custom') state.inclusion='none';   // custom models are not persisted (unknown built-in names are checked once MODELS exists, at startup)
setSubstrate(SUBSTRATES[state.substrate]?state.substrate:'swirl');
if(!SHAPES[state.shape]) state.shape='d20';
let dice=[], baseZ=5.4, customZoom=13, needHalfW=0, customHalfW=0;   // needHalfW: half-width the layout needs on screen

const TENS=range(0,9).map(n=>n*10);
const SET7=[['d4',-2.27,1.25],['d6',0,1.25],['d8',2.27,1.25],['d10',-3.4,-1.25],['dpct',-1.13,-1.25],['d12',1.13,-1.25],['d20',3.4,-1.25]];   // 3 on top; bottom row d10, d%, d12, d20
const SIDES={4:'d4',6:'d6',8:'d8',10:'d10',12:'d12',14:'d14',16:'d16',20:'d20'}, MAXDICE=24;
/* A design in notation is written @id with its dashes as underscores (d20@amethyst_2), because a dash in the text means minus. */
const designRef=id=>id.replace(/-/g,'_');
const designByRef=r=>bag&&bag.designs.find(d=>designRef(d.id)===r);
/* "4d6 + 6d10@bone + 3" -> {terms:[{count,sides,design?}], mod}. strict: an @design that is not in the bag is an error (typed text); stored text just drops it. */
function parseNotation(str,strict=false){
  const terms=[]; let mod=0, n=0, group=1;
  { const gm=String(str).toLowerCase().match(/^\s*(\d+)\s*[x×]\s*(.*)$/); if(gm){ group=+gm[1]; str=gm[2]; if(group<2) return {error:'A group needs 2 or more rolls, e.g. 4x d20+2'}; } }   /* PD-142.14.1.2: "4x d20+2" = four separate rolls of d20+2 */
  { const am=String(str).toLowerCase().match(/^(.*[+-]\s*\d+)\s*(adv|dis)\s*$/); if(am&&/(^|[^\d])d20(?!\d)/.test(am[1])) str=am[1].replace(/(^|[^\d])d20(?!\d)/,'$1d20'+am[2]); }   /* PD-142.14.2.1.1: "d20+5 adv" = "d20adv+5" */
  const toks=String(str).toLowerCase().replace(/\s+/g,'').replace(/-/g,'+-').split('+').filter(Boolean);
  if(!toks.length) return {error:'Enter some dice, e.g. 4d6+2d10+3'};
  for(const t of toks){
    let m;
    if((m=t.match(/^(\d*)d(\d+|%)(?:(kh|kl|dh|dl)(\d*)|(adv|dis))?(?:\{([^{}]*)\})?(?:@([a-z0-9_]+))?$/))){ let count=m[1]===''?1:+m[1]; const sides=m[2]==='%'?100:+m[2]; let design=null, keep=null;
      if(m[5]){ if(count>1||sides!==20) return {error:`"${m[5]}" goes on a single d20, e.g. d20${m[5]}`}; count=2; keep={mode:m[5]==='adv'?'h':'l',n:1}; }   /* PD-142.2: d20adv = 2d20kh1, d20dis = 2d20kl1 */
      else if(m[3]){ const q=m[4]===''?1:+m[4], dropping=m[3][0]==='d', n=dropping?count-q:q;
        if(q<1||n<1||n>count) return {error:dropping?`Can't drop ${q} of ${count} dice`:`Can't keep ${q} of ${count} dice`};
        keep=n===count?null:{mode:(m[3][1]==='h')===!dropping?'h':'l',n}; }   // kh3 keeps the highest 3; dl1 drops the lowest 1 = keeps the highest count-1
      if(m[7]){ const e=designByRef(m[7]); if(e) design=e.id; else if(strict&&bag) return {error:`No design "@${m[7]}" in the bag`}; }
      let faces=null;   /* PD-167: a face block {pack#n!flags} puts glyphs from a pack on the faces (docs/design/custom-set-grammar.md) */
      if(m[6]!==undefined){ if(sides===100) return {error:"Custom faces don't work on d% (two dice); use d10"}; if(!FACE_SIDES.includes(sides)) return {error:`Custom faces are not supported on d${sides} yet (use d6, d8, d12 or d20)`};
        const fb=parseFaceBlock(m[6]); if(fb.error) return fb; faces=fb.faces; }
      if(!(sides in SIDES)&&sides!==100) return {error:`d${m[2]} not supported (use d4 d6 d8 d10 d%/d100 d12 d14 d16 d20)`};
      if(count<1) return {error:'Dice count must be at least 1'}; n+=count*(sides===100?2:1); terms.push({count,sides,...(design?{design}:{}),...(keep?{keep}:{}),...(faces?{faces}:{})}); }
    else if(/^-?\d+$/.test(t)) mod+=+t;
    else return {error:`Can't read "${t}"`};
  }
  if(!terms.length) return {error:'Add at least one die'};
  if(n*group>MAXDICE) return {error:`Too many dice (${n*group}); max ${MAXDICE}`};
  { const de=dealError(terms); if(de) return {error:de}; }
  return group>1?{terms,mod,group}:{terms,mod};
}
const keepTxt=t=>t.keep?`k${t.keep.mode}${t.keep.n}`:'';
const fmtNotation=(terms,mod,group)=>(group>1?group+'x ':'')+terms.map(t=>`${t.count}d${t.sides===100?'%':t.sides}${keepTxt(t)}${t.faces?fmtFaces(t.faces):''}${t.design?'@'+designRef(t.design):''}`).join('+')+(mod?(mod>0?'+':'')+mod:'');
/* keep-highest / keep-lowest (PD-142.2): the dice that count and the ones set aside; ties keep the earlier die */
function keepSum(vals,keep){ const idx=vals.map((_,i)=>i); if(keep&&keep.n<vals.length) idx.sort((a,b)=>keep.mode==='h'?vals[b]-vals[a]||a-b:vals[a]-vals[b]||a-b);
  const kept=new Set(keep&&keep.n<vals.length?idx.slice(0,keep.n):idx); return {sum:vals.reduce((a,v,i)=>a+(kept.has(i)?v:0),0),kept}; }
const keepLine=(t,vals,ks,names,noSum)=>`${t.count}d${t.sides===100?'%':t.sides}${keepTxt(t)}: ${vals.map((v,i)=>{ const s=names&&names[i]?names[i]+'='+v:v; return ks.kept.has(i)?s:`(${s})`; }).join(names?' + ':'+')}${vals.length>1&&!noSum?' = '+ks.sum:''}`;   // noSum: glyph-only dice have no meaningful total. names: glyph names beside the values (PD-167)
const isMulti=()=>state.shape==='set7'||state.shape==='custom';
function gridLayout(n){ const cols=n===1?1:Math.ceil(Math.sqrt(n*1.5)), rows=Math.ceil(n/cols), sp=2.5;
  return {pos:i=>[(i%cols-(Math.min(cols,n)-1)/2)*sp, ((rows-1)/2-Math.floor(i/cols))*sp], halfW:((Math.min(cols,n)-1)*sp)/2+1.4, zoom:Math.max(5.4,1.45*((Math.min(cols,n)-1)*sp+2),2.6*((rows-1)*sp+2))}; }
function specsFor(shape){
  if(shape==='custom'){
    const p=parseNotation(state.notation), list=[];
    if(p.error) return specsFor('d20');
    const dealt=dealTerms(p.terms);   // PD-167: glyph faces from the set's face blocks (a group's copies share them)
    for(let cp=0;cp<(p.group||1);cp++) p.terms.forEach((t,ti)=>{ for(let c=0;c<t.count;c++){
      if(t.sides===100){ list.push({id:'d10',labels:TENS,name:'d%',term:ti,copy:cp,part:'tens',design:t.design}, {id:'d10',labels:null,name:'d10',term:ti,copy:cp,part:'ones',design:t.design}); }
      else list.push({id:SIDES[t.sides],labels:null,name:SIDES[t.sides],term:ti,copy:cp,design:t.design,setGlyphs:dealt[ti]?dealt[ti][c]:null}); } });
    const L=gridLayout(list.length); customZoom=L.zoom; customHalfW=L.halfW;
    return list.map((d,i)=>({verts:SHAPES[d.id].verts(),labels:d.labels||SHAPES[d.id].labels,x:L.pos(i)[0],y:L.pos(i)[1],name:d.name,term:d.term,copy:d.copy,part:d.part,design:d.design,glyphs:d.setGlyphs||(storyDeal&&storyDeal.glyphs[i]&&storyDeal.glyphs[i].length===SHAPES[d.id].labels.length?storyDeal.glyphs[i]:null)}));
  }
  const mk=(id,x,y,labels,name)=>({verts:SHAPES[id].verts(),labels:labels||SHAPES[id].labels,x,y,name:name||id});
  if(shape==='set7') return SET7.map(([id,x,y])=>id==='dpct'?mk('d10',x,y,TENS,'d%'):mk(id,x,y));
  if(SHAPES[shape].pair) return [mk('d10',-1.2,0,TENS,'d%'), mk('d10',1.2,0,null,'d10')];
  return [mk(shape,0,0)];
}
/* ---------- inclusion: a miniature model cast inside clear epoxy ---------- */
const M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.45,...o});
const SPH=new THREE.SphereGeometry(1,48,32);
const mesh=(geo,mat,p=[0,0,0],sc=[1,1,1],rot=[0,0,0])=>{ const m=new THREE.Mesh(geo,mat); m.position.set(...p); m.scale.set(...sc); m.rotation.set(...rot); return m; };
function starShape(n,outer,inner){ const sh=new THREE.Shape(); for(let i=0;i<n*2;i++){ const r=i%2?inner:outer, a=Math.PI/2+i*Math.PI/n; i?sh.lineTo(Math.cos(a)*r,Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,Math.sin(a)*r); } sh.closePath(); return sh; }
function makeEye(o){                                    // eyeball with iris rings and a slit pupil, looking along +z
  const g=new THREE.Group(), cap=(r,theta,mat,sx=1)=>{ const geo=new THREE.SphereGeometry(r,48,24,0,Math.PI*2,0,theta); geo.scale(sx,1,1); geo.rotateX(Math.PI/2); g.add(new THREE.Mesh(geo,mat)); };
  g.add(mesh(SPH,M(o.sclera,{roughness:.3})));
  cap(1.004,1.0,M(o.limbus)); cap(1.008,.9,M(o.iris,{emissive:o.iris,emissiveIntensity:.2})); cap(1.012,.58,M(o.inner,{emissive:o.inner,emissiveIntensity:.25}));
  cap(1.016,.66,M(0x040404,{roughness:.2}),o.slit); return g;
}
function makeDuck(){                                   // original procedural rubber duck (no third-party asset)
  const g=new THREE.Group(), yellow=M(0xd98a00,{roughness:.42}), orange=M(0xd24a00), black=M(0x0a0a0a,{roughness:.15}), white=M(0xffffff,{roughness:.3});
  const add=(geo,mat,p,sc,rot)=>g.add(mesh(geo,mat,p,sc,rot));
  add(SPH,yellow,[0,0,0],[.95,.8,1.25]);                          // body
  add(new THREE.ConeGeometry(.42,1,32),yellow,[0,.42,-1.25],[1,1,.7],[-1.9,0,0]);   // upturned tail
  add(SPH,yellow,[0,1.0,.5],[.66,.62,.64]);                       // head
  add(SPH,yellow,[.84,.1,-.1],[.17,.45,.75],[0,0,-.3]); add(SPH,yellow,[-.84,.1,-.1],[.17,.45,.75],[0,0,.3]);   // wings
  add(SPH,orange,[0,.9,1.1],[.34,.11,.34]); add(SPH,orange,[0,.8,1.08],[.28,.07,.28]);                            // beak (upper, lower)
  for(const x of [.26,-.26]){ add(SPH,black,[x,1.15,1.0],[.1,.12,.08]); add(SPH,white,[x*1.05,1.19,1.07],[.03,.03,.03]); }   // eyes + glints
  return g;
}
function makeCatEye(){ return makeEye({sclera:0xe9e2c4,limbus:0x2a3a10,iris:0x7fc21e,inner:0xe8e23a,slit:.2}); }
function makeDragonEye(){ const g=makeEye({sclera:0xd9962a,limbus:0x3a0a05,iris:0xc8260f,inner:0xff9a1f,slit:.13});
  g.add(mesh(SPH,M(0x5a1a10,{roughness:.6}),[0,.9,.3],[.9,.2,.45],[.5,0,0]));                                 // brow ridge
  return g; }
function makeCoin(){ const g=new THREE.Group(), gold=M(0xe0a915,{metalness:.6,roughness:.38,emissive:0x6a4500,emissiveIntensity:.9});
  const disc=new THREE.CylinderGeometry(1,1,.14,72); disc.rotateX(Math.PI/2); g.add(mesh(disc,gold));
  for(const z of [.07,-.07]) g.add(mesh(new THREE.TorusGeometry(.93,.05,12,72),gold,[0,0,z]));
  const st=new THREE.ExtrudeGeometry(starShape(5,.55,.24),{depth:.05,bevelEnabled:false}); g.add(mesh(st,gold,[0,0,.07])); g.add(mesh(st,gold,[0,0,-.12],[1,1,1],[0,Math.PI,0]));
  for(const z of [.075,-.075]) g.add(mesh(new THREE.TorusGeometry(.7,.025,8,64),gold,[0,0,z]));
  g.rotation.x=.25; const w=new THREE.Group(); w.add(g); return w; }
function makeBlackCat(){ const g=new THREE.Group(), fur=M(0x15151b,{roughness:.55}), glow=M(0x9cff3a,{emissive:0x7acc20,emissiveIntensity:.9}), pink=M(0xd98aa0);
  g.add(mesh(SPH,fur,[0,0,0],[.8,1.0,.72]));                                                    // body
  g.add(mesh(SPH,fur,[0,1.25,.12],[.58,.52,.52]));                                              // head
  for(const x of [.3,-.3]){ g.add(mesh(new THREE.ConeGeometry(.2,.46,4),fur,[x,1.72,.05],[1,1,.6],[0,Math.PI/4,x>0?-.18:.18]));   // ears
    g.add(mesh(SPH,glow,[x*.9,1.3,.55],[.12,.1,.06])); g.add(mesh(SPH,M(0x000000),[x*.9,1.3,.6],[.03,.09,.03]));                  // eyes with slit pupils
    g.add(mesh(SPH,fur,[x*.8,-.8,.5],[.2,.18,.32])); }                                                                                  // front paws
  g.add(mesh(SPH,pink,[0,1.15,.62],[.07,.05,.05]));                                              // nose
  const tail=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.6,-.6),new THREE.Vector3(-.1,-.5,-1.15),new THREE.Vector3(-.3,.1,-1.3),new THREE.Vector3(-.2,.8,-1.05)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(tail,24,.12,10),fur)); return g; }
function makeSkull(){ const g=new THREE.Group(), bone=M(0xe6dfc9,{roughness:.5}), dark=M(0x0b0b0b,{roughness:.9});
  g.add(mesh(SPH,bone,[0,.2,0],[.95,.9,1.0])); g.add(mesh(SPH,bone,[0,-.75,.2],[.58,.34,.55]));
  for(const x of [.38,-.38]) g.add(mesh(SPH,dark,[x,.1,.82],[.27,.3,.2]));
  g.add(mesh(new THREE.ConeGeometry(.12,.3,3),dark,[0,-.3,.9],[1,1,.5],[Math.PI,0,0]));
  for(let i=-2;i<=2;i++) g.add(mesh(new THREE.BoxGeometry(.13,.2,.08),M(0xf0ead8),[i*.15,-.95,.68]));
  return g; }
function makeHeart(){ const sh=new THREE.Shape(); sh.moveTo(0,-1); sh.bezierCurveTo(-.2,-.75,-1,-.25,-1,.3); sh.bezierCurveTo(-1,.85,-.35,1,0,.55); sh.bezierCurveTo(.35,1,1,.85,1,.3); sh.bezierCurveTo(1,-.25,.2,-.75,0,-1);
  const geo=new THREE.ExtrudeGeometry(sh,{depth:.5,bevelEnabled:true,bevelThickness:.2,bevelSize:.15,bevelSegments:8,curveSegments:32}); geo.center();
  return mesh(geo,M(0xd2132b,{roughness:.25,emissive:0x400008,emissiveIntensity:.4})); }
function makeGem(){ return mesh(new THREE.OctahedronGeometry(1,0),M(0x2ec4ff,{roughness:.1,metalness:.1,flatShading:true,emissive:0x0a5a80,emissiveIntensity:.5}),[0,0,0],[.8,1.3,.8],[0,.4,0]); }
function makeFish(){ const g=new THREE.Group(), orange=M(0xff7a1a,{roughness:.35}), fin=M(0xff9a3a,{roughness:.4});
  g.add(mesh(SPH,orange,[0,0,0],[1.25,.62,.36])); g.add(mesh(new THREE.ConeGeometry(.5,.95,3),fin,[-1.5,0,0],[1,1,.25],[0,0,Math.PI/2]));
  g.add(mesh(new THREE.ConeGeometry(.35,.7,3),fin,[-.1,.7,0],[1,1,.2],[0,0,-.3])); g.add(mesh(new THREE.ConeGeometry(.25,.5,3),fin,[.1,-.62,.1],[1,1,.2],[0,0,Math.PI+.4]));
  for(const z of [.3,-.3]){ g.add(mesh(SPH,M(0xffffff),[.8,.15,z],[.13,.13,.06])); g.add(mesh(SPH,M(0x000000),[.84,.15,z*1.1],[.07,.07,.04])); }
  for(const x of [-.2,.2]) g.add(mesh(new THREE.TorusGeometry(.5,.04,8,32),M(0xffffff),[x,0,0],[.5,1.05,.7],[0,Math.PI/2,0]));
  return g; }
function makeMushroom(){ const g=new THREE.Group(), cap=new THREE.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI/2);
  g.add(mesh(cap,M(0xd11f1f,{roughness:.35}),[0,.3,0],[1,.8,1])); g.add(mesh(new THREE.CylinderGeometry(.4,.5,.9,32),M(0xf0e6cc),[0,-.2,0]));
  g.add(mesh(new THREE.CircleGeometry(1,48),M(0x6a2a20),[0,.3,0],[1,1,1],[Math.PI/2,0,0]));
  for(const [x,y,z,r] of [[0,1.05,0,.22],[.55,.72,.45,.17],[-.55,.7,.4,.18],[.1,.6,-.8,.15],[-.6,.55,-.3,.16],[.75,.5,-.2,.13]]) g.add(mesh(SPH,M(0xffffff),[x,y*.92,z],[r,r*.55,r]));
  return g; }
function makeStar(){ const geo=new THREE.ExtrudeGeometry(starShape(5,1,.45),{depth:.35,bevelEnabled:true,bevelThickness:.12,bevelSize:.08,bevelSegments:4}); geo.center();
  return mesh(geo,M(0xffc400,{metalness:.7,roughness:.3,emissive:0x5a4000,emissiveIntensity:.6})); }
const MODELS={ duck:{label:'Rubber duck',make:makeDuck}, cateye:{label:"Cat's eye",make:makeCatEye}, dragoneye:{label:'Dragon eye',make:makeDragonEye}, coin:{label:'Gold coin',make:makeCoin},
  blackcat:{label:'Black cat',make:makeBlackCat}, skull:{label:'Skull',make:makeSkull}, heart:{label:'Heart',make:makeHeart}, gem:{label:'Crystal gem',make:makeGem},
  fish:{label:'Goldfish',make:makeFish}, mushroom:{label:'Mushroom',make:makeMushroom}, star:{label:'Gold star',make:makeStar} };
let customTemplate=null;
function normalizeModel(obj){                           // centre it and scale to a unit bounding sphere
  const box=new THREE.Box3().setFromObject(obj), c=box.getCenter(new THREE.Vector3()), r=box.getBoundingSphere(new THREE.Sphere()).radius||1;
  const inner=new THREE.Group(); inner.add(obj); obj.position.sub(c); const w=new THREE.Group(); inner.scale.setScalar(1/r); w.add(inner); return w;
}
const tplCache={}, getTemplate=k=>tplCache[k]||(tplCache[k]=normalizeModel(MODELS[k].make()));
function loadModelFile(file){
  return new Promise((res,rej)=>{
    if(file.size>25e6) return rej(new Error('Model is larger than 25 MB'));
    const ext=file.name.split('.').pop().toLowerCase(), fr=new FileReader();
    fr.onerror=()=>rej(new Error('Could not read file'));
    fr.onload=()=>{ try{
      if(ext==='glb'||ext==='gltf') new GLTFLoader().parse(fr.result,'',g=>res(g.scene),e=>rej(new Error('Could not parse glTF: '+(e.message||e))));
      else if(ext==='obj') res(new OBJLoader().parse(fr.result));
      else if(ext==='stl') res(new THREE.Mesh(new STLLoader().parse(fr.result),new THREE.MeshStandardMaterial({color:0xcccccc,roughness:.4})));
      else rej(new Error('Use a .glb, .gltf, .obj or .stl file'));
    }catch(e){ rej(e); } };
    ext==='obj'?fr.readAsText(file):fr.readAsArrayBuffer(file);
  });
}
function makeInclusion(L=state){ const tpl=MODELS[L.inclusion]?getTemplate(L.inclusion):L.inclusion==='custom'?customTemplate:null; if(!tpl) return null;
  const inc=new THREE.Group(); const c=tpl.clone(true); c.traverse(o=>{ if(o.isMesh){ o.castShadow=false; o.receiveShadow=false; } }); inc.add(c); return inc; }
function updateInclusions(){ for(const d of dice){ if(!d.inc) continue; const L=d.look||state;
  d.inc.scale.setScalar(d.inradius*L.inclSize); d.inc.position.set(0,L.inclY*d.inradius,0); d.inc.rotation.set(0,THREE.MathUtils.degToRad(L.inclTurn),0); } }
let buildTok=0, rollKey='';          // buildTok: only the newest async rebuild runs; rollKey: what the running roll was built for
/* Mixed sets: every design in the set other than the live one gets its own look and uniform set. Rolls use pending edits, like the live design. */
const foreign=new Map(), fontAsked=new Set();
/* Dice that look the same (same shape, same number style) share one number atlas and one geometry: 20 identical d20 hold 2 textures, not 40. A material stays per die, because each die glows and dims by itself. */
let partCache=new Map();
const liveId=()=>bag&&!bag.active.draft?bag.active.design:null;
function lookFor(id){ if(!id||!bag||id===liveId()) return null; let f=foreign.get(id); if(f) return f.look;
  const e=bag.designs.find(d=>d.id===id); if(!e) return null; const j=bag.pending[id]||e.design; if(!designOK(j)) return null;
  const look=lookFromDesign(j); foreign.set(id,{look,uni:makeUniforms()});
  const F=FONTS[look.font]; if(F&&F.load&&!document.fonts.check(F.load)&&!fontAsked.has(look.font)){ fontAsked.add(look.font); ensureFont(look.font).then(()=>{ fontAsked.delete(look.font); for(const [k,pt] of partCache) if(k.includes('|'+look.font+'|')){ pt.geo.dispose(); pt.atlas.bump.dispose(); pt.atlas.mask.dispose(); partCache.delete(k); } scheduleRebuild(); }); }   // numbers drawn in the fallback font are not reused
  return look; }
let lastBuildMulti=false;
function buildDice(keepRoll){
  buildTok++;
  const keepQ=(!rolling&&isMulti()&&lastBuildMulti&&dice.length)?dice.map(d=>({name:d.name,design:d.design||null,q:d.mesh.quaternion.clone()})):null; const wasMulti=lastBuildMulti; lastBuildMulti=isMulti();   // PD-142.38.35/.38: a rebuild keeps the spin pose of a multi-die showcase; dice that persist (same type, in order) keep theirs, so Adv <-> Dis or a modifier change does not jump (a single die spins on the rig, which is never reset)
  if(keepRoll&&rolling&&rollKey!==state.shape+'|'+state.notation) keepRoll=false;   // the dice in the roll no longer match the design (shape/set changed)
  if(!keepRoll) exitRoll(true);
  rig.clear(); if(!rolling&&(isMulti()||wasMulti)) rig.quaternion.identity();   /* PD-142.38.62: a single die spins on the rig and the rig kept that turn when the set became several dice (the whole row came up rotated, with new dice not face-on); several dice turn themselves, so the rig is square whenever the layout changes between one die and many */
  clearHolds(); dice.forEach(d=>d.mat.dispose()); dice=[]; foreign.clear(); const nextParts=new Map();   // number textures and geometry are shared by every die that looks the same (see partCache)
  const specs=specsFor(state.shape);
  specs.forEach(s=>{
    const own=s.design?lookFor(s.design):null, L=own||state;   // the look this die is made from
    const R=Math.max(...s.verts.map(v=>v.length())); s.verts.forEach(v=>v.multiplyScalar(1/R));
    const key=[s.name,s.labels.join(','),L.font,L.numSoft,L.d4Style,L.d6Style,L.radius,L.numSize,L.numRot,L.panel,L.panelDepth,L.filigree,s.glyphs?s.glyphs.map(g=>g.id).join(','):''].join('|');
    let part=nextParts.get(key)||partCache.get(key);
    if(!part){
      const faces=hull(s.verts), labs=assignLabels(faces,s.labels);
      if(faces.length!==s.labels.length) console.warn(`${s.name}: hull has ${faces.length} faces, expected ${s.labels.length}`);
      let opts={};
      if(s.labels.length===4&&faces.length===4&&L.d4Style==='tips'&&!s.glyphs){          // vertex value = label of the face opposite it
        const val=new Map(); faces.forEach((f,i)=>{ for(let v=0;v<s.verts.length;v++) if(!f.idx.includes(v)) val.set(v,labs[i]); });
        opts={layout:'tips',tips:faces.map(f=>f.idx.map(v=>val.get(v)))};
      } else if(faces.length===6&&s.labels.length===6&&L.d6Style==='pips'&&!s.glyphs) opts={layout:'pips'};
      const atlas=makeAtlas(faces.length,s.glyphs?labs.map(l=>s.glyphs[l-1]):labs,L.font,L.numSoft,s.name==='d%',L.filigree!=='none'?{...opts,big:true,numSize:L.numSize}:opts), geo=buildGeometry(faces,atlas,L.radius,L.numSize,L.numRot,{panel:L.panel,panelDepth:L.panelDepth,filigree:L.filigree,soft:L.numSoft});
      part={faces,labs,atlas,geo};
    }
    nextParts.set(key,part);
    const {faces,labs,atlas,geo}=part, mat=makeMaterial(atlas,own?foreign.get(s.design).uni:U);
    const mesh=new THREE.Mesh(geo,mat); mesh.position.set(s.x,s.y||0,0); mesh.castShadow=true; rig.add(mesh);
    const entry={mesh,geo,mat,atlas,verts:s.verts,faces,labs,x:s.x,y:s.y||0,name:s.name,term:s.term,copy:s.copy,part:s.part,design:s.design,glyphs:s.glyphs||null,look:own,inradius:Math.min(...faces.map(f=>f.d))};
    if(L.substrate==='epoxy'){ const inc=makeInclusion(L); if(inc){ mesh.add(inc); entry.inc=inc; } }
    dice.push(entry);
  });
  if(keepQ){ const pool=[...keepQ]; dice.forEach(d=>{ const k=pool.findIndex(o=>o.name===d.name&&o.design===(d.design||null)); if(k>=0) d.mesh.quaternion.copy(pool.splice(k,1)[0].q); }); }
  for(const [k,pt] of partCache) if(!nextParts.has(k)){ pt.geo.dispose(); pt.atlas.bump.dispose(); pt.atlas.mask.dispose(); }   // parts no die uses any more
  partCache=nextParts;
  needHalfW = state.shape==='set7' ? 4.8 : state.shape==='custom' ? customHalfW : specs.length>1 ? 2.6 : 1.5;   // a single die must fit a narrow (portrait) screen too
  baseZ = state.shape==='set7' ? 13 : state.shape==='custom' ? customZoom : specs.length>1 ? 7.6 : 5.4;
  applyLook();
}
let rebuildQueued=false;
const scheduleRebuild=()=>{ if(rebuildQueued) return; rebuildQueued=true; requestAnimationFrame(()=>{rebuildQueued=false; buildDice(true);}); };
async function ensureFont(k){ const f=FONTS[k]; if(f&&f.load){ try{ await Promise.race([document.fonts.load(f.load),new Promise(r=>setTimeout(r,2000))]); }catch{} } }

/* Paint one look (a state-shaped object) onto a uniform set and the materials that use it. */
function paintLook(L,U,mats){
  const S=SUBSTRATES[L.substrate];
  U.uC1.value.set(L.colors[0]); U.uC2.value.set(L.colors[1]); U.uC3.value.set(L.colors[2]); U.uPaint.value.set(L.paint);
  U.uOff.value.set(...L.off); U.uEnamel.value.set(L.enamelSame?L.paint:L.enamel); U.uFill.value=L.filiFill?1:0; U.uPatina.value=L.patina; U.uNumPaint.value=L.numPaint?1:0;
  U.uTint.value=THREE.MathUtils.lerp(.9,.35,L.clarity); U.uGlitter.value=L.glitter; U.uBubbles.value=L.bubbles; U.uStone.value=STONES[L.stone].id; U.uAccent.value=L.stoneAccent; U.uMode.value=S.mode; U.uScale.value=(L.substrate==='marble'&&STONES[L.stone].scaleMap||(v=>v))(L.scale); U.uFlake.value=S.flake; U.uBrush.value=(L.substrate==='marble'&&STONES[L.stone].brush)||S.brush;
  for(const mat of mats){
    const ST=L.substrate==='marble'?STONES[L.stone]:null;
    // metals stop short of a mirror (roughness floor .25): a mirror only shows the dim room and reads black
    const P=L.polish, baseR=ST?ST.rough:S.rough, baseC=ST?ST.coat:S.coat;   // polish .5 = the substrate's designed finish
    Object.assign(mat,{metalness:ST&&ST.metal!=null?ST.metal:S.metal, roughness:THREE.MathUtils.clamp(baseR+(.5-P)*1.1,(ST&&ST.metal!=null?ST.metal:S.metal)>.5?.25:.03,1), clearcoat:P<.5?baseC*P*2:THREE.MathUtils.lerp(baseC,1,(P-.5)*2), clearcoatRoughness:THREE.MathUtils.clamp(.08+(.5-P)*.5,.03,.5), specularIntensity:THREE.MathUtils.clamp(.2+1.6*P,.2,1), bumpScale:(L.numRaised?-1:1)*L.numDepth,
      transmission:S.trans?.35+.65*L.clarity:0, ior:1.5, thickness:S.trans?2:0, attenuationDistance:S.trans?THREE.MathUtils.lerp(1.5,8,L.clarity):Infinity,
      side:S.trans?THREE.DoubleSide:THREE.FrontSide});   // double-sided so the far faces (and their numbers) are seen through the die
    mat.attenuationColor.set(L.colors[0]); mat.emissive.set('#000000'); mat.needsUpdate=true;
  }
}
function applyLook(){
  legalRelief();
  const S=SUBSTRATES[state.substrate];
  paintLook(state,U,dice.filter(d=>!d.look).map(d=>d.mat));
  for(const f of foreign.values()) paintLook(f.look,f.uni,dice.filter(d=>d.look===f.look).map(d=>d.mat));
  $('name').textContent = (state.shape==='custom'?currentDice().name:SHAPES[state.shape].label).toUpperCase()+' · '+(state.substrate==='marble'?STONES[state.stone].label:S.label).toUpperCase();
  setVolume(); updateInclusions(); syncUI(); save(); scheduleCheckpoint();
}
const repaint=r=>{ if(state.paintMode!=='custom'&&state.substrate==='marble'&&STONES[state.stone]&&STONES[state.stone].paint) state.paint=STONES[state.stone].paint; else if(state.paintMode!=='custom') state.paint=pickPaint(state.colors,state.substrate,r||mulberry32(state.seed),state.paintMode); };
function randomize(noBuild){
  enterDraft(); checkpoint(); state.seed=(rng()*1e9)|0; const r=mulberry32(state.seed), oldShape=state.shape, f=(v,d)=>+v.toFixed(d);
  if(state.randshape&&!gameRun()) state.shape=pick(Object.keys(SHAPES),r);   // a running game keeps its dice (PD-158)
  if(state.randsub) state.substrate=pick(Object.keys(SUBSTRATES),r);
  if(state.substrate==='marble') state.stone=pick(STONE_KEYS,r);
  state.palettes.shared=freshPalette(state.substrate,r); state.colors=state.palettes.shared; state.stoneAccent=f(r(),2);
  state.off=[r()*60,r()*60,r()*60]; state.scale=f(1+r()*1.6,2);
  state.radius=f(.015+r()*.075,3); state.font=pick(Object.keys(FONTS),r);
  state.numSize=f(.5+r()*.3,2); state.numRot=0; state.numDepth=f(1.2+r()*2.8,1); state.numSoft=f(1.5+r()*4.5,1);
  state.polish=f(.2+r()*.75,2); state.glitter=f(r(),2); state.bubbles=f(r()*.7,2); state.clarity=f(.35+r()*.55,2);
  state.d4Style='tips'; state.d6Style=r()<.7?'numbers':'pips';
  const relief=r()<.2;                                // face panel (and its patina) appears on 20% of randomizes
  state.numRaised=r()<.3; state.numPaint=state.numRaised?r()<.5:true;
  state.panel=relief?f(.08+r()*.14,2):0; state.panelDepth=f(.3+r()*.6,2); state.patina=relief&&r()<.7?f(.25+r()*.65,2):0; legalRelief();
  state.filigree=r()<.2?pick(['scroll','beads','deco'],r):'none'; state.filiFill=r()<.8; state.enamelSame=r()<.5; state.enamel=hsl(r(),.55+r()*.3,.4+r()*.25);
  if(state.substrate==='epoxy'&&state.inclusion!=='custom'){ state.inclusion=r()<.45?pick(Object.keys(MODELS),r):'none'; state.inclSize=f(.45+r()*.35,2); state.inclTurn=Math.round((r()*2-1)*180); state.inclY=f((r()*2-1)*.25,2); }
  repaint(r);
  if(noBuild){ applyLook(); return; }
  checkpoint();
  const tok=buildTok+1; buildTok=tok;                       // a newer build (slider, another randomize) supersedes this one
  const wasRoll=rolling;
  ensureFont(state.font).then(()=>{ if(buildTok!==tok) return; buildDice(state.shape===oldShape); if(wasRoll&&state.shape!==oldShape) startRoll(); });   // a new shape in roll view is thrown straight onto the mat   // geometry/atlas depend on radius, font and number settings
}
function blankDraft(){   // slice 4c: [+] Blank opens the same draft Random does, starting from a plain off-white die
  enterDraft(); checkpoint(); const oldShape=state.shape, gk=gameRun()?{shape:state.shape,notation:state.notation}:null;   // PD-187: a running game keeps its dice
  Object.assign(state,Object.fromEntries(DESIGN_KEYS.map(k=>[k,structuredClone(DEFAULTS[k])]))); if(gk){ state.shape=gk.shape; state.notation=gk.notation; } state.substrate='solid'; setSubstrate('solid');
  state.palettes.shared=['#efe9dc','#efe9dc','#efe9dc']; state.colors=state.palettes.shared; state.seed=(rng()*1e9)|0; repaint(); checkpoint();
  const tok=buildTok+1; buildTok=tok; ensureFont(state.font).then(()=>{ if(buildTok!==tok) return; buildDice(state.shape===oldShape); });
}

function plainLook(){   // Story dice start from the plain default design (what Blank opens, without the random seed): the glyphs read best on a plain die, and the player's own design stays saved in the bag
  Object.assign(state,Object.fromEntries(DESIGN_KEYS.map(k=>[k,structuredClone(DEFAULTS[k])]))); state.substrate='solid'; setSubstrate('solid');
  state.palettes.shared=['#efe9dc','#efe9dc','#efe9dc']; state.colors=state.palettes.shared; state.numSize=.9; repaint(); }   // numSize .9: glyphs must read on a phone
let lookSnap=null;   // the player's look, kept while the story dice use the plain one (a snapshot, not a bag draft: no thumbnails to render, nothing to save or discard)
/* PD-187: the temporary draft look. Entry points (a game that wants its own dice look, PD-188, calls these):
   lookSwap(apply=plainLook)  enter: keep the player's look, then run apply() to put the game's look on the live state; no-op if already in a draft
   lookRestore()              leave: discard the draft and put the player's look back exactly (end of game / setup preview)
   lookDrop()                 the player deliberately picked a design (or Randomize/Blank): the draft is gone and the pick stays
   While a draft is live the bag is frozen (syncLive/isLiveModified skip it, save() writes the player's look to the settings store), so no design gains edits. */
function lookSwap(apply=plainLook){ if(lookSnap) return; syncLive(); lookSnap=snapshot(); apply(); }
const lookHistoryReset=()=>{ clearTimeout(hTimer); hTimer=null; history=[snapshot()]; hIdx=0; syncHistoryUI(); };   // PD-187: Undo must not cross the look swap (it would bring back the pre-game look)
function lookDrop(){ lookSnap=null; }   // PD-187: the player deliberately picked a design (or Randomize/Blank) while the game look was live: that pick is theirs now and ending the game leaves it; only the temporary look is gone
function lookRestore(){ if(!lookSnap) return; const o=JSON.parse(lookSnap); lookSnap=null; Object.assign(state,o); state.colors=state.palettes[palKey()]||state.colors; legalRelief(); setSubstrate(state.substrate); lookHistoryReset(); }   // the snapshot already holds the paint: re-picking it (repaint) changed a never-edited design's paint, so it showed Modified after a game

/* ---------- undo / redo of design settings ---------- */
const DESIGN_KEYS=['inclusion','inclSize','inclTurn','inclY','polish','shape','substrate','stone','stoneAccent','palettes','paint','paintMode','scale','off','radius','font','numSize','numRot','numDepth','numSoft','d4Style','d6Style','panel','panelDepth','numRaised','numPaint','patina','filigree','filiFill','enamelSame','enamel','glitter','bubbles','clarity','notation','seed'];
const snapshot=()=>JSON.stringify(Object.fromEntries(DESIGN_KEYS.map(k=>[k,state[k]])));
let history=[], hIdx=-1, hTimer=null;
function checkpoint(){                                   // record the current design if it differs from the last recorded one
  clearTimeout(hTimer); hTimer=null; if(hIdx<0) return;
  const snap=snapshot(); if(snap!==history[hIdx]){ history.length=hIdx+1; history.push(snap); if(history.length>100) history.shift(); hIdx=history.length-1; }
  syncHistoryUI();
}
const scheduleCheckpoint=()=>{ if(hIdx<0) return; clearTimeout(hTimer); hTimer=setTimeout(checkpoint,500); syncHistoryUI(); };   // coalesces slider drags
function syncHistoryUI(){ $('undo').disabled=!(hIdx>0||hTimer); $('redo').disabled=!(hIdx>=0&&hIdx<history.length-1); }
async function restore(snap){
  const o=JSON.parse(snap), oldShape=state.shape; if(gameRun()){ o.shape=state.shape; o.notation=state.notation; }   /* PD-187: undo never changes a running game's dice */
  Object.assign(state,o); legalRelief(); setSubstrate(state.substrate);
  const tok=++buildTok; await ensureFont(state.font); if(buildTok===tok) buildDice(state.shape===oldShape); syncHistoryUI();
}
async function undo(){ checkpoint(); if(hIdx>0){ hIdx--; await restore(history[hIdx]); } }
async function redo(){ checkpoint(); if(hIdx<history.length-1){ hIdx++; await restore(history[hIdx]); } }
$('undo').onclick=undo; $('redo').onclick=redo;

/* Until a design has its real picture it shows a dummy die in the design's colour chip (colours and substrate, read from the design itself). Dice chips draw each shape (2.5d facets), or a plain outline when tiny. */
const chipCache=new Map();
const polar=(n,r,a0,cx=50,cy=50)=>Array.from({length:n},(_,k)=>[cx+r*Math.cos(a0+2*Math.PI*k/n),cy+r*Math.sin(a0+2*Math.PI*k/n)]);
function trapezo(m){ const A=Array.from({length:m+1},(_,k)=>[8+84*k/m,38]), B=Array.from({length:m},(_,k)=>[8+84*(k+.5)/m,62]), T=[50,4], Bot=[50,96], f=[], sh=[];
  for(let k=0;k<m;k++){ f.push([T,A[k],B[k],A[k+1]]); sh.push(.2-.4*(k+.5)/m); }
  f.push([Bot,B[0],A[0],[4,60]]); sh.push(-.1);
  for(let k=0;k<m-1;k++){ f.push([Bot,B[k],A[k+1],B[k+1]]); sh.push(-.2-.1*k); }
  f.push([Bot,B[m-1],A[m],[96,60]]); sh.push(-.38);
  return {f,sh,out:[T,A[m],[96,60],Bot,[4,60],A[0]]}; }
const DIE_CHIP={
  d4:{f:[[[50,8],[6,86],[50,62]],[[50,8],[94,86],[50,62]],[[6,86],[94,86],[50,62]]],sh:[.14,-.1,-.28],out:[[50,8],[94,86],[6,86]],ty:78},
  d6:{f:[[[50,8],[90,30],[50,52],[10,30]],[[10,30],[50,52],[50,94],[10,72]],[[90,30],[50,52],[50,94],[90,72]]],sh:[.22,-.04,-.3],out:[[50,8],[90,30],[90,72],[50,94],[10,72],[10,30]],ty:66},
  d8:{f:[[[50,6],[8,48],[50,66]],[[50,6],[92,48],[50,66]],[[8,48],[50,66],[50,94]],[[92,48],[50,66],[50,94]]],sh:[.18,-.08,-.18,-.34],out:[[50,6],[92,48],[50,94],[8,48]],ty:56},
  d10:{...trapezo(2),ty:66}, d14:{...trapezo(4),ty:70},
  d16:(()=>{ const E=[[8,50],[29,57],[50,62],[71,57],[92,50]], f=[], sh=[]; for(let k=0;k<4;k++){ f.push([[50,4],E[k],E[k+1]]); sh.push(.22-.14*k); } for(let k=0;k<4;k++){ f.push([[50,96],E[k],E[k+1]]); sh.push(-.1-.1*k); } return {f,sh,out:[[50,4],[92,50],[50,96],[8,50]],ty:60}; })(),
  d12:(()=>{ const I=polar(5,24,-Math.PI/2), O=polar(5,46,-Math.PI/2), M=polar(5,40,-Math.PI/2+Math.PI/5), f=[[...I]], sh=[.1]; for(let k=0;k<5;k++){ const k2=(k+1)%5; f.push([I[k],O[k],M[k],O[k2],I[k2]]); sh.push(.18-.12*k); } return {f,sh,out:O.flatMap((o,k)=>[o,M[k]]),ty:56}; })(),
  d20:{f:[[[50,6],[12,28],[50,28]],[[50,6],[88,28],[50,28]],[[12,28],[26,70],[50,28]],[[88,28],[74,70],[50,28]],[[12,28],[12,72],[26,70]],[[88,28],[88,72],[74,70]],[[12,72],[50,94],[26,70]],[[88,72],[50,94],[74,70]],[[26,70],[74,70],[50,94]],[[50,28],[74,70],[26,70]]],sh:[.16,0,.1,-.12,.18,-.2,.06,-.26,-.34,0],out:[[50,6],[88,28],[88,72],[50,94],[12,72],[12,28]],ty:58}
};
DIE_CHIP.rd12=DIE_CHIP.d6;
Object.assign(DIE_CHIP.d4,{fo:[[50,8],[94,86],[6,86]]}); Object.assign(DIE_CHIP.d6,{fo:[[14,14],[86,14],[86,86],[14,86]]});
Object.assign(DIE_CHIP.d8,{fo:[[50,10],[97,50],[50,90],[3,50]]}); Object.assign(DIE_CHIP.d10,{fo:[[50,2],[78,36],[50,98],[22,36]]});
Object.assign(DIE_CHIP.d12,{fo:polar(5,48,-Math.PI/2,50,54)}); Object.assign(DIE_CHIP.d14,{fo:polar(7,47,-Math.PI/2)}); Object.assign(DIE_CHIP.d16,{fo:polar(8,47,Math.PI/8)});
DIE_CHIP.d100={...DIE_CHIP.d10,fo:null,fos:[[[30,6],[50,34],[30,94],[10,34]],[[68,6],[90,34],[68,94],[46,34]]]};
DIE_CHIP.rd12={...DIE_CHIP.d6,fo:[[28,12],[72,12],[96,50],[72,88],[28,88],[4,50]]};
const shapeOfSides=n=>n===100?'d100':'d'+n;
function dieChip(j,shape='d20',label,flat=false,pic=false){
  const D=DIE_CHIP[shape]||DIE_CHIP.d20, cols=(j.colors&&j.colors.length?j.colors:['#444','#666','#888']).map(c=>/^#[0-9a-f]{3,8}$/i.test(c)?c:'#666'), sub=j.substrate||'', key=cols.join()+sub+'|'+shape+'|'+label+(flat?'|f':'')+(pic?'|p':''); let u=chipCache.get(key); if(u) return u;
  const c=i=>cols[i%cols.length], pts=f=>f.map(q=>q.map(v=>+v.toFixed(1)).join(',')).join(' '), metal=/metal|gold|silver|chrome/.test(sub);
  const shine=`<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${metal?.55:.2}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${metal?.3:.2}"/></linearGradient>`;
  const txt=label==null?'':`<text x="50" y="${D.ty}" text-anchor="middle" font-family="serif" font-weight="700" font-size="${String(label).length>2?15:19}" fill="#fff" fill-opacity=".9" stroke="#0007" stroke-width=".7">${label}</text>`;
  const outs=flat?(D.fos||[D.fo||D.out]):[], body=flat?outs.map(o=>`<polygon points="${pts(o)}" fill="${c(0)}" stroke="#000a" stroke-width="5" stroke-linejoin="round"/><polygon points="${pts(o)}" fill="url(#g)"/>`).join('')
    :D.f.map((f,i)=>`<polygon points="${pts(f)}" fill="${c(i%3)}"/><polygon points="${pts(f)}" fill="${D.sh[i]>=0?'#fff':'#000'}" fill-opacity="${Math.abs(D.sh[i])}" stroke="#0008" stroke-width="1" stroke-linejoin="round"/>`).join('')+`<polygon points="${pts(D.out)}" fill="url(#g)"/>`;
  u=`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${shine}${pic?'<radialGradient id="bg" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#191c26"/><stop offset="1" stop-color="#0e0e17"/></radialGradient>':''}</defs>${pic?'<rect width="100" height="100" fill="url(#bg)"/><g transform="translate(50 46) scale(.97 .89) translate(-50 -50)">':''}${body}${flat?'':txt}${pic?'</g>':''}</svg>`)}")`; chipCache.set(key,u); return u; }
/* the stand-in for a design picture: same size and framing as the real 144 px render (die about 74% of the width, centred a little high, on the stage backdrop) */
const chipThumb=(j,label='20')=>dieChip(j,'d20',label,false,true);
/* a die chip element for N-sided dice in a design (null = the live one) */
function chipEl(sides,j,{flat=false,label}={}){ const c=document.createElement('span'); c.className='chip'+(flat?' flat':''); c.style.backgroundImage=dieChip(j,typeof sides==='string'?sides:shapeOfSides(sides),flat?null:(label!==undefined?label:(sides===100?'%':String(sides))),flat); return c; }
const liveChipJ=()=>({colors:state.colors,substrate:state.substrate});
/* ---------- UI ---------- */
const DBL_MS=250;   // PD-142.38.40: a single tap waits this long for a second click before it acts, so a double-click never flashes the single-die state
/* tap/double/long-press on one button: single() runs after DBL_MS (immediately for keyboard activation), add() on a double-click or a long press; either cancels a pending single */
function tapOrAdd(b,{single,add,canAdd=()=>true,snap=null,restore=null}){ let t=0, lp=0, fired=false, dbl=false, saved, firedAt=0;   // PD-142.38.48: a second click inside the wait adds by itself (touch browsers send no dblclick); a slow double-click (the single already ran) puts the formula back first, so the result is always previous + 1 die
  const doAdd=()=>{ if(snap&&restore&&firedAt&&performance.now()-firedAt<900){ restore(saved); } firedAt=0; add(); };
  const runSingle=()=>{ t=0; if(snap) saved=snap(); firedAt=performance.now(); single(); };
  b.addEventListener('click',e=>{ if(fired){ fired=false; return; } if(e.detail===0){ single(); return; } if(e.detail<2&&!t) firedAt=0; if(t){ clearTimeout(t); t=0; if(canAdd()){ dbl=true; doAdd(); } return; } if(!canAdd()){ single(); return; } if(e.detail>1&&firedAt&&performance.now()-firedAt<900) return; t=setTimeout(runSingle,DBL_MS); });
  b.addEventListener('dblclick',()=>{ clearTimeout(t); t=0; if(dbl){ dbl=false; return; } if(canAdd()) doAdd(); });
  b.addEventListener('pointerdown',e=>{ fired=false; clearTimeout(lp); if(e.pointerType==='mouse'||!canAdd()) return; lp=setTimeout(()=>{ fired=true; add(); },480); });
  for(const ev of ['pointerup','pointercancel','pointerleave']) b.addEventListener(ev,()=>clearTimeout(lp));
  b.addEventListener('contextmenu',e=>{ if(canAdd()) e.preventDefault(); }); }
for(const [id,s] of Object.entries(SHAPES)){ const b=document.createElement('button'); b.dataset.id=id; if(id==='rd12'||id==='set7') b.style.gridColumn='span 2'; if(DIE_CHIP[id]||id==='d100') b.append(chipEl(id,liveChipJ(),{flat:true})); b.append(s.label);
  const sides=/^d\d+$/.test(id)?+id.slice(1):0;
  /* PD-142.38.34/.40: the same semantics in Play and Design. Tap = ONE die of that shape, that shape selected, Custom collapsed (after a short wait for a double-click). Double-click / long press = ADD one die to the formula and select Custom with the full formula showing. Never rolls. */
  const add=()=>{ if(!sides) return;
    if(playRoom()){ dockLoad(sides,true); forceCustom=$('rollbox').value; shapeSelSync(); return; }
    checkpoint();
    const base=state.shape==='custom'?state.notation:(/^d\d+$/.test(state.shape)?'1'+state.shape:state.notation), pp=parseNotation(base,true), terms=pp.error?[]:pp.terms.map(t=>({...t}));
    const t=terms.find(t=>t.sides===sides&&!t.keep&&!t.design&&!t.faces); if(t) t.count++; else terms.push({count:1,sides});
    state.notation=fmtNotation(terms,pp.error?0:pp.mod,pp.error?1:pp.group); state.shape='custom'; rebuildKeepMode(); };
  const single=()=>{ if(playRoom()){
      if(!sides){ state.shape=id; forceCustom=id==='custom'?$('rollbox').value:null; if(id!=='custom') $('rollbox').value=''; const was=rolling; holdRoom=was&&!designRoom; try{ buildDice(); } finally { holdRoom=false; } if(was) startRoll(false,true); syncUI(); formulaSync(); return; }   // rebuild and put the dice down unrolled: it never throws
      forceCustom=null; dockLoad(sides,false); return; }
    checkpoint(); state.shape=id; rebuildKeepMode(); };
  tapOrAdd(b,{single,add,canAdd:()=>!!sides});
  $('shapes').append(b); }
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='rollbox'&&typeof formulaSync==='function') formulaSync(); });

var holdRoom=false;   // PD-142.38.55: a rebuild that restarts the roll straight away must not pass through the Design room (the pane flickers into the Design layout and its scroll is lost)
const rebuildKeepMode=()=>{ const was=rolling; holdRoom=was&&!designRoom; try{ buildDice(); } finally { holdRoom=false; } if(was) startRoll(); };   // changing shape/set in roll view throws the new dice instead of leaving the roll

/* custom set: stepper UI <-> notation text */
const STEP_TYPES=[4,6,8,10,100,12,14,16,20];
const playRoom=()=>!document.body.classList.contains('design')&&!!$('rollbox');   // PD-142.38.23: in Play the Custom set control and the dock formula box are two views of one formula
let forceCustom=null;   // PD-142.38.34: after a double-click / long press the Custom set stays selected for as long as the formula is the one it produced
const selShape=()=>{ if(playRoom()){ const v=$('rollbox').value.trim(); if(forceCustom!==null&&v===forceCustom.trim()) return 'custom';
    if(v){ const p=parseNotation(v,true); if(!p.error&&p.terms.length===1&&!p.mod&&!(p.group>1)){ const t=p.terms[0]; if(t.count===1&&!t.keep&&!t.design&&!t.faces&&document.querySelector(`#shapes [data-id="d${t.sides}"]`)) return 'd'+t.sides; } return 'custom'; } }
  return state.shape; };
function shapeSelSync(){ const sel=selShape(); document.querySelectorAll('#shapes button').forEach(b=>b.classList.toggle('on',b.dataset.id===sel)); $('customctl').hidden=sel!=='custom'; }
const curNotation=()=>{ if(playRoom()){ const v=$('rollbox').value.trim(); if(v&&!parseNotation(v,true).error) return v; } return state.notation; };
let stepDesign=null;   // the design the + / − buttons add dice of (null = the live design)
const sameDesign=(a,b)=>(a||null)===(b||null);
function counts(){ const p=parseNotation(curNotation()), c={}; STEP_TYPES.forEach(t=>c[t]=0); if(!p.error) p.terms.filter(t=>!t.faces&&sameDesign(t.design,stepDesign)).forEach(t=>c[t.sides]+=t.count); return {c,mod:p.error?0:p.mod}; }
function setCounts(c,mod){ const play=playRoom(); if(!play) checkpoint(); const p=parseNotation(curNotation()), others=p.error?[]:p.terms.filter(t=>t.faces||!sameDesign(t.design,stepDesign));
  const oldKeep=t=>{ const o=p.error?null:p.terms.find(x=>x.sides===t&&!x.faces&&sameDesign(x.design,stepDesign)&&x.keep); return o&&o.keep.n<c[t]?{keep:o.keep}:{}; };   // the + / − buttons keep an existing keep-highest/lowest while it still makes sense
  const mine=STEP_TYPES.filter(t=>c[t]>0).map(t=>stepDesign?{count:c[t],sides:t,design:stepDesign,...oldKeep(t)}:{count:c[t],sides:t,...oldKeep(t)}), terms=stepDesign?[...others,...mine]:[...mine,...others]; if(!terms.length) return;
  const n=fmtNotation(terms,mod,p.error?1:p.group); if(parseNotation(n).error){ $('noterr').textContent=parseNotation(n).error; return; }
  if(play){ $('rollbox').value=n; $('rollbox').classList.remove('bad'); formulaSync(); return; }   // Play: edit the formula only; Roll throws it
  state.notation=n; state.shape='custom'; rebuildKeepMode(); }
STEP_TYPES.forEach(t=>{ const d=document.createElement('div'); d.className='step';
  d.innerHTML=`<span class="sl"><small>d${t===100?'%':t}</small></span><span class="sc"><button data-d="-1">−</button><b data-n="${t}">0</b><button data-d="1">+</button></span>`; d.querySelector('.sl').prepend(chipEl(t,liveChipJ(),{flat:true}));
  d.onclick=e=>{ const b=e.target.closest('button'); if(!b) return; const {c,mod}=counts(); c[t]=Math.max(0,c[t]+ +b.dataset.d); setCounts(c,mod); };
  $('steppers').append(d); });
$('stepdesign').onchange=e=>{ stepDesign=e.target.value||null; syncUI(); };
$('modm').onclick=()=>{ const {c,mod}=counts(); setCounts(c,mod-1); }; $('modp').onclick=()=>{ const {c,mod}=counts(); setCounts(c,mod+1); };
const applyNotation=()=>{ const play=playRoom(); if(!play) checkpoint(); const p=parseNotation($('notation').value,true); if(p.error){ $('noterr').textContent=p.error; return; }
  if(play){ $('rollbox').value=fmtNotation(p.terms,p.mod,p.group); $('rollbox').classList.remove('bad'); $('noterr').textContent=''; formulaSync(); return; }
  state.notation=fmtNotation(p.terms,p.mod,p.group); state.shape='custom'; rebuildKeepMode(); };
const advDis=(mode,add)=>{ const one={count:2,sides:20,keep:{mode,n:1}};   /* PD-142.38.32: like the die chips: a click REPLACES the formula with d20adv / d20dis (2d20 keep highest / lowest); double-click or long press ADDS that term to the formula */
  let terms=[one], mod=0, group=1;
  if(add){ const p=parseNotation($('notation').value,true); if(p.error){ $('noterr').textContent=p.error; return; } terms=[...p.terms,one]; mod=p.mod; group=p.group; }
  $('notation').value=fmtNotation(terms,mod,group); applyNotation(); };
for(const [id,mode] of [['notadv','h'],['notdis','l']]){ const b=$(id); let prev='', last=0, lp=0, fired=false;
  b.onclick=()=>{ if(fired){ fired=false; return; } const now=Date.now(); if(now-last>450) prev=$('notation').value; last=now; advDis(mode,false); };
  b.ondblclick=()=>{ $('notation').value=prev; advDis(mode,true); };
  b.addEventListener('pointerdown',e=>{ fired=false; clearTimeout(lp); if(e.pointerType==='mouse') return; lp=setTimeout(()=>{ fired=true; advDis(mode,true); },480); }); for(const ev of ['pointerup','pointercancel','pointerleave']) b.addEventListener(ev,()=>clearTimeout(lp)); b.addEventListener('contextmenu',e=>e.preventDefault()); }
function formulaSync(){ shapeSelSync(); const {c,mod}=counts(); STEP_TYPES.forEach(t=>{ const e=document.querySelector(`#steppers [data-n="${t}"]`); if(e) e.textContent=c[t]; }); $('modv').textContent=mod; if(document.activeElement!==$('notation')) $('notation').value=curNotation(); $('noterr').textContent=''; }
$('notation').addEventListener('input',()=>{ if(playRoom()&&!parseNotation($('notation').value,true).error){ $('rollbox').value=$('notation').value.trim(); $('rollbox').classList.remove('bad'); } });
$('notapply').onclick=applyNotation; $('notclear').onclick=()=>{ $('notation').value='d20'; $('noterr').textContent=''; applyNotation(); };   // quick reset: one d20, no modifier
 $('notation').onkeydown=e=>{ if(e.key==='Enter') applyNotation(); e.stopPropagation(); };
for(const [id,s] of Object.entries(SUBSTRATES)){ const b=document.createElement('button'); b.textContent=s.label; b.dataset.id=id;
  b.onclick=()=>{ checkpoint(); setSubstrate(id); repaint(); applyLook(); }; $('subs').append(b); }
{ const o=(v,t)=>{ const e=document.createElement('option'); e.value=v; e.textContent=t; $('incl').append(e); }; o('none','None'); for(const [k,m] of Object.entries(MODELS)) o(k,m.label); o('custom','Custom model file…'); }
for(const [k,f] of Object.entries(STONES)){ const o=document.createElement('option'); o.value=k; o.textContent=f.label; $('stone').append(o); }
for(const [k,f] of Object.entries(FONTS)){ const o=document.createElement('option'); o.value=k; o.textContent=f.label; $('font').append(o); }
function syncSetDesigns(){
  { const inp=$('setname'); if(inp) inp.placeholder=currentDice().name; }   // the name a blank box would get   // design choice for new dice, and one chip per term of the set
  const sel=$('stepdesign'), ids=bag?bag.designs.map(d=>d.id):[]; if(stepDesign&&!ids.includes(stepDesign)) stepDesign=null;
  const sig=ids.join('|')+'#'+(bag?bag.designs.map(d=>d.name).join('|'):''); if(sel.dataset.sig!==sig){ sel.dataset.sig=sig; sel.replaceChildren(new Option('Active design',''),...(bag?bag.designs.map(d=>new Option(d.name,d.id)):[])); }
  sel.value=stepDesign||''; $('dicedesignrow').hidden=!bag||bag.designs.length<2;
  const p=parseNotation(state.notation), box=$('termchips'); box.replaceChildren();
  if(!p.error&&bag&&bag.designs.length>1) p.terms.forEach((t,i)=>{ const b=document.createElement('button'); b.type='button'; b.title='Remove these dice from the set';
    const e=t.design&&bag.designs.find(d=>d.id===t.design); { const x=document.createElement('span'); x.className='x'; x.textContent='×'; b.append(chipEl(t.sides,e?(bag.pending[e.id]||e.design):liveChipJ(),{flat:true}),`${t.count}d${t.sides===100?'%':t.sides}${e?' · '+e.name:''}`,x); }
    b.onclick=()=>{ const q=parseNotation(state.notation); if(q.terms.length<2) return; checkpoint(); q.terms.splice(i,1); state.notation=fmtNotation(q.terms,q.mod,q.group); state.shape='custom'; rebuildKeepMode(); }; box.append(b); }); }
let chipSig='', stepSig='';
const stepChipJ=()=>{ const e=stepDesign&&entryOf(stepDesign); return e?(bag.pending[e.id]||e.design):liveChipJ(); };   // the dice-use design (or the live one)
function refreshChips(){ const sig=state.colors.join()+state.substrate;
  if(sig!==chipSig){ chipSig=sig; const j=liveChipJ(); document.querySelectorAll('#shapes button[data-id] .chip').forEach(c=>{ c.style.backgroundImage=dieChip(j,c.parentNode.dataset.id,null,true); }); }
  const sj=stepChipJ(), ssig=(stepDesign||'')+'|'+(sj.colors||[]).join()+sj.substrate; if(ssig===stepSig) return; stepSig=ssig;
  document.querySelectorAll('#steppers .step').forEach((d,i)=>{ d.querySelector('.chip').style.backgroundImage=dieChip(sj,shapeOfSides(STEP_TYPES[i]),null,true); }); }
function syncUI(){
  syncSetDesigns(); refreshChips();
  shapeSelSync();
  document.querySelectorAll('#subs button').forEach(b=>b.classList.toggle('on',b.dataset.id===state.substrate));
  ['c1','c2','c3'].forEach((id,i)=>{ $(id).value=state.colors[i]; $(id).disabled = SUBSTRATES[state.substrate].mode===0 && i>0; });
  $('paint').value=state.paint; $('paintmode').value=state.paintMode; $('randsub').checked=state.randsub; $('rumble').checked=state.rumble; dset($('snd'),state.sound?ICON_SND_ON:ICON_SND_OFF,state.sound?'Sound on':'Sound off'); $('snd').classList.toggle('off',!state.sound); $('snd').setAttribute('aria-pressed',state.sound); dset($('spinbtn'),state.spin>0?ICON_PAUSE:ICON_PLAY,state.spin>0?'Pause spin':'Resume spin'); $('spinbtn').title=$('spinbtn').ariaLabel=state.spin>0?'Pause spinning':'Spin'; $('snd').title=state.sound?'Sound on (tap to mute)':'Sound off (tap to turn on)'; $('expsize').value=state.expsize;
  for(const [id,k] of SLIDERS) $(id).value=k==='numSize'?numToPos(state[k]):state[k];
  syncGravityUI();
  { const {c,mod}=counts(); STEP_TYPES.forEach(t=>document.querySelector(`#steppers [data-n="${t}"]`).textContent=c[t]); $('modv').textContent=mod; if(document.activeElement!==$('notation')) $('notation').value=curNotation(); if(parseNotation(state.notation).error===undefined) $('noterr').textContent=''; }
  $('stonectl').hidden=state.substrate!=='marble'; $('stone').value=state.stone;
  $('incl').value=state.inclusion; $('inclctl').hidden=state.inclusion==='none'; $('epoxyctl').hidden=state.substrate!=='epoxy'; $('randshape').checked=state.randshape;
  reliefSync(); $('numpaint').checked=state.numPaint; $('filigree').value=state.filigree; $('filifill').checked=state.filiFill; $('enamelsame').checked=state.enamelSame; $('enamel').value=state.enamel; $('enamel').disabled=state.enamelSame;
  $('d4style').value=state.d4Style; $('d6style').value=state.d6Style; $('font').value=state.font; $('numrotv').textContent=state.numRot+'°';
}
const NUM_MIN=.45, NUM_MAX=5;   // number size, as a fraction of the face inradius: tiny print is no use, jumbo print is cropped by the face edges on purpose
const numToPos=v=>Math.log(Math.max(NUM_MIN,Math.min(NUM_MAX,v))/NUM_MIN)/Math.log(NUM_MAX/NUM_MIN), numFromPos=p=>+(NUM_MIN*Math.pow(NUM_MAX/NUM_MIN,p)).toFixed(2);   // log scale: the useful .5-1.5 range keeps most of the slider
state.numSize=Math.max(NUM_MIN,Math.min(NUM_MAX,state.numSize));   // older saves allowed print down to .3
const SLIDERS=[['volume','volume'],['inclsize','inclSize'],['inclturn','inclTurn'],['inclheight','inclY'],['polish','polish'],['accent','stoneAccent'],['glitter','glitter'],['bubbles','bubbles'],['clarity','clarity'],['scale','scale'],['radius','radius'],['numsize','numSize'],['numrot','numRot'],['numdepth','numDepth'],['numsoft','numSoft'],['panel','panel'],['paneldepth','panelDepth'],['patina','patina'],['spin','spin'],['bounce','bounce'],['fricdice','fricDice'],['fricmat','fricMat']];
$('gravity').oninput=e=>{ let p=+e.target.value; const pd=gravToPos(GRAV_DEF); setGravity(Math.abs(p-pd)<.008?GRAV_DEF:gravFromPos(p)); };   // PD-169: snaps to today's feel near its mark
$('gravityreset').onclick=()=>{ if(Math.abs(state.gravity-GRAV_DEF)>1e-9) setGravity(GRAV_DEF); };
const REBUILD=new Set(['radius','numSize','numRot','numSoft','panel','panelDepth']);
for(const [id,k] of SLIDERS) $(id).oninput=e=>{ state[k]=k==='numSize'?numFromPos(+e.target.value):+e.target.value; if(REBUILD.has(k)) scheduleRebuild(); applyLook(); if(world&&(k==='bounce'||k==='fricDice'||k==='fricMat')) applyContacts(); };
$('numrotreset').onclick=()=>{ const r=$('numrot'); if(+r.value!==0){ checkpoint(); r.value=0; r.dispatchEvent(new Event('input')); } };   // PD-142.38.26
$('incl').onchange=e=>{ const v=e.target.value; if(v==='custom'&&!customTemplate){ $('incl').value=state.inclusion; $('modelfile').click(); return; }
  checkpoint(); state.inclusion=v; buildDice(true); };
$('loadmodel').onclick=()=>$('modelfile').click();
$('modelfile').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
  try{ customTemplate=normalizeModel(await loadModelFile(f)); checkpoint(); state.inclusion='custom'; buildDice(true); }catch(err){ alert('Could not load model: '+err.message); } };
$('stone').onchange=e=>{ checkpoint(); setStone(e.target.value); stoneColours(); repaint(); applyLook(); };   // choosing a stone brings its natural colours
$('colorrand').onclick=()=>{ checkpoint(); state.palettes.shared=freshPalette(state.substrate,mulberry32((rng()*1e9)|0)); state.colors=state.palettes.shared; repaint(); applyLook(); };   // new base colours by the active substrate's rules; nothing else changes
function stoneColours(){ state.palettes.shared=[...STONES[state.stone].pal(mulberry32((rng()*1e9)|0))]; state.colors=state.palettes.shared; }
$('stonepaint').onclick=()=>{ checkpoint(); stoneColours(); repaint(); applyLook(); };   // another draw from the same stone's palette rules   // the stone's own palette rules
const legalRelief=()=>{ if(!(state.panel>0)&&state.numRaised){ state.numRaised=false; return true; } return false; };   // PD-142.38.51: the ONE rule: Raised numbers need a face panel (panel > 0). Every path that writes numRaised or panel runs this (Randomize, applyLook, undo/redo, Keep, load)
function reliefSync(){ const on=state.panel>0, ns=$('numstyle'), pa=$('patina'); if(!on&&state.numRaised) state.numRaised=false;   /* PD-142.38.14: the selector and the die always match: Raised needs a panel, so with none the live state is Inset too */
  ns.options[1].disabled=!on; ns.value=(state.numRaised&&on)?'raised':'inset'; if(pa){ pa.disabled=!on; pa.title=on?'How worn the face panel looks':'Patina ages the face panel: raise Panel above 0 first'; } }   // PD-142.38.14/.15
const panelRelief=()=>setTimeout(()=>{ if(state.panel<=0&&state.numRaised){ checkpoint(); state.numRaised=false; applyLook(); } reliefSync(); },0);   // lowering the panel to 0 writes Inset into the live design (undoable), not just the selector
$('panel').addEventListener('input',panelRelief); $('panel').addEventListener('change',panelRelief);
$('numstyle').onchange=e=>{ checkpoint(); state.numRaised=e.target.value==='raised'; applyLook(); };
$('numpaint').onchange=e=>{ checkpoint(); state.numPaint=e.target.checked; applyLook(); };
$('filigree').onchange=e=>{ checkpoint(); state.filigree=e.target.value; scheduleRebuild(); applyLook(); };
$('filifill').onchange=e=>{ checkpoint(); state.filiFill=e.target.checked; applyLook(); };
$('enamelsame').onchange=e=>{ checkpoint(); state.enamelSame=e.target.checked; applyLook(); };
$('enamel').oninput=e=>{ state.enamel=e.target.value; applyLook(); };
$('d4style').onchange=e=>{ state.d4Style=e.target.value; checkpoint(); scheduleRebuild(); };
$('d6style').onchange=e=>{ state.d6Style=e.target.value; checkpoint(); scheduleRebuild(); };
$('font').onchange=async e=>{ state.font=e.target.value; await ensureFont(state.font); scheduleRebuild(); applyLook(); };
['c1','c2','c3'].forEach((id,i)=>$(id).oninput=e=>{state.colors[i]=e.target.value; repaint(); applyLook();});
$('paint').oninput=e=>{state.paint=e.target.value; state.paintMode='custom'; applyLook();};
$('paintmode').onchange=e=>{checkpoint(); state.paintMode=e.target.value; repaint(mulberry32((rng()*1e9)|0)); applyLook();};
/* shake to roll: needs a phone with motion sensors in a secure (https) page; iOS also asks permission on the tap */
let shakeOn=false, shakeLast=0;
function onShake(e){ const a=e.accelerationIncludingGravity; if(!a||a.x==null) return; const g=Math.hypot(a.x,a.y,a.z), now=performance.now();
  if(g>26&&now-shakeLast>1500&&true){ shakeLast=now; dockRoll(true); } }
async function setShake(on){
  if(on&&!shakeOn){ try{ if(typeof DeviceMotionEvent.requestPermission==='function'&&await DeviceMotionEvent.requestPermission()!=='granted') on=false; }catch{ on=false; } }
  if(on&&!shakeOn){ addEventListener('devicemotion',onShake); if(state.sound) audioInit(); } else if(!on&&shakeOn) removeEventListener('devicemotion',onShake);
  shakeOn=on; state.shake=on; $('shake').checked=on; save(); }
if('DeviceMotionEvent' in window&&matchMedia('(pointer:coarse)').matches){ $('shakerow').hidden=false; $('shake').onchange=e=>setShake(e.target.checked); if(state.shake&&typeof DeviceMotionEvent.requestPermission!=='function') setShake(true); else state.shake=false; }
$('rumble').onchange=e=>{ state.rumble=e.target.checked; save(); };
$('soundtest').onclick=()=>{ playBlip(); $('soundstat').textContent='…'; setTimeout(()=>{ $('soundstat').textContent=audioStatus(); },400); };   // plays a blip and shows what the browser says about audio
$('spinbtn').onclick=()=>{ if(state.spin>0){ spinLast=state.spin; state.spin=0; } else state.spin=spinLast||.3; save(); syncUI(); };   // pause remembers the speed it will resume at
$('snd').onclick=()=>{ state.sound=!state.sound; audioInit(); setVolume(); save(); syncUI(); if(state.sound) playBlip(true); };
for(const ev of ['pointerdown','touchend','click','keydown']) addEventListener(ev,()=>{ if(state.sound) audioInit(); },{capture:true,passive:true});   // iOS only lets audio start/resume inside a gesture, and 'interrupted' (app switch, call) needs one more: every tap re-wakes it
$('randsub').onchange=e=>{state.randsub=e.target.checked; save();};
$('randshape').onchange=e=>{state.randshape=e.target.checked; save();};
$('expsize').onchange=e=>{state.expsize=e.target.value; save();};
function exportImage(type){
  const size=+$('expsize').value, pr=renderer.getPixelRatio();
  if(size){renderer.setPixelRatio(1); renderer.setSize(size,size,false); camera.aspect=1; camera.clearViewOffset(); camera.updateProjectionMatrix();}
  renderer.render(scene,camera);
  const mime=type==='jpg'?'image/jpeg':'image/png';
  return new Promise(res=>cv.toBlob(b=>{ if(size){renderer.setPixelRatio(pr); resize();}
    if(!window.__noDownload){const a=document.createElement('a'); a.href=URL.createObjectURL(b);
      a.download=`pretty-${state.shape}-${state.substrate}-${state.seed}.${type}`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);}
    res(b);},mime,.93));
}
$('exppng').onclick=()=>exportImage('png'); $('expjpg').onclick=()=>exportImage('jpg');
/* ---------- design file: versioned JSON (see docs/design/design-format.md) ---------- */
function designToJSON(){ return {format:'pretty-dice', version:1, name:($('dname').value||'').trim().slice(0,80), shape:state.shape, substrate:state.substrate, colors:[...state.colors],
  paint:state.paint, paint_mode:state.paintMode, pattern:{scale:state.scale, offset:[...state.off], seed:state.seed},
  finish:{polish:state.polish}, inclusion:{type:state.inclusion==='custom'?'none':state.inclusion,size:state.inclSize,turn_deg:state.inclTurn,height:state.inclY}, notation:state.notation, stone:{type:state.stone,accent:state.stoneAccent}, edge_radius:state.radius, resin:{glitter:state.glitter,bubbles:state.bubbles,clarity:state.clarity}, numbers:{font:state.font, size:state.numSize, rotation_deg:state.numRot, d4_style:state.d4Style, d6_style:state.d6Style, depth:state.numDepth, softness:state.numSoft},
  relief:{panel:state.panel, panel_depth:state.panelDepth, numbers:state.numRaised?'raised':'inset', paint_numbers:state.numPaint, patina:state.patina}, filigree:{style:state.filigree, filled:state.filiFill, enamel:state.enamelSame?null:state.enamel}}; }
/* A validated design file as a look: an object with the same keys as `state` (colours in .colors). Pure, so the dice of a mixed set can each use their own. */
function lookFromDesign(d){
  const L={};
  const hex=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c), num=(v,lo,hi,def)=>Number.isFinite(+v)?Math.min(hi,Math.max(lo,+v)):def;
  const cols=Array.isArray(d.colors)?d.colors.slice(0,3):[]; while(cols.length<3) cols.push('#000000');
  const n=d.numbers||{}, p=d.pattern||{};
  const st=d.stone||{}; L.stone=STONES[st.type]?st.type:'marble'; L.stoneAccent=num(st.accent,0,1,.5);
  L.shape=d.shape; L.substrate=d.substrate; L.colors=cols.map(c=>hex(c)?c:'#808080');
  L.paint=hex(d.paint)?d.paint:'#ffffff'; L.paintMode='custom';
  L.scale=num(p.scale,.5,3.5,1.6); L.seed=num(p.seed,0,1e9,1);
  L.off=Array.isArray(p.offset)&&p.offset.length===3?p.offset.map(v=>num(v,-1e4,1e4,0)):[11,23,37];
  L.radius=num(d.edge_radius,0,.15,.04); L.polish=num((d.finish||{}).polish,0,1,.5);
  { const ic=d.inclusion||{}; L.inclusion=MODELS[ic.type]?ic.type:'none'; L.inclSize=num(ic.size,.15,.9,.55); L.inclTurn=num(ic.turn_deg,-180,180,0); L.inclY=num(ic.height,-.6,.6,0); } const rs=d.resin||{}; L.glitter=num(rs.glitter,0,1,.5); L.bubbles=num(rs.bubbles,0,1,.3); L.clarity=num(rs.clarity,.2,1,.6);
  L.font=FONTS[n.font]?n.font:'cinzel'; L.numSize=num(n.size,NUM_MIN,NUM_MAX,.65); L.numRot=num(n.rotation_deg,-180,180,0); L.d4Style=n.d4_style==='center'?'center':'tips'; L.d6Style=n.d6_style==='pips'?'pips':'numbers';
  L.numDepth=num(n.depth,0,6,2.2); L.numSoft=num(n.softness,.5,10,3);
  { const rl=d.relief||{}, fg=d.filigree||{}; L.panel=num(rl.panel,0,.3,0); L.panelDepth=num(rl.panel_depth,0,1,.5); L.numRaised=rl.numbers==='raised'&&L.panel>0;   /* PD-142.38.14: raised numbers need a face panel; older saves with Raised and no panel load as Inset */ L.numPaint=rl.paint_numbers!==false; L.patina=num(rl.patina,0,1,0);
    L.filigree=['scroll','beads','deco'].includes(fg.style)?fg.style:'none'; L.filiFill=fg.filled!==false; L.enamelSame=!hex(fg.enamel); L.enamel=hex(fg.enamel)?fg.enamel:'#c9a24a'; }
  return L;
}
function loadDesign(d){
  checkpoint();
  if(!d||d.format!=='pretty-dice') throw new Error('Not a pretty-dice design file');
  if(d.version!==1) throw new Error('Unsupported design version '+d.version);
  if(!SHAPES[d.shape]) throw new Error('Unknown shape: '+d.shape);
  if(!SUBSTRATES[d.substrate]) throw new Error('Unknown substrate: '+d.substrate);
  if(typeof d.notation==='string'&&!parseNotation(d.notation).error) state.notation=d.notation;   // (a running game restores its own dice below)
  $('dname').value=typeof d.name==='string'?d.name.slice(0,80):'';
  const L=lookFromDesign(d), {colors,...rest}=L; Object.assign(state,rest); state.palettes[palKey()]=colors; state.colors=state.palettes[palKey()];
  if(gameKeep){ state.shape=gameKeep.shape; state.notation=gameKeep.notation; }
  return ensureFont(state.font).then(()=>buildDice());
}
$('savejson').onclick=()=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(designToJSON(),null,2)],{type:'application/json'}));
  a.download=`${(designToJSON().name||`pretty-dice-${state.shape}-${state.substrate}`).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'pretty-dice'}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); };
/* ---------- dice bag: many designs in one file (see docs/design/dice-bag-design.md, phase 1) ---------- */
/* ---- live design vs saved design (phase 2) ----
   The live state (sliders, stage) is always "the active design plus any pending edits". The saved design only changes on Save.
   Pending edits of the active design are recomputed from the live state whenever the bag is saved, so they survive reloads and design switches.
   shape and notation travel with the look but do not count as edits (shape is only the preview shape). */
const entryOf=id=>bag&&bag.designs.find(d=>d.id===id);
const activeEntry=()=>entryOf(bag.active.design);
function liveJSON(){ const dj=designToJSON(), e=activeEntry(); if(!bag.active.draft&&e) dj.name=dj.name||e.name; return dj; }
/* PD-187: what the bag shows and saves as the active design: the player's own picture while the game look is live */
function viewJSON(){ if(!lookSnap) return liveJSON(); if(bag.active.draft) return bag.draft||liveJSON(); const e=activeEntry(), p=bag.pending[e.id]; return {...(p||e.design),name:(p&&p.name)||e.name}; }
const frozenId=id=>!!lookSnap&&(!id||id==='draft'||(!bag.active.draft&&id===bag.active.design));   // PD-187: while the game look is live, the active design is read-only (Save/Revert would write or drop the game look)
function isLiveModified(){ const e=activeEntry(); if(lookSnap) return !!bag.pending[e.id]; return !bag.active.draft&&canonD(liveJSON())!==canonD({...e.design,name:e.name}); }
const isModified=id=>bag.active.draft||bag.active.design!==id?!!bag.pending[id]:isLiveModified();
let bagLoading=0;   // while a design is being loaded into the live state, the half-loaded state must not be saved back as edits
function syncLive(){ if(!bag||bagLoading||lookSnap) return;   // PD-187: the game's temporary look is nobody's edit: while it is live the bag keeps what the player had

  if(bag.active.draft){ bag.draft=liveJSON(); return; }
  const e=activeEntry(); if(!e) return;
  if(isLiveModified()) bag.pending[e.id]=liveJSON();
  else{ delete bag.pending[e.id]; const dj=designToJSON(); if(!isMulti()&&!gameRun()){ e.design.shape=dj.shape; e.preview_shape=dj.shape; } } }   // a running game's dice are the game's, not the design's preview shape (PD-187)   // PD-142.38.37: the roll set on the mat (Custom / Standard 7 and its formula) is a draft outside the bag: it is never written into the saved design, so editing it cannot make the bag look modified
function bagToJSON(){ syncLive(); bag.log=bag.log.slice(-LOG_MAX); return structuredClone(bag); }
function saveBag(){ if(!bag||bagLoading) return; try{ localStorage.setItem(BAG_STORE,JSON.stringify(bagToJSON())); }catch{} }
/* Boot: restore the stored bag, or turn today's saved state into a bag of one (the first run with the bag). */
function initBag(){
  try{ const raw=localStorage.getItem(BAG_STORE); if(raw){ bag=parseBag(JSON.parse(raw)).bag; } }catch{ bag=null; }
  if(!bag){ const dj=designToJSON(), name=dj.name||'Design 1'; bag=emptyBag(); bag.designs.push({id:slug(name,'design-1'), name, preview_shape:dj.shape, design:{...dj,name}}); bag.active.design=bag.designs[0].id; }
  saveBag();
}
/* Put a design into the live state and start a fresh undo history (undo does not cross designs). */
async function loadSlot(json,name){ bagLoading++; try{ await loadDesign(name!=null?{...json,name}:json); }finally{ bagLoading--; } history=[snapshot()]; hIdx=0; syncHistoryUI(); }
/* An unmodified design is stored in the normal form the app writes (clamped numbers, defaults filled in), so imported files do not read as Modified. */
function normalizeActive(){ const e=activeEntry(); if(e&&!bag.active.draft&&!bag.pending[e.id]){ const dj=designToJSON(); if(gameRun()){ dj.shape=e.design.shape; dj.notation=e.design.notation; } e.design={...dj,name:e.name}; e.preview_shape=dj.shape; } }   // a running game's dice are the game's, not the design's (PD-187)
let actBusy=false, actNext=null;
/* PD-154/158: a running game fixes the dice SET (shape and count); the look may change. gameDiceFixed(fits) is true (and says why) when the pick does not fit the game's dice. */
const gameRun=()=>!!game&&!game.setup;
function gameDiceFixed(fits){ if(!gameRun()||fits) return false; gameMsg='The game fixes the dice: only a design or set with the same dice fits (end the game to pick another)'; renderGame(); return true; }
function sameDiceAsGame(notation){ const dd=game.info.dice, p=parseNotation(notation||'',true); return !p.error&&!p.mod&&!(p.group>1)&&p.terms.length>0&&p.terms.every(t=>t.sides===dd.sides&&!t.keep)&&p.terms.reduce((a,t)=>a+t.count,0)===dd.count; }
let gameKeep=null;   // while a design loads into a running game its shape and notation stay the game's   // PD-154: loading a design or set replaces the shape and count, so a running game refuses it (the long-press swap on one die stays: it is look-only)
async function activate(target,{skipSync=false}={}){   // target: a design id, or 'draft'. Latest request wins while one is loading.
  if(!bag) return; await idleThumbs(); if(actBusy){ actNext=target; return; } actBusy=true;
  const gr=gameRun(), keep=gr?{shape:state.shape,notation:state.notation}:null, poses=gr?bodies.map(b=>({p:b.position.clone(),q:b.quaternion.clone()})):null, res=$('result'), html=res.innerHTML, wasOn=res.classList.contains('on'), wasPlaced=placed, inDesign=designRoom&&gameRun(); gameKeep=keep;   // PD-158: in a game only the look changes; the dice stay where they lie
  try{ if(!skipSync) syncLive(); lookDrop();
    if(target==='draft'){ if(!bag.draft) return; bag.active.draft=true; await loadSlot(bag.draft,''); }
    else{ const e=entryOf(target); if(!e) return; bag.active.draft=false; bag.active.design=e.id; { const pe=bag.pending[e.id]; await loadSlot(pe||e.design,pe?null:e.name); } normalizeActive(); }
    if(gr&&game&&!game.setup){ pendingLay={n:dice.length,poses}; startRoll(false,true); res.innerHTML=html; res.classList.toggle('on',wasOn); placed=wasPlaced; if(inDesign){ designRoom=true; exitRoll(true); } gameSync(); renderGame(); }   // PD-180: a swap made in the Design room stays there (the dice were rebuilt to lie as they did; Play shows them)
    save();
  }finally{ actBusy=false; gameKeep=null; }
  if(actNext!=null){ const n=actNext; actNext=null; await activate(n); }
}
/* Randomize works on a draft, never on a saved design: the first Randomize moves the live look into the single draft slot. */
function enterDraft(){ const inGameLook=!!lookSnap; lookDrop(); if(!bag||bag.active.draft) return; if(!inGameLook) syncLive();   /* PD-187: the game's look is nobody's edit: Randomize/Blank mid-game must not write it into the design that was active */ bag.active.draft=true; bag.draft=null; $('dname').value=''; }
function newDesignName(base='Design'){ const used=new Set(bag.designs.map(d=>d.name)); let n=bag.designs.length+1; while(used.has(`${base} ${n}`)) n++; return `${base} ${n}`; }
function addEntry(json,name,afterId){ name=uniqueName(bag.designs.map(d=>d.name),name); const e={id:uniqueId(slug(name,'design'),new Set(bag.designs.map(d=>d.id))), name, preview_shape:json.shape, design:{...json,name}};
  const at=afterId?bag.designs.findIndex(d=>d.id===afterId)+1:bag.designs.length; bag.designs.splice(at,0,e); return e; }
const bagOps={
  async save(id){ if(frozenId(id)) return; if(id&&this.isOther(id)){ const e=entryOf(id), p=bag.pending[id]; if(!p) return; e.name=uniqueName(bag.designs.filter(x=>x!==e).map(d=>d.name),p.name||e.name); e.design={...p,name:e.name}; e.preview_shape=p.shape; delete bag.pending[id]; save(); return; }
    if(bag.active.draft) return this.keep(); const e=activeEntry(), j=liveJSON(); e.name=uniqueName(bag.designs.filter(x=>x!==e).map(d=>d.name),j.name||e.name); e.design={...j,name:e.name}; e.preview_shape=j.shape; delete bag.pending[e.id]; $('dname').value=e.name; save(); },
  isOther(id){ return bag.active.draft||bag.active.design!==id; },
  async saveCopy(id){ if(frozenId(id)) return; if(id&&this.isOther(id)){ const e=entryOf(id), p=bag.pending[id]; if(!p) return; delete bag.pending[id]; addEntry(p,`${e.name} copy`,id); save(); return; }
    if(bag.active.draft) return this.keep(); const e=activeEntry(), j=liveJSON(); delete bag.pending[e.id];
    const c=addEntry(j,`${e.name} copy`,e.id); bag.active.design=c.id; $('dname').value=c.name; save(); },
  async revert(id){ if(frozenId(id)) return; if(id&&this.isOther(id)){ delete bag.pending[id]; save(); return; }
    if(bag.active.draft) return this.discard(); const e=activeEntry(); delete bag.pending[e.id]; await loadSlot(e.design,e.name); normalizeActive(); save(); },
  async keep(){ if(!bag.active.draft||lookSnap) return; const j=liveJSON(), name=(j.name||'').trim()||newDesignName(), e=addEntry(j,name);
    bag.active.design=e.id; bag.active.draft=false; bag.draft=null; $('dname').value=e.name; save(); },
  async discard(){ if(lookSnap) return; bag.draft=null; if(bag.active.draft){ bag.active.draft=false; const e=activeEntry(), pe=bag.pending[e.id]; await loadSlot(pe||e.design,pe?null:e.name); normalizeActive(); } save(); },
  async duplicate(id){ syncLive(); const e=entryOf(id); if(!e) return; const c=addEntry(structuredClone(bag.pending[id]||e.design),`${e.name} copy`,id); await activate(c.id); return c.id; },
  rename(id,name){ name=String(name||'').trim().slice(0,80); if(!name) return; name=uniqueName(bag.designs.filter(d=>d.id!==id).map(d=>d.name),name);   // a rename is an outstanding edit like any other: it shows Modified until saved
    if(id==='draft'){ if(bag.active.draft) $('dname').value=name; else if(bag.draft) bag.draft.name=name; save(); return; }
    const e=entryOf(id); if(!e) return;
    if(!bag.active.draft&&bag.active.design===id){ $('dname').value=name; save(); return; }
    const p=bag.pending[id]?bag.pending[id]:structuredClone(e.design); p.name=name;
    if(canonD(p)===canonD({...e.design,name:e.name})) delete bag.pending[id]; else bag.pending[id]=p; save(); },
  async remove(id){ const e=entryOf(id); if(!e||bag.designs.length<2) return false; syncLive(); const k=bag.designs.indexOf(e), wasActive=!bag.active.draft&&bag.active.design===id;
    bag.designs.splice(k,1); delete bag.pending[id]; bag.jail=bag.jail.filter(j=>j.design!==id);
    bag.sets.forEach(st=>st.terms.forEach(t=>{ if(t.design===id) delete t.design; }));
    if(bag.active.design===id) bag.active.design=bag.designs[Math.min(k,bag.designs.length-1)].id;
    if(wasActive) await activate(bag.active.design,{skipSync:true}); else save(); return true; },
  move(id,to){ const k=bag.designs.findIndex(d=>d.id===id); if(k<0) return; to=Math.max(0,Math.min(bag.designs.length-1,to)); const [e]=bag.designs.splice(k,1); bag.designs.splice(to,0,e); save(); },
  async addLoaded(obj){ if(!obj||obj.format!=='pretty-dice') throw new Error(obj&&obj.format==='pretty-dice-bag'?'That is a bag file: use Add to the bag > From a file':'Not a pretty-dice design file');
    const {bag:inc}=parseBag(obj); syncLive(); const d=inc.designs[0].design, e=addEntry(d,d.name||newDesignName()); await activate(e.id,{skipSync:true}); return e.id; },
  async addBlank(){ syncLive(); lookDrop(); const gk=gameRun()?{shape:state.shape,notation:state.notation}:null; bagLoading++; try{ const d=Object.fromEntries(DESIGN_KEYS.map(k=>[k,structuredClone(DEFAULTS[k])])); Object.assign(state,d); if(gk){ state.shape=gk.shape; state.notation=gk.notation; } state.substrate='solid'; setSubstrate('solid'); state.palettes.shared=['#efe9dc','#efe9dc','#efe9dc']; state.colors=state.palettes.shared; state.seed=(rng()*1e9)|0; repaint(); applyLook();   // a plain off-white plastic die: a neutral starting point (Randomize is the way to get a surprise)
    await ensureFont(state.font); buildDice(); }finally{ bagLoading--; } const name=newDesignName(), e=addEntry({...designToJSON(),...(gk?{shape:DEFAULTS.shape,notation:DEFAULTS.notation}:{}),name},name); bag.active.draft=false; bag.active.design=e.id; $('dname').value=name; history=[snapshot()]; hIdx=0; syncHistoryUI(); save(); return e.id; },
};
/* The background picture pass borrows the live state for a moment, so anything that changes the live design waits for it to finish. */
let thumbBusy=false;
const idleThumbs=async()=>{};   // design pictures are drawn offscreen now (PD-123): nothing borrows the live design any more
for(const k of ['save','saveCopy','revert','keep','discard','duplicate','remove','addBlank','addLoaded']){ const f=bagOps[k]; bagOps[k]=async function(...a){ await idleThumbs(); return f.apply(bagOps,a); }; }
/* Add a parsed bag to this one (ids that clash get -2, -3 ...), or replace this one. Returns {added, dropped}. */
async function importBag(obj,{replace=false}={}){
  const {bag:inc,dropped}=parseBag(obj); await idleThumbs();
  if(replace){ bag=inc; const e=activeEntry(), pe=bag.pending[e.id]; await loadSlot(bag.active.draft?bag.draft:(pe||e.design),bag.active.draft?'':(pe?null:e.name)); normalizeActive(); save(); return {added:inc.designs.length,dropped}; }
  syncLive();
  const taken=new Set(bag.designs.map(d=>d.id)), map=new Map();
  for(const d of inc.designs){ const id=uniqueId(d.id,taken); taken.add(id); map.set(d.id,id); bag.designs.push({...d,id}); }
  for(const [k,v] of Object.entries(inc.pending)) bag.pending[map.get(k)]=v;
  if(inc.draft&&!bag.draft) bag.draft=inc.draft;
  const setIds=new Set(bag.sets.map(x=>x.id));
  for(const st of inc.sets){ const id=uniqueId(st.id,setIds); setIds.add(id); bag.sets.push({...st,id,terms:st.terms.map(t=>t.design?{...t,design:map.get(t.design)}:t)}); }
  const chIds=new Set(bag.characters.map(x=>x.id));
  for(const c of inc.characters){ if(!chIds.has(c.id)){ bag.characters.push(c); chIds.add(c.id); } }
  bag.sets.forEach(st=>{ if(st.character&&!chIds.has(st.character)){ delete st.character; dropped.push(`set ${st.name||st.id}: its character is missing`); } });
  for(const j of inc.jail) bag.jail.push({...j,design:map.get(j.design)});
  bag.log=[...bag.log,...inc.log].slice(-LOG_MAX);
  save(); return {added:inc.designs.length,dropped};
}
const bagFileName=()=>`${slug(bag.name,'pretty-dice-bag')}.bag.json`;
/* Is the bag changed since it was last saved to a file (or loaded from one)? Compared by content, so it survives reloads and undoing a change clears it. */
const BAG_SAVED='prettydice.bagsaved.v1';
/* What a bag FILE holds: every design in its current state (outstanding edits folded in) and no pending section, so a loaded file comes in clean. The live session keeps its pending edits, so Revert still works after saving. */
function bagFileJSON(){ const b=bagToJSON();
  for(const e of b.designs){ const p=b.pending[e.id]; if(p){ e.name=p.name||e.name; e.design={...p,name:e.name}; e.preview_shape=p.shape; } }
  b.pending={}; return b; }
function bagSig(){ const {designs,sets,characters,jail,draft,name}=bagFileJSON(); return JSON.stringify({designs,sets:sets.map(({last,...r})=>r),characters,jail,draft:draft&&(({shape,notation,...r})=>r)(draft),name}); }   // the draft's shape and roll formula are the mat's, not the bag's
function markBagSaved(){ try{ localStorage.setItem(BAG_SAVED,bagSig()); }catch{} }
function bagDirty(){ if(!bag) return false; try{ const v=localStorage.getItem(BAG_SAVED); if(v===null){ markBagSaved(); return false; } return v!==bagSig(); }catch{ return false; } }
/* PD-142.38.52: every path that writes the bag out (Save bag, the sheet's Save, Copy JSON, the "save first?" prompt) first commits every modified design with bagOps.save, the same as each design's own Save, so renames and slider edits are saved and no Modified dot is left behind */
async function commitDesigns(){ if(!bag) return; syncLive(); for(const id of Object.keys(bag.pending)){ if(!entryOf(id)) continue; await bagOps.save(id); } }
async function saveBagFile(){ await commitDesigns(); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(bagFileJSON(),null,2)],{type:'application/json'})); a.download=bagFileName(); a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); markBagSaved(); lastSig=''; renderBag(); }
async function copyBagJSON(){ await commitDesigns(); const txt=JSON.stringify(bagFileJSON(),null,2); let ok=false;
  try{ await navigator.clipboard.writeText(txt); ok=true; }catch{ try{ const t=document.createElement('textarea'); t.value=txt; t.style.cssText='position:fixed;opacity:0;top:0'; document.body.append(t); t.select(); ok=document.execCommand('copy'); t.remove(); }catch{} }
  return ok; }
$('sheetcopy').onclick=async()=>{ const b=$('sheetcopy'), ok=await copyBagJSON(); b.classList.toggle('ok',ok); setTimeout(()=>b.classList.remove('ok'),1500); };
{ const inp=$('setname'), btn=$('setsavebtn'); inp.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') btn.click(); };
  btn.onclick=()=>{ if(!bag) return; setOps.saveCurrent(inp.value); inp.value=''; btn.textContent='Saved to Sets'; clearTimeout(btn._t); btn._t=setTimeout(()=>{ btn.textContent='Save as set'; },3000); if(!$('bagsheet').hidden) renderSheet(); }; }   // always a new set (a copy); editing a set happens in the Sets list
$('bagsave').onclick=saveBagFile; $('sheetsave').onclick=saveBagFile;
let bagReplace=false;
const pickBag=replace=>{ bagReplace=replace; $('bagfile').click(); };
$('sheetload').onclick=()=>{ if(!bagDirty()) return pickBag(true); $('bagask').hidden=false; $('baskSave').focus(); };   // Load bag replaces this bag, so unsaved changes are offered a save first
$('baskSave').onclick=async()=>{ $('bagask').hidden=true; await saveBagFile(); pickBag(true); };
$('baskDiscard').onclick=()=>{ $('bagask').hidden=true; pickBag(true); };
$('baskCancel').onclick=()=>{ $('bagask').hidden=true; };
$('bagfile').onchange=async e=>{ const inp=e.target, f=inp.files[0]; if(!f) return;
  try{ const txt=await readText(f); inp.value=''; const r=await importBag(JSON.parse(txt.replace(/^﻿/,'')),{replace:bagReplace}); if(bagReplace){ markBagSaved(); lastSig=''; renderBag(); } if(r.dropped.length) alert(`Loaded ${r.added} design(s). Left out:\n- `+r.dropped.join('\n- ')); }
  catch(err){ inp.value=''; alert('Could not load bag: '+err.message); } };
/* ---------- dice bag browser (phase 2): shelf, All-designs sheet, menus, thumbnails ---------- */
const THUMBS_KEY='prettydice.thumbs.v2', thumbsOn=!(navigator.webdriver&&!new URLSearchParams(location.search).get('thumbs'));
let thumbs={}; try{ thumbs=JSON.parse(localStorage.getItem(THUMBS_KEY)||'{}')||{}; }catch{}
function pruneThumbs(){ const keep=new Set([...bag.designs.map(e=>thumbKey(bag.pending[e.id]||e.design)),...(bag.draft?[thumbKey(bag.draft)]:[])]);
  if(!bag.active.draft&&activeEntry()) keep.add(thumbKey(viewJSON())); for(const k of Object.keys(thumbs)) if(!keep.has(k)) delete thumbs[k]; }
function persistThumbs(){ pruneThumbs(); try{ localStorage.setItem(THUMBS_KEY,JSON.stringify(thumbs)); }catch{} }
let thumbTimer=null, touchedAt=0;
for(const t of ['pointerdown','keydown','input']) addEventListener(t,()=>{ touchedAt=performance.now(); },true);   // a person editing beats the background pass
function scheduleThumb(ms=900){ if(!thumbsOn||!bag||thumbTimer) return; thumbTimer=setTimeout(()=>{ thumbTimer=null; updateThumbs(); },ms); }   // not debounced: save() can fire all the time, so wait at most 900 ms
/* ---------- design pictures, drawn offscreen (PD-123) ----------
   One d20 in the design's look, in its own scene with its own camera and light, drawn into a render target: nothing on the stage is touched, so it can run whenever the page is idle,
   whatever the stage camera, a roll or the showcase spin are doing. three.js tone-maps and sRGB-encodes only what goes to the screen (or an XR target), so the target is marked as one
   (isXRRenderTarget, the flag three.js uses itself; three.js is pinned to 0.160). The die is drawn on a transparent clear at twice the size, then shrunk onto the stage's backdrop picture. */
const PIC_PX=144, PIC_RS=+new URLSearchParams(location.search).get("rs")||288; let picKit=null;
/* The view, lights and room turn were chosen by the owner in the thumbnail lab (2026-11-12, PD-131): a three-quarter view, a soft front key, a grazing sheen light from the right and a warm back light, so clear epoxy glows from inside, metal keeps its contrast and the number on the facing side stays readable. */
const PIC_Q=new THREE.Quaternion(-0.0641,0.8203,-0.2691,0.5005).normalize();   // the pre-PD-123 look (the stage pose and lights, a little closer) with the die turned by an icosahedral symmetry so the 20 faces the camera upright, leaning 8 degrees left like the old stage pictures
const picEnv=(rx=0,ry=0,rz=0)=>{ const room=new RoomEnvironment(), pg=new THREE.PMREMGenerator(renderer); room.rotation.set(rx,ry,rz); room.updateMatrixWorld(true); const t=pg.fromScene(room,0.04).texture; pg.dispose(); return t; };   // the studio room, turned, so its bright ceiling does not mirror in the top faces
function picGear(){ if(picKit) return picKit; const sc=new THREE.Scene(); sc.environment=picEnv(0,0,0);   // the same studio room as the stage, turned round so its bright ceiling lights are behind the die
  const l=new THREE.DirectionalLight(0xffffff,1.6); l.position.set(3,6,4); sc.add(l);   // a soft key from the front
    const cam=new THREE.PerspectiveCamera(29.7,1,.3,60); cam.position.set(0,0,5.4);   // the stage's own distance (so the lights read the same), zoomed in about 8% by the field of view for a slightly bigger die
  const rt=new THREE.WebGLRenderTarget(PIC_RS,PIC_RS,{samples:0}); rt.isXRRenderTarget=true; rt.texture.colorSpace=THREE.SRGBColorSpace;
  const big=document.createElement('canvas'); big.width=big.height=PIC_RS;
  return picKit={sc,cam,rt,buf:new Uint8Array(PIC_RS*PIC_RS*4),buf2:new Uint8Array(PIC_RS*PIC_RS*4),big,mask:new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false})}; }
/* one d20 in a design's look, ready to put in a scene: used by the offscreen pictures and by the thumbnail lab */
async function picDie(j){
  const L=lookFromDesign(j); await ensureFont(L.font);
  const spec=SHAPES.d20, verts=spec.verts(), R=Math.max(...verts.map(v=>v.length())); verts.forEach(v=>v.multiplyScalar(1/R));
  const faces=hull(verts), labs=assignLabels(faces,spec.labels), atlas=makeAtlas(faces.length,labs,L.font,L.numSoft,false,L.filigree!=='none'?{big:true,numSize:L.numSize}:{}),
    geo=buildGeometry(faces,atlas,L.radius,L.numSize,L.numRot,{panel:L.panel,panelDepth:L.panelDepth,filigree:L.filigree,soft:L.numSoft}), uni=makeUniforms(), mat=makeMaterial(atlas,uni);
  paintLook(L,uni,[mat]);
  const mesh=new THREE.Mesh(geo,mat);
  if(L.substrate==='epoxy'){ const inc=makeInclusion(L); if(inc){ mesh.add(inc); const inr=Math.min(...faces.map(f=>f.d)); inc.scale.setScalar(inr*L.inclSize); inc.position.set(0,L.inclY*inr,0); inc.rotation.set(0,THREE.MathUtils.degToRad(L.inclTurn),0); } }
  return {mesh,L,faces,labs,dispose(){ geo.dispose(); atlas.bump.dispose(); atlas.mask.dispose(); mat.dispose(); }}; }
async function renderDesignPicture(j){
  /* Drawn into a corner of the stage canvas (hidden for that instant, nothing else changes) rather than a render target: three.js's see-through (transmission) pass comes out paler and washed out in a render target,
     and the owner's old pictures, which were the stage itself, are the look to keep. It is all synchronous, so no frame ever shows it. */
  const g=picGear(), die=await picDie(j), mesh=die.mesh; mesh.quaternion.copy(PIC_Q); g.sc.add(mesh);
  const cvs=renderer.domElement, pr=renderer.getPixelRatio(), S=Math.max(32,Math.min(PIC_RS,cvs.width,cvs.height)), css=S/pr;
  const clr=new THREE.Color(), ca=renderer.getClearAlpha(), vp=new THREE.Vector4(), sc4=new THREE.Vector4(), sct=renderer.getScissorTest(), vis=cvs.style.visibility; renderer.getClearColor(clr); renderer.getViewport(vp); renderer.getScissor(sc4);
  const grab=()=>{ const c=document.createElement('canvas'); c.width=c.height=PIC_RS; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(cvs,0,cvs.height-S,S,S,0,0,PIC_RS,PIC_RS); return x.getImageData(0,0,PIC_RS,PIC_RS); };
  let col, msk;
  try{ cvs.style.visibility='hidden'; renderer.setRenderTarget(null); renderer.setScissorTest(true); renderer.setViewport(0,0,css,css); renderer.setScissor(0,0,css,css);
    renderer.setClearColor(0x191c26,1); renderer.render(g.sc,g.cam); col=grab();   // a see-through die refracts whatever is behind it: the dark backdrop colour
    g.sc.overrideMaterial=g.mask; renderer.setClearColor(0x000000,1); renderer.render(g.sc,g.cam); msk=grab(); }   // a flat white pass gives the die's outline (alpha)
  finally{ g.sc.overrideMaterial=null; renderer.setScissorTest(sct); renderer.setViewport(vp); renderer.setScissor(sc4); renderer.setClearColor(clr,ca); cvs.style.visibility=vis; g.sc.remove(mesh); die.dispose(); }
  for(let i=0;i<col.data.length;i+=4) col.data[i+3]=msk.data[i];
  g.big.getContext('2d').putImageData(col,0,0);
  const c=document.createElement('canvas'); c.width=c.height=PIC_PX; const ctx=c.getContext('2d'); ctx.imageSmoothingQuality='high';
  ctx.drawImage(scene.background.image,0,0,PIC_PX,PIC_PX); ctx.drawImage(g.big,0,0,PIC_PX,PIC_PX);   // the stage's backdrop, then the die
  const u=c.toDataURL('image/webp',.8); return u.startsWith('data:image/webp')?u:c.toDataURL('image/jpeg',.8); }
async function updateThumbs(){   // idle for a moment: picture the live design, then any design that has no picture yet, one per slice. Always a single d20 (a design's look, not a set).
  if(thumbBusy||actBusy||!bag) return; if(rolling||performance.now()-touchedAt<1200){ scheduleThumb(500); return; }   // low priority: a roll or a person at work goes first
  thumbBusy=true;
  try{ const live=viewJSON(), todo=[]; if(!thumbs[thumbKey(live)]) todo.push({json:live});
    for(const e of bag.designs){ if(e.id===bag.active.design&&!bag.active.draft) continue; const j=bag.pending[e.id]||e.design; if(!thumbs[thumbKey(j)]) todo.push({json:j}); }
    if(bag.draft&&!bag.active.draft&&!thumbs[thumbKey(bag.draft)]) todo.push({json:bag.draft});
    const more=todo.length>1;   // one picture per slice, then yield: a bag of ten designs must not freeze the page
    if(todo.length){ const u=await renderDesignPicture(todo[0].json); if(u) thumbs[thumbKey(todo[0].json)]=u; }
    persistThumbs(); renderBag(); if(more) setTimeout(()=>scheduleThumb(300),0);
  }catch(err){ console.warn('thumbnail pass failed',err); }finally{ thumbBusy=false; } }
const swatch=chipThumb;
const lastThumb={};   // per design id: the most recent real picture, kept on screen until the new one lands (no flash of the stand-in while editing)
function thumbStyle(j,id){ const u=thumbs[thumbKey(j)]; if(u){ if(id) lastThumb[id]=u; return `url(${u})`; } return id&&lastThumb[id]?`url(${lastThumb[id]})`:chipThumb(j); }

const el=(tag,cls,txt)=>{ const n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; };
function slots(){   // what the shelf and sheet show, in order: designs, then the draft
  const out=bag.designs.map(e=>{ const live=!bag.active.draft&&bag.active.design===e.id; const j=live?viewJSON():(bag.pending[e.id]||e.design);
    return {id:e.id,name:live?(j.name||e.name):(bag.pending[e.id]?.name||e.name),json:j,on:live,mod:isModified(e.id)}; });
  if(bag.draft||bag.active.draft) out.push({id:'draft',name:(bag.active.draft?viewJSON():bag.draft).name||'Draft',json:bag.active.draft?viewJSON():bag.draft,on:bag.active.draft,draft:true});
  if(lookSnap) out.push({id:'game',name:'Story Dice look (draft)',json:liveJSON(),on:false,draft:true,game:true});   // PD-187: the temporary game look is shown as its own dashed, inert tile (saving comes later)
  return out; }
let lastSig='', lastCenter=null;
$('dkeep').onclick=()=>bagOps.save(); $('dcopy').onclick=()=>bagOps.saveCopy(); $('ddiscard').onclick=()=>bagOps.revert();   // PD-142.38.36: the very handlers of the Bag tab block (save() keeps a draft, revert() discards it), so the two places always agree   // PD-142.38.17: Keep / Discard sit next to Randomize in the Look tab
function renderBag(){
  if(!bag) return; renderQBar(); const e=activeEntry(), n=bag.designs.length, draft=bag.active.draft, mod=!draft&&isLiveModified();
  $('draftact').hidden=!(draft||mod)||!!lookSnap; if(draft||mod){ $('draftth').style.backgroundImage=thumbStyle(viewJSON(),draft?'draft':bag.active.design); $('draftname').textContent=draft?'Random draft':(viewJSON().name||e.name); $('draftpos').textContent=draft?`unsaved · bag of ${n}`:`Modified · ${bag.designs.indexOf(e)+1} of ${n} in ${bag.name}`; $('dkeep').textContent=draft?'Keep':'Save'; $('dcopy').hidden=draft; $('ddiscard').textContent=draft?'Discard':'Revert'; } $('bagname').textContent=draft?'Random draft':(viewJSON().name||e.name); $('bagpos').textContent=draft?`unsaved · bag of ${n}`:`${bag.designs.indexOf(e)+1} of ${n} in ${bag.name}`;
  $('bagth').style.backgroundImage=thumbStyle(viewJSON(),bag.active.draft?'draft':bag.active.design); $('modbadge').hidden=!(mod); $('bagact').hidden=!(mod||draft)||!!lookSnap;
  { const dirty=bagDirty(); $('bagdirty').hidden=!dirty; $('sheetbag').hidden=!dirty; $('sheetsave').classList.toggle('dirty',dirty); $('bagbtn').classList.toggle('dirty',dirty); }
  const uses=draft?0:bag.sets.filter(st=>st.terms.some(t=>t.design===e.id)).length;
  $('bsave').textContent=draft?'Keep':(uses?`Save · changes ${uses} set${uses>1?'s':''}`:'Save'); $('bcopy').hidden=draft; $('brevert').textContent=draft?'Discard':'Revert';
  if(document.activeElement&&document.activeElement.classList.contains('nmedit')) return;   // never rebuild under a name being typed
  const sl=slots(), sig=JSON.stringify([sl.map(x=>[x.id,x.name,x.on,!!x.mod,thumbKey(x.json),!!thumbs[thumbKey(x.json)]]),bag.name]); if(sig===lastSig) return; lastSig=sig;
  const cards=$('cards'), keep=cards.scrollLeft; cards.replaceChildren(...sl.map(x=>cardEl(x)),plusEl('card plus'));
  cards.scrollLeft=keep;   // the strip stays where it was; it only moves to bring a newly selected card into view (a card you just tapped is already in view)
  const on=cards.querySelector('.card.on'); if(on&&lastCenter!==x_id(on)){ const first=lastCenter===null; lastCenter=x_id(on); if(first||!cardInView(on)) centerCard(on,false); }
  if(!$('bagsheet').hidden) renderSheet();
}
const x_id=n=>n.dataset.id;
function nameEl(x){ const n=el('span','nm',x.name); n.title='Click to rename'; n.onclick=e=>{ e.stopPropagation(); if(longFired){ longFired=false; return; } editName(n,x.id); }; return n; }
function editName(span,id){ const cur=span.textContent, inp=el('input','nmedit'); inp.type='text'; inp.value=cur; inp.maxLength=80; inp.setAttribute('aria-label','Design name'); span.replaceWith(inp); inp.focus(); inp.select(); let done=false;
  const fin=ok=>{ if(done) return; done=true; inp.onblur=null; inp.blur(); if(ok&&inp.value.trim()&&inp.value.trim()!==cur) bagOps.rename(id,inp.value); lastSig=''; renderBag(); if(!$('bagsheet').hidden) renderSheet(); };
  inp.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') fin(true); else if(e.key==='Escape') fin(false); }; inp.onblur=()=>fin(true);
  for(const t of ['click','pointerdown','pointerup']) inp.addEventListener(t,e=>e.stopPropagation()); }
function cardEl(x){ const b=el('div','card'+(x.on?' on':'')+(x.draft?' ghost':'')); b.dataset.id=x.id; b.tabIndex=0; b.setAttribute('role','option'); b.setAttribute('aria-selected',x.on);
  b.onkeydown=e=>{ if((e.key==='Enter'||e.key===' ')&&e.target===b){ e.preventDefault(); b.click(); } };
  const th=el('div','th'); th.style.backgroundImage=thumbStyle(x.json,x.id); if(x.mod) th.append(el('span','dot')); if(x.game){ b.classList.add('inert'); b.title=GAME_LOOK_TIP; b.append(th,el('span','nm',x.name)); return b; } b.append(th,nameEl(x)); wireCard(b,x); return b; }
const GAME_LOOK_TIP='Temporary look for this game; saving comes later';
function plusEl(cls){ const b=el('button',cls); b.type='button'; const th=el('div','th','+'); b.append(th,el('span','nm','Add')); b.onclick=e=>openMenu(b,addItems()); return b; }
const cardInView=c=>{ const box=$('cards'), mid=c.offsetLeft+c.offsetWidth/2; return mid>=box.scrollLeft&&mid<=box.scrollLeft+box.clientWidth; };
function centerCard(c,smooth=true){ progScroll=Date.now(); const box=$('cards'); box.scrollTo({left:c.offsetLeft-box.clientWidth/2+c.offsetWidth/2,behavior:smooth?'smooth':'instant'}); }
let progScroll=0, longFired=false;
function wireCard(b,x){ let t=null,sx=0,sy=0;
  b.addEventListener('pointerdown',e=>{ longFired=false; sx=e.clientX; sy=e.clientY; clearTimeout(t); t=setTimeout(()=>{ longFired=true; openMenu(b,cardItems(x.id)); },500); });
  const cancel=()=>clearTimeout(t); b.addEventListener('pointerup',cancel); b.addEventListener('pointerleave',cancel); b.addEventListener('pointercancel',cancel);
  b.addEventListener('pointermove',e=>{ if(Math.hypot(e.clientX-sx,e.clientY-sy)>8) cancel(); });
  b.addEventListener('contextmenu',e=>{ e.preventDefault(); cancel(); longFired=true; openMenu(b,cardItems(x.id)); });
  b.onclick=()=>{ if(longFired){ longFired=false; return; } if(!x.on) activate(x.id==='draft'?'draft':x.id); }; }   // tapping a card selects it without moving the strip
/* shelf: scrolling only browses; a tap picks the design (owner decision 2026-11-11). Rotating the phone or resizing re-centres the strip on the active card. */
new ResizeObserver(()=>{ progScroll=Date.now(); const on=$('cards').querySelector('.card.on'); if(on) centerCard(on,false); }).observe($('cards'));

/* the mouse wheel scrolls the shelf sideways (a trackpad's sideways swipe already does) */
$('cards').addEventListener('wheel',e=>{ if(Math.abs(e.deltaY)<=Math.abs(e.deltaX)) return; e.preventDefault(); $('cards').scrollBy({left:e.deltaY}); },{passive:false});
/* a mouse can drag the shelf like a finger can (touch and trackpads scroll it natively) */
{ const box=$('cards'); let sx=0, s0=0, down=false, moved=false;
  box.addEventListener('pointerdown',e=>{ if(e.pointerType!=='mouse'||e.button!==0) return; down=true; moved=false; sx=e.clientX; s0=box.scrollLeft; });
  addEventListener('pointermove',e=>{ if(!down) return; const dx=e.clientX-sx; if(!moved&&Math.abs(dx)<6) return;
    if(!moved){ moved=true; box.style.scrollSnapType='none'; box.style.cursor='grabbing'; } box.scrollLeft=s0-dx; });
  const end=()=>{ if(!down) return; down=false; if(moved){ box.style.scrollSnapType=''; box.style.cursor='';
 } };   // the strip snaps to the nearest card; the selection does not change
  addEventListener('pointerup',end); addEventListener('pointercancel',end);
  box.addEventListener('click',e=>{ if(moved){ moved=false; e.stopPropagation(); e.preventDefault(); } },true); }   // the click that ends a drag is not a tap on a card

/* menus */
let menuAnchor=null, menuEl=null, menuShut=null;   // tapping the same ⋯ again closes the menu instead of reopening it
function openMenu(anchor,items){ if(menuShut&&menuShut.a===anchor&&Date.now()-menuShut.t<500){ menuShut=null; return; } menuEl=anchor; { const r0=anchor.getBoundingClientRect(); menuAnchor={getBoundingClientRect:()=>r0}; } const m=$('cardmenu'); m.replaceChildren(); for(const it of items){ if(it.head){ m.append(el('div','mh',it.head)); continue; }
    const b=el('button',it.danger?'danger':'',it.label); b.type='button'; if(it.disabled) b.disabled=true; b.onclick=()=>{ closeMenu(); it.run(); }; m.append(b); }
  m.hidden=false; const r=anchor.getBoundingClientRect(), w=m.offsetWidth, h=m.offsetHeight;
  m.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px'; m.style.top=Math.max(8,(r.top-h-6>8?r.top-h-6:r.bottom+6))+'px'; }
function closeMenu(){ $('cardmenu').hidden=true; }
addEventListener('pointerdown',e=>{ if(!$('cardmenu').hidden&&!e.target.closest('#cardmenu')){ menuShut=menuEl&&menuEl.contains&&menuEl.contains(e.target)?{a:menuEl,t:Date.now()}:null; closeMenu(); } },true);
const addItems=()=>[{head:'Add to the bag'},{label:'Blank draft',run:()=>blankDraft()},{label:'Random draft',run:()=>randomize()},{label:'From a file…',run:()=>{ bagReplace=false; $('bagfile').click(); }}];
function cardItems(id){
  if(id==='game'||(id==='draft'&&lookSnap)) return [{label:'Saving comes later (game look is temporary)',disabled:true,run:()=>{}}];
  if(id==='draft') return [{label:'Keep in the bag',run:()=>bagOps.keep()},{label:'Discard draft',danger:true,run:()=>bagOps.discard()}];
  const k=bag.designs.findIndex(d=>d.id===id), last=bag.designs.length-1;
  const uses=bag.sets.filter(st=>st.terms.some(t=>t.design===id)).length;
  const edits=isModified(id)&&!frozenId(id)?[{head:'Modified'},{label:uses?`Save · changes ${uses} set${uses>1?'s':''}`:'Save',run:()=>bagOps.save(id)},{label:'Save as copy',run:()=>bagOps.saveCopy(id)},{label:'Revert',run:()=>bagOps.revert(id)},{head:'Design'}]:[];
  return [...edits,{label:'Rename…',run:()=>setTimeout(()=>{ const n=document.querySelector(`#bagsheet:not([hidden]) .tile[data-id="${id}"] .nm`)||document.querySelector(`#cards .card[data-id="${id}"] .nm`); if(n) editName(n,id); },0)},{label:'Duplicate',run:()=>bagOps.duplicate(id)},
    {label:'Move left',disabled:k===0,run:()=>bagOps.move(id,k-1)},{label:'Move right',disabled:k===last,run:()=>bagOps.move(id,k+1)},
    {label:'Move to start',disabled:k===0,run:()=>bagOps.move(id,0)},{label:'Move to end',disabled:k===last,run:()=>bagOps.move(id,last)},
    {label:'Delete…',danger:true,disabled:last===0,run:()=>setTimeout(()=>openMenu(menuAnchor,[{head:`Delete "${entryOf(id).name}"?`},{label:'Delete',danger:true,run:()=>bagOps.remove(id)},{label:'Cancel',run:()=>{}}]),0)}]; }

/* All-designs sheet, with drag-to-reorder (long-press on a phone) */
/* The bag's name sits in the sheet title and can be edited there; it is also the base of the saved file's name. */
function setSheetTitle(count){ const t=$('sheettitle'), n=el('span','bn',bag.name); n.title='Click to rename the bag (also the saved file name)'; n.onclick=()=>editBagName(n); t.replaceChildren(n,el('span','',` · ${count}`)); }
function editBagName(span){ const cur=bag.name, inp=el('input','nmedit bnedit'); inp.type='text'; inp.value=cur; inp.maxLength=80; inp.setAttribute('aria-label','Bag name'); span.replaceWith(inp); $('sheethead').classList.add('renaming'); inp.focus(); inp.select(); let done=false;
  const fin=ok=>{ if(done) return; done=true; inp.onblur=null; $('sheethead').classList.remove('renaming'); const v=inp.value.trim().slice(0,80); if(ok&&v&&v!==cur){ bag.name=v; save(); } lastSig=''; renderBag(); renderSheet(); };
  inp.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') fin(true); else if(e.key==='Escape') fin(false); }; inp.onblur=()=>fin(true); }
function renderSheet(){ for(const b of document.querySelectorAll('#sheettabs button')) b.classList.toggle('on',b.dataset.tab===sheetTab); $('tiles').hidden=sheetTab!=='designs'; $('setlist').hidden=sheetTab!=='sets'; if(sheetTab==='sets'){ renderSets(); return; }
  const sl=slots(), box=$('tiles'); setSheetTitle(`${bag.designs.length} design${bag.designs.length===1?'':'s'}${sl.some(x=>x.draft)?' + draft':''}`);
  box.replaceChildren(...sl.map(x=>{ const t=el('div','tile'+(x.on?' on':'')+(x.draft?' ghost':'')); t.dataset.id=x.id; const th=el('div','th'); th.style.backgroundImage=thumbStyle(x.json,x.id); if(x.mod) th.append(el('span','dot'));
      if(x.game){ t.classList.add('inert'); t.title=GAME_LOOK_TIP; t.append(th,el('span','nm',x.name)); return t; }
      const dots=el('button','dots','⋯'); dots.type='button'; dots.setAttribute('aria-label','Menu for '+x.name); dots.onclick=e=>{ e.stopPropagation(); openMenu(dots,cardItems(x.id)); };
      const nm=nameEl(x); nm.className='nm'; t.append(th,nm,dots); t.onclick=()=>{ if(dragMoved){ dragMoved=false; return; } closeSheet(); activate(x.id==='draft'?'draft':x.id); }; if(!x.draft) wireDrag(t,x.id); return t; }),
    (()=>{ const t=el('div','tile plus'); t.append(el('div','th','+'),el('div','nm','Add')); t.onclick=()=>openMenu(t,addItems()); return t; })()); }
let sheetTab='designs';
for(const b of document.querySelectorAll('#sheettabs button')) b.onclick=()=>{ sheetTab=b.dataset.tab; closeMenu(); renderSheet(); };
/* ---------- bag sets (PD-102.4): named rolls owned by the bag; the roll log (PD-68) ---------- */
const setNotation=st=>fmtNotation(st.terms,st.mod||0,st.group);
const newSetName=()=>{ const used=new Set(bag.sets.map(x=>x.name)); let n=bag.sets.length+1; while(used.has(`Set ${n}`)) n++; return `Set ${n}`; };
let rollSetId=null;   // the bag set whose dice are on the mat now (its last result is kept on the set)
const dieName=t=>`d${t===100?'%':t}`;
/* What is on the stage as a set: the custom formula when Custom is selected, otherwise the selected shape (Standard 7 keeps its name). */
function currentDice(){
  if(state.shape==='custom'){ const p=parseNotation(state.notation); if(!p.error) return {terms:structuredClone(p.terms),mod:p.mod,...(p.group>1?{group:p.group}:{}),name:fmtNotation(p.terms.map(({design,...r})=>r),p.mod,p.group)}; }
  if(state.shape==='set7') return {terms:SET7.map(([id])=>({count:1,sides:id==='dpct'?100:+id.slice(1)})),mod:0,name:'Standard 7'};
  const sh=SHAPES[state.shape]; if(sh&&sh.pair) return {terms:[{count:1,sides:100}],mod:0,name:'d%'};
  const m=/^d(\d+)$/.exec(state.shape); if(m&&(+m[1] in SIDES)) return {terms:[{count:1,sides:+m[1]}],mod:0,name:state.shape};
  return {terms:[{count:1,sides:20}],mod:0,name:'d20'}; }
const setOps={
  find(id){ return bag.sets.find(x=>x.id===id); },
  saveCurrent(name){ const cur=currentDice(), terms=cur.terms; name=uniqueName(bag.sets.map(x=>x.name),String(name||'').trim().slice(0,80)||cur.name);
    const st={id:uniqueId(slug(name,'set'),new Set(bag.sets.map(x=>x.id))),name,terms:structuredClone(terms),mod:cur.mod,...(cur.group>1?{group:cur.group}:{})}; bag.sets.push(st); save(); return st.id; },
  create({name,terms,mod,table,group}){ if(!terms||!terms.length) return null; name=uniqueName(bag.sets.map(x=>x.name),String(name||'').trim().slice(0,80)||'Set'); const st={id:uniqueId(slug(name,'set'),new Set(bag.sets.map(x=>x.id))),name,terms:structuredClone(terms),mod:mod||0,...(group>1?{group}:{})}; const t=String(table||'').slice(0,2000); if(t.trim()) st.table=t; bag.sets.push(st); save(); return st.id; },   // PD-142.14.3.1.4: a draft becomes a set only when Save is pressed
  copy(id){ const k=bag.sets.findIndex(x=>x.id===id), st=bag.sets[k]; if(!st) return null; const c=structuredClone(st); delete c.last; c.name=uniqueName(bag.sets.map(x=>x.name),`${st.name.replace(/ copy(?: \d+)?$/,'')} copy`);
    c.id=uniqueId(slug(c.name,'set'),new Set(bag.sets.map(x=>x.id))); bag.sets.splice(k+1,0,c); save(); return c.id; },
  edit(id,{name,terms,mod,table}){ const st=this.find(id); if(!st||!terms||!terms.length) return false; name=uniqueName(bag.sets.filter(x=>x!==st).map(x=>x.name),String(name||'').trim().slice(0,80)||st.name); st.name=name; st.terms=structuredClone(terms); st.mod=mod||0; if(table!==undefined){ const t=String(table||'').slice(0,2000); if(t.trim()) st.table=t; else delete st.table; } delete st.last; save(); return true; },
  update(id){ const st=this.find(id); if(!st) return; const cur=currentDice(); st.terms=cur.terms; st.mod=cur.mod; delete st.last; save(); },
  rename(id,name){ const st=this.find(id); name=String(name||'').trim().slice(0,80); if(!st||!name) return; st.name=uniqueName(bag.sets.filter(x=>x!==st).map(x=>x.name),name); save(); },
  remove(id){ const k=bag.sets.findIndex(x=>x.id===id); if(k<0) return; bag.sets.splice(k,1); if(bag.active.set===id) bag.active.set=null; if(rollSetId===id) rollSetId=null; save(); },
  move(id,to){ const k=bag.sets.findIndex(x=>x.id===id); if(k<0) return; to=Math.max(0,Math.min(bag.sets.length-1,to)); const [x]=bag.sets.splice(k,1); bag.sets.splice(to,0,x); save(); },
  /* the row's main action: the set's dice are set out on the mat, not thrown (selecting is not rolling); {roll:true} throws them at once */
  open(id,{roll=false}={}){ const st=this.find(id); if(!st||gameDiceFixed(!gameRun()||sameDiceAsGame(setNotation(st)))) return false; checkpoint(); const gr=gameRun(), poses=gr?bodies.map(b=>({p:b.position.clone(),q:b.quaternion.clone()})):null; state.notation=setNotation(st); state.shape='custom'; bag.active.set=id; rollSetId=id; closeSheet(); buildDice(); if(gr){ pendingLay={n:dice.length,poses}; startRoll(false,true); gameSync(); renderGame(); } else startRoll(false,!roll); syncUI(); save(); return true; },
  /* the lightning button: a result without leaving the screen */
  quick(id){ const st=this.find(id); if(!st) return null;
    if(gameRun()){ if(!gameDiceFixed(sameDiceAsGame(setNotation(st)))) this.open(id); return null; }   // PD-192 D: a running game fixes the dice: a set with other dice is declined, a same-dice set applies as a look only; never a roll, never a log row
    let total=st.mod||0;
    if(st.group>1){ const g=rollGroup(st.terms,st.mod||0,st.group,()=>rng()), shown=g.totals.join(' · '); st.last={total:shown,at:Date.now()};
      addLog({set:st.name,notation:setNotation(st),total:shown,items:g.items,modText:'',quick:true}); showQuick(st.name,shown,g.items,''); return shown; }
    const dealt=dealTerms(st.terms), glyphOnly=!st.mod&&st.terms.every((t,ti)=>dealt[ti]), items=st.terms.map((t,ti)=>{ const r=[]; for(let i=0;i<t.count;i++) r.push(1+Math.floor(rng()*t.sides)); const ks=keepSum(r,t.keep); total+=ks.sum; return {sides:t.sides,design:t.design,text:keepLine({count:t.count,sides:t.sides,keep:t.keep},r,ks,dealt[ti]?r.map((v,i)=>faceName(dealt[ti][i][v-1])):null,glyphOnly).replace(/^\d+d\d+/,m=>t.count+dieName(t.sides))}; });
    const modText=st.mod?`${st.mod>0?'+':''}${st.mod}`:'', detail=items.map(i=>i.text).join('  ·  ')+(modText?'  ·  '+modText:''); st.last={total,at:Date.now()};
    const look=st.table?lookupTable(st.table,total):null; addLog({set:st.name,notation:setNotation(st),total:glyphOnly?'':String(total),detail,items,modText,quick:true,...(look?{lookup:look}:{})}); showQuick(st.name,total,items,modText,look); return total; }
};
/* roll lines: a mini die chip in front of each term's text, like the set list */
const designChipJ=id=>{ const e=id&&entryOf(id); return e?(bag.pending[e.id]||e.design):liveChipJ(); };
/* a group roll (PD-142.14.1.2): the same terms rolled N separate times, each with the modifier added; one line per roll */
function groupLine(terms,mod,vals,n){ const ks=terms.map((t,i)=>keepSum(vals[i],t.keep)), total=ks.reduce((a,k)=>a+k.sum,0)+mod;
  const parts=terms.map((t,i)=>vals[i].map((v,j)=>ks[i].kept.has(j)?v:`(${v})`).join('+')).join(' + ');
  return {total,item:{sides:terms[0].sides,design:terms[0].design,text:`#${n}: ${parts}${mod?` ${mod>0?'+':'−'} ${Math.abs(mod)}`:''}${vals.flat().length>1||mod?' = '+total:''}`}}; }
function rollGroup(terms,mod,group,rnd){ const totals=[], items=[];
  for(let g=0;g<group;g++){ const vals=terms.map(t=>{ const r=[]; for(let i=0;i<t.count;i++) r.push(1+Math.floor(rnd()*t.sides)); return r; }), l=groupLine(terms,mod,vals,g+1); totals.push(l.total); items.push(l.item); }
  return {totals,items}; }
function rollItemsEl(items,modText){ const f=document.createDocumentFragment();
  for(const it of items){ const sp=el('span','rt'); if(it.sides){ const c=chipEl(it.sides,designChipJ(it.design),{label:null}), e=it.design&&entryOf(it.design); if(e) c.title=e.name; sp.append(c); } sp.append(it.text); f.append(sp); }
  if(modText) f.append(el('span','rt',modText)); return f; }
/* the quick roll bar (PD-142.14.1.6): rolls a formula, a saved set or one plain die right at the table */
function tableRoll(notation,launch=false,vel=null){ const p=parseNotation(notation,true); if(p.error) return p.error; checkpoint(); bag.active.set=null; rollSetId=null; const nn=fmtNotation(p.terms,p.mod,p.group), same=(rolling||placed)&&dice.length&&rollKey==='custom|'+nn; state.notation=nn; state.shape='custom'; closeSheet&&closeSheet(); if(!same) buildDice(); startRoll(launch&&same,false,vel); syncUI(); save(); return null; }   // a formula equal to the dice on the mat reuses them, so held dice stay held (PD-142.1.1)
let qbarSig='';
/* the dock (PD-142.38 slice 2; was the quick roll bar): a formula box and the one Roll button. dockRoll is the single way to throw in roll view: the button, Enter in the box, R, a flick and a shake all call it */
const DOCK_TIP='Type dice, e.g. 4d6kh3+2, then Enter or Roll. Empty = the dice on the mat';
function dockRoll(launch=false,vel=null){ const inp=$('rollbox'), v=inp&&!game?inp.value.trim():''; if(!v){ startRoll(launch||(game?rolling:placed),false,vel); return; }
  if(!game&&storyPrev&&!parseNotation(v,true).error){ syncGameLook(true); setPane('table'); }   // PD-192 B: a quick roll with a game selected but not started releases the game look and rolls the player's own dice on the Table; the selection stays, and the Games tab previews it again when reopened (PD-191)
  const err=tableRoll(v,launch,vel); dockFail(inp,err); if(!err) syncDock(); }   // the text stays in the box after a roll, so a mistyped formula can be edited (PD-142.14.1.6.2)
function dockFail(inp,err){ inp.classList.toggle('bad',!!err); inp.title=err||DOCK_TIP; const q=$('qerr'); if(!q) return; q.textContent=err||''; q.hidden=!err; if(err){ q.style.bottom=Math.max(8,$('stage').clientHeight-$('qbar').offsetTop+6)+'px'; clearTimeout(dockFail.t); dockFail.t=setTimeout(()=>{ q.hidden=true; },6000); } }
function syncDock(){ const inp=$('rollbox'); if(!inp) return; const st=rollSetId&&bag&&setOps.find(rollSetId); inp.placeholder=(state.shape==='custom'?state.notation:SHAPES[state.shape].label)+(st?' · '+st.name:''); }   // the placeholder says what is loaded
const dockTerms=(inp,base)=>{ const v=inp.value.trim()||base||'', p=v?parseNotation(v,true):{terms:[],mod:0,group:1}; if(p.error){ inp.classList.add('bad'); inp.title=p.error; return null; } inp.classList.remove('bad'); inp.title=DOCK_TIP; return p; };
function dockLoad(n,add=false){ const inp=$('rollbox'); if(!inp) return; if(!add){ inp.classList.remove('bad'); inp.title=DOCK_TIP; inp.value='1d'+n; formulaSync(); return; } const p=dockTerms(inp); if(!p) return; const t=p.terms.find(t=>t.sides===n&&!t.keep&&!t.design&&!t.faces); if(t) t.count++; else p.terms.push({count:1,sides:n}); inp.value=fmtNotation(p.terms,p.mod,p.group); formulaSync(); }   // PD-142.38.11: a tap REPLACES the box with one die; a double-click or long press ADDS one to the formula; it never throws
function dockAdv(mode,add=false){ const inp=$('rollbox'); if(!inp) return; const one={count:2,sides:20,keep:{mode,n:1}};   // PD-142.38.46: like the Custom set Adv/Dis chips: a tap REPLACES the box with d20adv / d20dis; double-click or long press ADDS that term to the formula (never modifies an existing die)
  if(!add){ inp.classList.remove('bad'); inp.title=DOCK_TIP; inp.value=fmtNotation([one],0,1); formulaSync(); return; }
  const p=dockTerms(inp,state.shape==='custom'?state.notation:''); if(!p) return; p.terms.push(one); inp.value=fmtNotation(p.terms,p.mod,p.group); formulaSync(); }
/* PD-142.38 slice 3: in a game the dock is the game's one Roll button plus the turn actions (Bank, Set aside, Cash out) and a short hint; the panel keeps picks, bids and scorecards. The conditions are the ones the panel buttons used */
function renderDock(){ const go=$('rollbtn'), act=$('dockact'), hint=$('dockhint'); if(!go||!act||!hint) return; act.replaceChildren(); hint.textContent=''; hint.classList.remove('sent'); hint.removeAttribute('title');
  { const q0=$('qbar'); if(q0) q0.classList.remove('storyq','rating'); }   // PD-186: leaving a story game (end, setup, other game) must give the one-row dock back
  if(!game||game.setup){ go.textContent='Roll'; go.disabled=false; return; }
  const S=game.state, st=GAMES.status(S,gviewer()), over=st.phase==='over', id=game.id, farkle=id==='farkle', pass=needPass(), busy=st.botTurn||pass||gameAwaiting||(rolling&&!settled);
  const btn=(txt,fn,dis,cls)=>{ const b=el('button','',txt); b.type='button'; b.disabled=!!dis; if(cls) b.dataset.act=cls; b.onclick=fn; act.append(b); return b; };
  go.title='Roll the dice (R)'; go.disabled=true; go.textContent='Roll';
  const qb=$('qbar'); if(qb) qb.classList.remove('storyq','rating');
  if(id==='story'&&!pass) return renderStoryDock(S,st,over,go,btn,hint,qb);   // PD-176: the story sentence, rating and result live in the dock so the side pane can stay closed
  if(over){ return; }
  if(pass){ hint.textContent='Pass the device'; return; }
  if(id==='liarsdice'){ const n=GAMES.rollSpec(S).slots.length; go.textContent=n>0&&st.phase==='roll'?'Roll '+n+(n>1?' dice':' die')+' under the cup':'Roll'; go.disabled=busy||st.phase!=='roll';
    hint.textContent=st.botTurn?S.players[st.player]+' is thinking…':st.phase==='reveal'?'Next round':st.phase==='roll'?'':'Bid or challenge'; return; }
  const n=GAMES.rollSpec(S).slots.length; go.disabled=!st.canRoll||busy;
  if(id==='craps'){ if(crapsHold()){ hint.textContent='Place your bets, then Ready'; btn('Ready',crapsReady,false,'ready'); } btn('Cash out',gameCashOut,betsLocked(),'cashout'); return; }
  if(id==='yahtzee'){ if(whoop) act.append(whoopBtn()); if(gpv&&!whoop) hint.textContent=(gpv.mode==='long'?'Hold ':'Double tap ')+gpv.label+(gpv.pts!=null?' ('+gpv.pts+')':'')+' to score it'; go.textContent=st.canRoll&&st.rollsUsed?'Roll '+n+(n>1?' dice':' die'):'Roll'; if(!st.canRoll&&!hint.textContent) hint.textContent='Pick a box'; return; }
  go.textContent=st.canRoll&&farkle&&st.turnTotal?'Roll '+n+(n>1?' dice':' die'):'Roll'; if(!st.canRoll) hint.textContent=farkle?'Set aside first':'Close tiles first';
  if(['farkle','pig','shipcaptain'].includes(id)) btn('Bank '+(id==='shipcaptain'?st.cargo:st.turnTotal),gameBank,!st.canBank||gameAwaiting,'bank');
  if(farkle&&st.canScore) btn(gsel.size?'Set aside '+gsel.size+(gsel.size>1?' dice':' die'):'Tap dice to set aside',()=>gameSetAside(gsel),!gsel.size||!settled,'aside'); }
const judgeLabel=n=>n&&String(n).trim()?'Judge '+String(n).trim()+"'s story":'Judge this story';   // PD-184: never a dangling "Judge 's story"
/* PD-192: one sentence in one voice for the status line, the panel and the dock; the scale is written once in the panel (storyScale) and is on the buttons */
const storyRatings=()=>game&&game.info.ratings||[];
const storyScale=()=>'Rate the story: '+storyRatings().map(r=>r.label+' '+r.points).join(' · ');
function storyRateLine(S,st){ const nm=String(S.players[st.player]||'').trim(), bots=S.bots||[], others=S.players.some((_,i)=>i!==st.player&&!bots.includes(i));
  if(st.botTurn) return (nm||'The bot')+' told a story: rate it';
  const pre=S.players.length>1&&nm?nm+': ':'';
  return others?pre+'tell it. Everyone else judges':pre+(pre?'tell it, then rate your own story':'Tell it, then rate your own story'); }
function storyOverText(S){ const res=GAMES.result(S); return S.players.length===1?'Game over: your total: '+res.ranking[0].total:'Game over: '+res.winners.map(i=>S.players[i]).join(' & ')+' win'+(res.winners.length>1?'':'s')+' with '+res.ranking[0].total; }
function storyRateBtn(r,fn,act){ const b=document.createElement('button'); b.type='button'; b.className='rbtn'; b.dataset.rate=r.id; if(act) b.dataset.act=act; b.setAttribute('aria-label',r.label+' '+r.points); b.title=r.label+' = '+r.points+' points'; b.append(Object.assign(document.createElement('b'),{textContent:r.label}),Object.assign(document.createElement('i'),{textContent:String(r.points)})); b.onclick=fn; return b; }
function renderStoryDock(S,st,over,go,btn,hint,qb){   // PD-176
  if(qb) qb.classList.add('storyq'); go.disabled=true; go.textContent='Roll';
  if(over){ hint.textContent=storyOverText(S); return; }
  const who=S.players.length>1?S.players[st.player]:'';
  if(st.phase==='rate'){
    hint.textContent=storyRateLine(S,st); hint.title=storyScale();   // the sentence itself is drawn on the mat (storyui .ssent); the scale is on the buttons
    if(qb) qb.classList.add('rating');   // PD-192: five 44 px buttons in one row; the disabled Roll steps aside while rating
    for(const r of storyRatings()) $('dockact').append(storyRateBtn(r,()=>storyRate(r.id),'rate-'+r.id)); return; }
  hint.classList.remove('sent');
  go.disabled=!st.canRoll||st.botTurn||gameAwaiting||(rolling&&!settled);
  hint.textContent=(gameMsg?'Last story '+gameMsg+' · ':'')+(st.botTurn?(st.phase==='roll'?'The bot is rolling':'The bot is arranging the dice'):st.phase==='roll'?'Roll the dice':'Put the dice in story order'); }
function renderQBar(){ const bar=$('qbar'), chips=$('dicechips'); if(!bag||!bar) return; const sig=bag.sets.map(s=>s.id+'|'+s.name).join('\n'); if(sig===qbarSig&&bar.firstChild){ bar.hidden=false; syncDock(); return; } qbarSig=sig;
  const old=$('rollbox'), inp=el('input'); inp.id='rollbox'; inp.type='text'; inp.spellcheck=false; inp.value=old?old.value:''; inp.setAttribute('aria-label','Roll a formula'); inp.enterKeyHint='done'; inp.setAttribute('autocapitalize','off'); inp.setAttribute('autocomplete','off'); inp.title=DOCK_TIP;
  inp.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') dockRoll(); }; inp.oninput=()=>dockFail(inp,null);
  inp.onfocus=()=>{ inp.select(); setTimeout(()=>inp.select(),0); inp.dataset.fresh='1'; }; inp.onmouseup=e=>{ if(inp.dataset.fresh){ e.preventDefault(); delete inp.dataset.fresh; } }; inp.onblur=()=>{ delete inp.dataset.fresh; };   // focus selects all, so typing overwrites; the next click places the cursor
  const go=el('button','','Roll'); go.id='rollbtn'; go.type='button'; go.title='Roll the dice (R)'; let goTouch=false; go.onpointerdown=e=>{ goTouch=e.pointerType==='touch'; }; go.onmousedown=e=>e.preventDefault(); go.onclick=()=>{ dockRoll(); if(goTouch){ goTouch=false; inp.blur(); } };   // touch: Roll also closes the keyboard (PD-142.14.1.6.3); with a mouse it keeps the box focused   // pressing Roll must not blur the box: it would shrink and the button would slide out from under the finger
  const dh=el('span','dhint'); dh.id='dockhint'; const da=el('span','dact'); da.id='dockact'; bar.replaceChildren(inp,dh,da,go); bar.hidden=false;
  const mk=()=>{ const kids=[]; for(const n of [4,6,8,10,12,20,100]){ const b=el('button','',dieName(n)); b.type='button'; b.title='Tap: roll box = one '+dieName(n)+'. Double-click or long press: add one'; b.dataset.die=n; tapOrAdd(b,{single:()=>dockLoad(n,false),add:()=>dockLoad(n,true),snap:()=>$('rollbox').value,restore:v=>{ $('rollbox').value=v; }});
    kids.push(b); }
  for(const [m,t,tip] of [['h','Adv','Advantage: 2d20, keep the highest'],['l','Dis','Disadvantage: 2d20, keep the lowest']]){ const b=el('button','',t); b.type='button'; b.title=tip+'. Tap: roll box = d20'+(m==='h'?'adv':'dis')+'. Double-click or long press: add it'; b.dataset.adv=m; tapOrAdd(b,{single:()=>dockAdv(m,false),add:()=>dockAdv(m,true),snap:()=>$('rollbox').value,restore:v=>{ $('rollbox').value=v; }}); kids.push(b); }
  if(bag.sets.length){ kids.push(el('span','qsep')); for(const st of bag.sets){ const b=el('button','',st.name); b.type='button'; b.title='Load '+setNotation(st); b.dataset.set=st.id; b.onclick=()=>{ const bx=$('rollbox'); if(bx){ bx.value=''; bx.classList.remove('bad'); bx.title=DOCK_TIP; } setOps.open(st.id); syncDock(); }; kids.push(b);   // PD-142.14.3.1.3: the chip replaces whatever was typed, so Roll throws the set
 } }
  return kids; };
  const dc=mk(); for(const b of dc){ b.classList.add('dchip'); b.onmousedown=e=>e.preventDefault(); }   // like Roll: a chip must not blur the box, or the box shrinks and the chip slides out from under the finger
   { const qc=el('div'); qc.id='qchips'; qc.append(...dc); bar.append(qc); }   // owner 2026-11-14: the preset chips are in the dock again (phone panel is closed in Play); they only load
  if(chips) chips.replaceChildren(...mk()); syncDock(); renderDock(); }
/* PD-142.40.1: the dock scrolls sideways with the wheel and by dragging (touch scrolls natively); a drag that moved never counts as a click */
(()=>{ const bar=$('qbar'); if(!bar) return; let dx=0, sx=0, sl=0, moved=false, id=null; const sc=()=>$('qchips');   // only the chips scroll; the box and Roll stay put (PD-142.14.3.1.2)
  bar.addEventListener('wheel',e=>{ const c=sc(); if(!c||c.scrollWidth<=c.clientWidth) return; c.scrollLeft+=e.deltaY+e.deltaX; e.preventDefault(); },{passive:false});
  bar.addEventListener('pointerdown',e=>{ const c=sc(); if(!c||e.pointerType!=='mouse'||!e.target.closest('#qchips')) return; id=e.pointerId; sx=e.clientX; sl=c.scrollLeft; moved=false; });
  bar.addEventListener('pointermove',e=>{ const c=sc(); if(!c||id!==e.pointerId) return; dx=e.clientX-sx; if(!moved&&Math.abs(dx)>5){ moved=true; c.classList.add('drag'); } if(moved) c.scrollLeft=sl-dx; });
  const end=e=>{ if(id!==e.pointerId) return; id=null; const c=sc(); if(c) c.classList.remove('drag'); };
  bar.addEventListener('pointerup',end); bar.addEventListener('pointercancel',end);
  bar.addEventListener('click',e=>{ if(moved){ e.stopPropagation(); e.preventDefault(); moved=false; } },true); })();
document.addEventListener('pointerdown',e=>{ const b=$('rollbox'); if(b&&document.activeElement===b&&!e.target.closest('#qbar')) b.blur(); },true);   // a tap anywhere outside the dock (mat, canvas) dismisses the phone keyboard (PD-142.14.1.6.3)
let quickT=0, quickClickAt=0;   // the lightning button's result: the roll panel's gold numerals, on top of everything, fading after a moment
function showQuick(name,total,items,modText,look){ const q=$('quickres'); q.replaceChildren(); if(name) q.append(el('div','qn',name)); q.append(el('div','tot',String(total))); if(look) q.append(el('div','qn look','→ '+look)); const b=el('div','stk'); b.append(rollItemsEl(items,modText)); q.append(b); q.classList.remove('on'); void q.offsetWidth; q.classList.add('on'); clearTimeout(quickT); quickT=setTimeout(()=>q.classList.remove('on'),2600); }
function addLog(e){ if(!bag) return; bag.log.push({ts:Date.now(),...(bag.roller?{roller:bag.roller}:{}),...e}); if(bag.log.length>LOG_MAX) bag.log=bag.log.slice(-LOG_MAX); save(); renderLog(); }
function logRoll(total,detail,items,modText,story,noTotal){ if(!bag) return; const st=rollSetId&&setOps.find(rollSetId)&&state.shape==='custom'&&setNotation(setOps.find(rollSetId))===state.notation?setOps.find(rollSetId):null;
  if(st) st.last={total:Number.isNaN(+total)?total:+total,at:Date.now()};
  const look=st&&st.table?lookupTable(st.table,total):null;
  addLog({set:st?st.name:null,...(st?{setId:st.id}:{}),notation:state.shape==='custom'?state.notation:state.shape==='set7'?'Standard 7':state.shape,total:noTotal?'':String(total),detail:detail||'',...(items?{items,modText}:{}),...(story?{story}:{}),...(look?{lookup:look}:{})}); return look; }
/* the log as plain text, oldest first, for pasting into notes (PD-142.14.1.5) */
function logText(){ const pad=n=>String(n).padStart(2,'0'); return bag.log.map(e=>{ const t=new Date(e.ts); const head=`${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
  if(e.note) return `${head}  ${e.note}`;
  const items=e.items?e.items.map(i=>i.text).join('  ·  ')+(e.modText?'  ·  '+e.modText:''):(e.detail||'');
  return `${head}  ${e.roller?e.roller+': ':''}${e.label?e.label+' — ':''}${e.set||e.notation}${e.total===''?'':' = '+e.total}${e.lookup?' → '+e.lookup:''}${items&&items!==String(e.total)?'  ('+items+')':''}${e.story?'  [story: '+e.story+']':''}`; }).join('\n'); }
/* table lookup (PD-142.14.1.7): a set can carry a result table, one line per result: "3 Empty room", "4-8 Goblins", "9+ Boss" */
function lookupTable(table,total){ const n=+total; if(!table||!Number.isFinite(n)) return null;
  for(const line of String(table).split('\n')){ const m=line.trim().match(/^(\d+)\s*(?:[-–]\s*(\d+)|(\+))?\s*[:=\-–]?\s*(.+)$/); if(!m) continue; const lo=+m[1], hi=m[3]?Infinity:m[2]!==undefined?+m[2]:lo; if(n>=lo&&n<=hi) return m[4].trim(); }
  return null; }
/* initiative tracker (PD-142.14.1.8): rows come from roll-log entries (each roll of a group, or a single total); lives at the top of the roll log */
const initOps={
  get(){ return bag.init||(bag.init={rows:[],turn:0,round:1}); },
  sorted(){ const I=this.get(); I.rows.sort((a,b)=>b.total-a.total); return I; },   // stable: ties keep the order they were added
  add(rows){ const I=this.get(); for(const r of rows) if(Number.isFinite(+r.total)) I.rows.push({name:String(r.name||'Roll').slice(0,30),total:+r.total,...(r.ts?{ts:r.ts}:{})}); this.sorted(); I.turn=Math.min(I.turn,Math.max(0,I.rows.length-1)); save(); },
  fromEntry(e){ const parts=String(e.total).split(' · ').map(Number), base=e.label||e.roller||e.set||'Roll';
    return parts.map((t,i)=>({name:parts.length>1?`${e.label||e.set||'Roll'} ${i+1}`:base,total:t,...(parts.length===1?{ts:e.ts}:{})})); },   // a single-roll row remembers its log entry (PD-142.14.1.8.1)
  next(){ const I=this.get(); if(!I.rows.length) return; I.turn++; if(I.turn>=I.rows.length){ I.turn=0; I.round++; } save(); },
  remove(i){ const I=this.get(); I.rows.splice(i,1); if(I.turn>i||I.turn>=I.rows.length) I.turn=Math.max(0,Math.min(I.turn-(I.turn>i?1:0),I.rows.length-1)); save(); },
  clear(){ bag.init={rows:[],turn:0,round:1}; save(); } };
let initFormOpen=false;
/* PD-142.14.2.1.6: add a named entry by hand (scores from physical dice or another device) */
function initAddForm(){ const f=el('div','liadd'), n=el('input'), sc=el('input'), ok=el('button','linkbtn','Add'); n.type='text'; n.maxLength=30; n.placeholder='Name'; n.setAttribute('aria-label','Initiative entry name');
  sc.type='number'; sc.inputMode='numeric'; sc.placeholder='Score'; sc.setAttribute('aria-label','Initiative score'); ok.type='button';
  const go=()=>{ if(sc.value===''||!Number.isFinite(+sc.value)){ sc.classList.add('bad'); sc.focus(); return; } initOps.add([{name:n.value.trim()||'Entry',total:+sc.value}]); initFormOpen=true; renderLog(); const nn=document.querySelector('#logpanel .liadd input'); if(nn) nn.focus(); };
  for(const i of [n,sc]){ i.onkeydown=ev=>{ ev.stopPropagation(); if(ev.key==='Enter') go(); }; i.oninput=()=>sc.classList.remove('bad'); }
  ok.onclick=go; const done=el('button','linkbtn','Done'); done.type='button'; done.onclick=()=>{ initFormOpen=false; renderLog(); }; f.append(n,sc,ok,done); return f; }
function renderInit(p){ let I=bag.init;
  if((!I||!I.rows.length)&&!initFormOpen){ const a=el('button','linkbtn liopen','+ Initiative: add a name and score'); a.type='button'; a.onclick=()=>{ initFormOpen=true; renderLog(); const nn=document.querySelector('#logpanel .liadd input'); if(nn) nn.focus(); }; p.append(a); return; }
  I=initOps.get();
  const box=el('div','linit'), h=el('div','lih'); h.append(el('span','',`Initiative · round ${I.round}`));
  const nx=el('button','linkbtn','Next'); nx.type='button'; nx.onclick=()=>{ initOps.next(); renderLog(); }; const cl=el('button','linkbtn','Clear'); cl.type='button'; cl.onclick=()=>{ initOps.clear(); renderLog(); }; const r=el('span','lhr'); r.append(nx,cl); h.append(r); box.append(h);
  I.rows.forEach((row,i)=>{ const d=el('div','lir'+(i===I.turn?' now':'')), n=el('input'); n.type='text'; n.maxLength=30; n.value=row.name; n.setAttribute('aria-label','Initiative name'); n.onkeydown=ev=>{ ev.stopPropagation(); if(ev.key==='Enter') n.blur(); }; n.onchange=()=>{ row.name=n.value.trim().slice(0,30)||row.name; const le=row.ts&&bag.log.find(x=>x.ts===row.ts); if(le) le.label=row.name; save(); renderLog(); };   // the new name becomes the roll's label in the log, and stays when the row is deleted (PD-142.14.1.8.1)
    const x=el('button','linkbtn','✕'); x.type='button'; x.setAttribute('aria-label','Remove from initiative'); x.onclick=()=>{ initOps.remove(i); renderLog(); }; d.append(el('b','',String(row.total)),n,x); box.append(d); });
  if(initFormOpen) box.append(initAddForm()); else { const a=el('button','linkbtn liopen','+ Add by hand'); a.type='button'; a.onclick=()=>{ initFormOpen=true; renderLog(); const nn=document.querySelector('#logpanel .liadd input'); if(nn) nn.focus(); }; box.append(a); }
  p.append(box); }
function toast(msg){ const t=$('toast'); if(!t) return; t.textContent=msg; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>{ t.hidden=true; },2600); }
function logFlash(btn,txt){ const old=btn.textContent; btn.textContent=txt; setTimeout(()=>{ btn.textContent=old; },1500); toast(txt==='Copied'?'Roll log copied to the clipboard':txt==='Use Save'?'Copy is blocked here: use Save':txt); }
function renderLog(){ const p=$('logpanel'); if(p.hidden||!bag) return; p.replaceChildren();
  const h=el('div','lh'); h.append(el('span','',`Roll log · ${bag.log.length}`)); const c=el('button','linkbtn','Clear'); c.type='button'; c.disabled=!bag.log.length; c.onclick=()=>{ bag.log=[]; save(); renderLog(); }; const x=el('button','linkbtn','✕'); x.type='button'; x.setAttribute('aria-label','Close the roll log'); x.onclick=()=>{ setPane('table'); }; const cp=el('button','linkbtn','Copy'); cp.type='button'; cp.disabled=!bag.log.length; cp.title='Copy the roll log as plain text';
  cp.onclick=async()=>{ const txt=logText(); try{ await navigator.clipboard.writeText(txt); logFlash(cp,'Copied'); }catch{ const ta=el('textarea'); ta.value=txt; ta.style.cssText='position:fixed;opacity:0'; document.body.append(ta); ta.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch{} ta.remove(); logFlash(cp,ok?'Copied':'Use Save'); } window.__lastLogCopy=txt; };
  const sv=el('button','linkbtn','Save'); sv.type='button'; sv.disabled=!bag.log.length; sv.title='Save the roll log as a .txt file';
  sv.onclick=()=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([logText()+'\n'],{type:'text/plain'})); a.download=(bag.name||'dice').replace(/[^\w.-]+/g,'_')+'-roll-log.txt'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); };
  const rt=el('span','lhr'); rt.append(cp,sv,c,x); h.append(rt); p.append(h);
  { const who=el('div','lwho'), li=el('input'); li.type='text'; li.maxLength=24; li.placeholder='Who is rolling? (optional)'; li.value=bag.roller||''; li.setAttribute('aria-label','Roller name'); li.onkeydown=ev=>ev.stopPropagation(); li.onchange=()=>{ bag.roller=li.value.trim().slice(0,24); save(); }; who.append(li); p.append(who); }
  renderInit(p);
  if(!bag.log.length) p.append(el('div','setempty','No rolls yet.'));
  for(const e of bag.log.slice(-60).reverse()){ const d=el('div','le'), t=new Date(e.ts), body=el('div','lb'), head=el('div','lt');
    if(e.note){ d.className='le note'; d.append(el('small','tm',`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`),el('span','lnote',e.note)); p.append(d); continue; }   // PD-142.14.3.1.15: audit lines (a peek at a cup) carry no roll
    head.append(el('small','tm',`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`),el('span','ttl',`${e.set||e.notation}${e.quick?' ⚡':''}`));
    { const lb=el('button','lbl',e.label||'+ label'); lb.type='button'; lb.title='Name this roll (attack, damage, check...)'; if(!e.label) lb.classList.add('empty');
      lb.onclick=()=>{ const i=el('input','lbi'); i.type='text'; i.maxLength=30; i.value=e.label||''; i.setAttribute('aria-label','Roll label'); let done=false; const fin=ok=>{ if(done) return; done=true; if(ok){ const v=i.value.trim().slice(0,30); if(v) e.label=v; else delete e.label; save(); } renderLog(); }; i.onkeydown=ev=>{ ev.stopPropagation(); if(ev.key==='Enter') fin(true); else if(ev.key==='Escape') fin(false); }; i.onblur=()=>fin(true); lb.replaceWith(i); i.focus(); i.select(); };
      head.append(lb); if(e.roller) head.append(el('small','who',e.roller)); }
    { const sid=e.set&&((e.setId&&setOps.find(e.setId))||bag.sets.find(x=>x.name===e.set)||{}).id; if(sid){ const tt=head.querySelector('.ttl'); tt.classList.add('go'); tt.title='Bring this set to the mat'; tt.setAttribute('role','button'); tt.tabIndex=0; const go=()=>{ p.hidden=true; setOps.open(sid); }; tt.onclick=go; tt.onkeydown=ev=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); go(); } }; } }
    { const ok=String(e.total).split(' · ').every(x=>x!==''&&Number.isFinite(+x)); if(ok){ const ib=el('button','ini','+ init'); ib.type='button'; ib.title='Add to the initiative order'; ib.onclick=()=>{ initOps.add(initOps.fromEntry(e)); renderLog(); }; head.append(ib); } }
    const rows=el('div','lr'); if(e.lookup) rows.append(el('div','llook','→ '+e.lookup)); if(e.items) rows.append(rollItemsEl(e.items,e.modText)); else if(e.detail) rows.append(e.detail);
    if(e.story) rows.append(el('div','lstory','Story order: '+e.story));
    body.append(head,rows); d.append(el('b','',e.total),body); p.append(d); } }
function setItems(id){ const k=bag.sets.findIndex(x=>x.id===id), last=bag.sets.length-1, st=bag.sets[k];
  return [{label:'Edit…',run:()=>{ openSetEditor(id); }},{label:'Make a copy',run:()=>{ setOps.copy(id); renderSheet(); }},{label:'Open',run:()=>setOps.open(id)},
    {label:'Move up',disabled:k===0,run:()=>{ setOps.move(id,k-1); renderSheet(); }},{label:'Move down',disabled:k===last,run:()=>{ setOps.move(id,k+1); renderSheet(); }},
    {label:'Delete…',danger:true,run:()=>setTimeout(()=>openMenu(menuAnchor,[{head:`Delete "${st.name}"?`},{label:'Delete',danger:true,run:()=>{ setOps.remove(id); renderSheet(); }},{label:'Cancel',run:()=>{}}]),0)}]; }
/* Inline set editor (PD-124): the Custom controls (notation, dice use, term chips, steppers, modifier) plus single-shape presets, working on a draft of one set. The live Custom selection is never touched. */
let editSet=null;   // {id,name,terms,mod,use,err}
function openSetEditor(id){ const st=setOps.find(id); if(!st) return;
  if(editSet&&editSet.id!==id&&setDirty(editSet)){ const anchor=document.querySelector('#setlist .seted .seclose')||document.getElementById('setlist'); openMenu(anchor,[{head:`Discard your changes to "${editSet.name||'this set'}"?`},{label:'Discard and open',danger:true,run:()=>{ editSet=null; openSetEditor(id); }},{label:'Keep editing',run:()=>{}}]); return; }
  editSet={id,name:st.name,terms:structuredClone(st.terms),mod:st.mod||0,table:st.table||'',use:null,err:'',orig:JSON.stringify([st.name,st.terms,st.mod||0,st.table||''])}; renderSheet(); setTimeout(()=>{ const h=document.querySelector('#setlist .seted'); if(h) h.scrollIntoView({block:'start'}); },0); }   // the name and Save are at the top of the editor: bring them into view
function draftApply(terms,mod){ const note=fmtNotation(terms,mod), p=parseNotation(note); if(p.error){ editSet.err=p.error; renderSheet(); return false; } editSet.terms=p.terms; editSet.mod=p.mod; editSet.err=''; renderSheet(); return true; }
const setDirty=E=>JSON.stringify([E.name,E.terms,E.mod,E.table||''])!==E.orig;
function setEditor(){ const E=editSet, host=el('div','seted'+(setDirty(E)?' dirty':'')); host.dataset.id=E.id;
  const nm=el('input','sename'); nm.type='text'; nm.value=E.name; nm.maxLength=80; nm.placeholder='Set name'; nm.setAttribute('aria-label','Set name'); nm.oninput=()=>{ E.name=nm.value; host.classList.toggle('dirty',setDirty(E)); }; nm.onkeydown=ev=>{ ev.stopPropagation(); };
  const useJ=()=>designChipJ(E.use);
  const pre=el('div','presets'); for(const t of STEP_TYPES){ const b=el('button','',dieName(t)); b.type='button'; b.title=`A single ${dieName(t)}`; b.prepend(chipEl(t,useJ(),{flat:true})); b.onclick=()=>draftApply([E.use?{count:1,sides:t,design:E.use}:{count:1,sides:t}],E.mod); pre.append(b); }
  { const b=el('button','','Standard 7'); b.type='button'; b.style.gridColumn='span 2'; b.onclick=()=>draftApply(SET7.map(([id])=>({count:1,sides:id==='dpct'?100:+id.slice(1)})),0); pre.append(b); }
  const nt=el('input','senote'); nt.type='text'; nt.spellcheck=false; nt.value=fmtNotation(E.terms,E.mod); nt.setAttribute('aria-label','Dice formula');
  const applyNote=()=>{ const p=parseNotation(nt.value,true); if(p.error){ E.err=p.error; renderSheet(); return; } if(p.group>1){ E.err='A group (4x) is typed on the table or the quick roll bar'; renderSheet(); return; } draftApply(p.terms,p.mod); };
  nt.onkeydown=ev=>{ ev.stopPropagation(); if(ev.key==='Enter') applyNote(); }; nt.onchange=applyNote;
  const use=el('div','row2'); { const lab=el('label','','Dice use'), sel=el('select'); sel.append(new Option('Active design',''),...bag.designs.map(d=>new Option(d.name,d.id))); sel.value=E.use||''; sel.onchange=()=>{ E.use=sel.value||null; renderSheet(); }; use.append(lab,sel); use.hidden=bag.designs.length<2; }
  const tch=el('div','tch'); if(E.terms.length>1) E.terms.forEach((t,i)=>{ const b=el('button','',''); b.type='button'; b.title='Remove these dice from the set'; const e=t.design&&entryOf(t.design); b.append(chipEl(t.sides,designChipJ(t.design),{flat:true}),`${t.count}${dieName(t.sides)}${e?' · '+e.name:''}`,el('span','x',' ×')); b.onclick=()=>draftApply(E.terms.filter((_,k)=>k!==i),E.mod); tch.append(b); });
  const c=(()=>{ const o={}; STEP_TYPES.forEach(t=>o[t]=0); E.terms.filter(t=>sameDesign(t.design,E.use)).forEach(t=>o[t.sides]+=t.count); return o; })();
  const steps=el('div','steps'); for(const t of STEP_TYPES){ const d=el('div','step'), sl=el('span','sl'), sc=el('span','sc'); sl.append(chipEl(t,useJ(),{flat:true}),el('small','',dieName(t)));
    const mk=(txt,dl)=>{ const b=el('button','',txt); b.type='button'; b.setAttribute('aria-label',`${dl>0?'Add':'Remove'} a ${dieName(t)}`); b.onclick=()=>{ const n={...c,[t]:Math.max(0,c[t]+dl)}, others=E.terms.filter(x=>!sameDesign(x.design,E.use)), mine=STEP_TYPES.filter(k=>n[k]>0).map(k=>E.use?{count:n[k],sides:k,design:E.use}:{count:n[k],sides:k}), terms=E.use?[...others,...mine]:[...mine,...others]; if(terms.length) draftApply(terms,E.mod); }; return b; };
    sc.append(mk('−',-1),el('b','',String(c[t])),mk('+',1)); d.append(sl,sc); steps.append(d); }
  const mod=el('div','row2'); { const m=(txt,dl)=>{ const b=el('button','',txt); b.type='button'; b.setAttribute('aria-label',dl>0?'Modifier up':'Modifier down'); b.onclick=()=>draftApply(E.terms,E.mod+dl); return b; }; mod.append(el('label','','Modifier'),m('−',-1),el('b','mv',String(E.mod)),m('+',1)); }
  const save=el('button','primary sesave','Save'); save.type='button'; save.onclick=()=>{ if(E.draft){ if(!E.terms.length){ E.err='Add at least one die first'; renderSheet(); return; } const id=setOps.create({name:E.name,terms:E.terms,mod:E.mod,table:E.table,group:E.group}); if(id){ toast(`Saved "${setOps.find(id).name}" to the bag`); editSet=null; renderSheet(); } return; } if(setOps.edit(E.id,{name:E.name,terms:E.terms,mod:E.mod,table:E.table})){ toast(`Saved "${E.name}"`); editSet=null; renderSheet(); } };
  const save2=el('button','primary sesave2','Save this set'); save2.type='button'; save2.onclick=save.onclick; save2.setAttribute('aria-label','Save this set');   /* PD-142.14.2.1.7: a Save next to the table box, where the editing ends */
  const head=el('div','sehead'), close=el('button','seclose','✕'); close.type='button'; close.title='Close without saving'; close.setAttribute('aria-label','Close the editor without saving'); close.onclick=()=>{ const shut=()=>{ editSet=null; renderSheet(); }; if(!setDirty(E)) shut(); else openMenu(close,[{head:'Discard your changes?'},{label:'Discard',danger:true,run:shut},{label:'Keep editing',run:()=>{}}]); }; head.append(nm,save,close);
  const tb=el('textarea','setable'); tb.rows=4; tb.spellcheck=false; tb.value=E.table||''; tb.placeholder='Table (optional), one line per result:\n1-2 Locked door\n3 Empty room\n4-8 Goblins'; tb.setAttribute('aria-label','Result table'); tb.onkeydown=ev=>ev.stopPropagation(); tb.oninput=()=>{ E.table=tb.value; };
  host.append(head,el('div','selab','Presets'),pre,el('div','selab','Formula'),nt,el('div','seerr',E.err||''),use,tch,steps,mod,el('div','selab','Result table'),tb,save2); return host; }
function renderSets(){ const box=$('setlist'); setSheetTitle(`${bag.sets.length} set${bag.sets.length===1?'':'s'}`);
  const save1=el('button','','Save the current dice as a set'); save1.id='setsave'; save1.type='button'; save1.title=currentDice().name; const openDraft=blank=>{ if(editSet&&editSet.draft){ renderSheet(); return; } const cur=blank?{name:'New set',terms:[],mod:0,group:1}:currentDice(); editSet={id:'__draft',draft:true,blank,name:uniqueName(bag.sets.map(x=>x.name),cur.name),terms:structuredClone(cur.terms),mod:cur.mod,group:cur.group,table:'',use:null,err:'',orig:''}; renderSheet(); setTimeout(()=>{ const h=document.querySelector('#setlist .seted'); if(h) h.scrollIntoView({block:'start'}); },0); };   // PD-142.14.3.1.4 (owner): draft first, nothing is in the bag until Save; Close discards. New set = an empty draft, Save the current dice = one pre-filled from the table
  save1.onclick=()=>openDraft(false); const new1=el('button','','New set'); new1.id='setnew'; new1.type='button'; new1.title='A blank set: pick the dice, then Save'; new1.onclick=()=>openDraft(true);
  const top=el('div','setact'); top.append(save1,new1);
  box.replaceChildren(top,...(editSet&&editSet.draft?[setEditor()]:[]),...(bag.sets.length?bag.sets.map(st=>{ if(editSet&&editSet.id===st.id) return setEditor(); const row=el('div','setrow'); row.dataset.id=st.id;
      const main=el('button','main'); main.type='button'; const chips=el('span','chips'); for(const t of st.terms.slice(0,8)){ const e=t.design&&entryOf(t.design), j=e?(bag.pending[e.id]||e.design):liveJSON(), tm=el('span','term'), c=chipEl(t.sides,j,{label:null}); tm.title=`${t.count}${dieName(t.sides)}${e?' ('+e.name+')':''}`; tm.append(c,el('small','',`${t.count}${dieName(t.sides)}`)); chips.append(tm); }
      if(st.mod) chips.append(el('small','mod',(st.mod>0?'+':'')+st.mod));
      main.append(el('span','nm',st.name),chips,...(st.last?[el('small','',`last: ${st.last.total}`)]:[])); let lt=null,lx=0,ly=0,lf=false; const lc=()=>clearTimeout(lt);   // long press opens the editor
      main.addEventListener('pointerdown',e=>{ lf=false; lx=e.clientX; ly=e.clientY; lc(); lt=setTimeout(()=>{ lf=true; openSetEditor(st.id); },500); });
      for(const t of ['pointerup','pointerleave','pointercancel']) main.addEventListener(t,lc);
      main.addEventListener('pointermove',e=>{ if(Math.hypot(e.clientX-lx,e.clientY-ly)>8) lc(); });
      main.addEventListener('contextmenu',e=>e.preventDefault());
      main.onclick=()=>{ if(lf){ lf=false; return; } setOps.open(st.id); };
      const q=el('button','quick','⚡'); q.type='button'; q.title='Quick roll'; q.setAttribute('aria-label','Quick roll '+st.name); q.onclick=()=>{ const now=Date.now(); if(now-quickClickAt<350) return; quickClickAt=now; setOps.quick(st.id); renderSheet(); };   /* PD-142.14.1.16: a double-click or replayed click is one roll, not two hidden behind the one result on screen */
      const pen=el('button','pen','✎'); pen.type='button'; pen.title='Edit'; pen.setAttribute('aria-label','Edit '+st.name); pen.onclick=()=>openSetEditor(st.id);
      const dots=el('button','dots','⋯'); dots.type='button'; dots.setAttribute('aria-label','Menu for '+st.name); dots.onclick=e=>{ e.stopPropagation(); openMenu(dots,setItems(st.id)); };
      row.append(main,q,pen,dots); return row; }):[el('div','setempty','No sets yet. Build dice in the editor, then save them here.')])); }
let dragMoved=false;
function wireDrag(t,id){ let timer=null,sx=0,sy=0,on=false;   // document-level listeners while dragging: moving the tile in the DOM drops any pointer capture
  const over=e=>{ const under=document.elementsFromPoint(e.clientX,e.clientY).find(n=>n!==t&&n.classList&&n.classList.contains('tile')&&n.dataset.id&&n.dataset.id!=='draft');
    if(under){ const tiles=[...$('tiles').children]; tiles.indexOf(under)<tiles.indexOf(t)?under.before(t):under.after(t); } };
  const end=()=>{ clearTimeout(timer); document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',end); document.removeEventListener('pointercancel',end); if(!on) return; on=false; t.classList.remove('drag');
    const ids=[...$('tiles').querySelectorAll('.tile[data-id]')].map(n=>n.dataset.id).filter(i=>i!=='draft'), to=ids.indexOf(id);
    if(to>=0&&to!==bag.designs.findIndex(d=>d.id===id)) bagOps.move(id,to); setTimeout(()=>{ dragMoved=false; },0); renderSheet(); };
  const begin=()=>{ on=true; dragMoved=true; t.classList.add('drag'); };
  const mv=e=>{ const d=Math.hypot(e.clientX-sx,e.clientY-sy);
    if(!on){ if(e.pointerType==='mouse'&&e.buttons&&d>6) begin(); else if(e.pointerType!=='mouse'&&d>10) clearTimeout(timer); if(!on) return; } over(e); };
  t.addEventListener('pointerdown',e=>{ if(e.target.closest('.dots')) return; sx=e.clientX; sy=e.clientY; dragMoved=false; on=false;
    document.addEventListener('pointermove',mv); document.addEventListener('pointerup',end); document.addEventListener('pointercancel',end); if(e.pointerType!=='mouse') timer=setTimeout(begin,350); }); }
$('tiles').addEventListener('touchmove',e=>{ if($('tiles').querySelector('.tile.drag')) e.preventDefault(); },{passive:false});
function openSheet(){ closeMenu(); renderSheet(); $('bagsheet').hidden=false; scheduleThumb(); }   // PD-142.38.43: the Bag view is one overlay in both rooms and at every size
function closeSheet(){ closeMenu(); $('bagsheet').hidden=true; }
$('sheetclose').onclick=closeSheet; $('bagbtn').onclick=()=>{ sheetTab='designs'; openSheet(); };
addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('bagsheet').hidden){ if(!$('cardmenu').hidden) closeMenu(); else closeSheet(); } });
$('bsave').onclick=()=>bagOps.save(); $('bcopy').onclick=()=>bagOps.saveCopy(); $('brevert').onclick=()=>bagOps.revert();
let uiRaf=0; function scheduleBagUI(){ if(!bag||uiRaf) return; uiRaf=setTimeout(()=>{ uiRaf=0; renderBag(); },30); scheduleThumb(); }   // a timer, not rAF: rAF stops in a background tab
const ICON_I='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.01"/></svg>', ICON_EXPAND='<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  ICON_GEAR='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
function refit(){ resize(); window.scrollTo(0,0); }   // re-measure the stage right away and keep the page from keeping a stale scroll offset
function dset(el,icon,label){ el.innerHTML=icon+'<span class="lb">'+label+'</span>'; }
function setFull(on,keep){ document.body.classList.toggle('full',on); if(!keep){ if(on) syncGameLook(); else if(!SP.hidden&&!game&&roomNow()==='play') document.dispatchEvent(new CustomEvent('pd-open-games'));  refit(); requestAnimationFrame(refit); setTimeout(refit,300); } dset($('layout'),on?ICON_GEAR:ICON_EXPAND,on?'Show pane':'Full view'); $('layout').title=on?'Show the side pane (H)':'Hide the side pane (H)'; $('layout').setAttribute('aria-label',$('layout').title); if(!keep){ try{localStorage.setItem('prettydice.full',on?'1':'0');}catch{} } }
/* Full view (PD-142.38 slice 1): one state that hides the side pane. H, the drawer item and the two handles toggle it. */
const toggleFull=()=>setFull(!document.body.classList.contains('full'));
/* Utility drawer: opens as a list, shown once as a pill when a session starts (not in test URLs), closes on an outside tap or Escape. */
const drawerEl=$('drawer');
function closeDrawer(){ drawerEl.classList.remove('open'); $('drawerbtn').setAttribute('aria-expanded','false'); }
function openDrawer(){ drawerEl.classList.add('open'); $('drawerbtn').setAttribute('aria-expanded','true'); }
$('drawerbtn').onclick=()=>{ if(drawerEl.classList.contains('open')) closeDrawer(); else openDrawer(); };
dset($('resetview'),'<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/></svg>','Reset view'); $('resetview').onclick=()=>{ resetView(); closeDrawer(); };
for(const id of ['snd','info','spinbtn']) $(id).addEventListener('click',closeDrawer);
document.addEventListener('pointerdown',e=>{ if(drawerEl.classList.contains('open')&&!drawerEl.contains(e.target)) closeDrawer(); },true);
addEventListener('keydown',e=>{ if(e.key==='Escape'&&drawerEl.classList.contains('open')) closeDrawer(); });
{ const q=new URLSearchParams(location.search), want=q.get('pill'); let seen=false; try{ seen=sessionStorage.getItem('pd.drawerSeen')==='1'; }catch{}
  if(want==='1'||(want!=='0'&&!q.has('seed')&&!seen)){ try{ sessionStorage.setItem('pd.drawerSeen','1'); }catch{} setTimeout(()=>{ openDrawer(); setTimeout(closeDrawer,3200); },600); } }
$('layout').onclick=()=>{ toggleFull(); closeDrawer(); }; $('paneclose').onclick=()=>setFull(true); $('paneopen').onclick=()=>setFull(false);
{ let on=false; try{ on=localStorage.getItem('prettydice.full')==='1'; }catch{} if(new URLSearchParams(location.search).get('full')) on=new URLSearchParams(location.search).get('full')==='1'; setFull(on,true); }
$('hint').onclick=()=>{ $('hint').classList.remove('show'); $('info').classList.remove('on'); $('info').setAttribute('aria-expanded',false); };
dset($('info'),ICON_I,'Hints'); $('info').onclick=()=>{ const on=$('hint').classList.toggle('show'); $('info').classList.toggle('on',on); $('info').setAttribute('aria-expanded',on); };
$('loadjson').onclick=()=>$('jsonfile').click();
const readText=f=>f.text?f.text():new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(new Error('Could not read file')); fr.readAsText(f); });
$('jsonfile').onchange=async e=>{ const inp=e.target, f=inp.files[0]; if(!f) return;
  try{ const txt=await readText(f); inp.value=''; await bagOps.addLoaded(JSON.parse(txt.replace(/^\uFEFF/,''))); }catch(err){ inp.value=''; alert('Could not load design: '+err.message); } };   // read first, then reset the input: clearing it early can empty the file on some phones
$('dname').onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') e.target.blur(); };   // Enter accepts the name
addEventListener('keydown',e=>{ const t=e.target; if(e.key==='Enter'&&t&&t.tagName==='INPUT'&&t.type==='text') setTimeout(()=>{ if(document.activeElement===t) t.blur(); },0); },true);   // iOS keeps the keyboard up on Enter otherwise
$('dname').oninput=()=>save();
$('dname').onchange=()=>{ if(!bag||bag.active.draft) return; const e=activeEntry(), v=uniqueName(bag.designs.filter(d=>d!==e).map(d=>d.name),$('dname').value); if(v!==$('dname').value.trim()){ $('dname').value=v; save(); } };   // a name already used in the bag gets the next number   // a typed name is an edit: show Modified and keep it
/* ---------- 'New' callouts (PD-142.38.3): review builds only (the artifact build sets __PD_REVIEW; ?new=1 turns it on anywhere). One line per user-visible landing: id = card id, rev re-arms an edited feature. ---------- */
// PD-163: the list holds only 4.1 changes the owner has not reviewed yet (id = card id, rev 1, anchor on the control, room = where the anchor lives). The page cannot read live comment state, so retirement happens at each republish:
// scripts/build-static.py --artifact writes window.__PD_RETIRED (card ids that are Review Complete or Done on the board) and those entries are dropped here. Shipped entries are removed from this list by hand.
const NF_ALL=[
  {id:'PD-156', rev:2, room:'play', anchor:'#gamestab', text:'Yacht: on a touch screen a score is entered deliberately, by double tap (or long press, your choice in the Score entry menu under the card), so a stray tap no longer scores; on desktop a single mouse click scores (PD-165). After scoring, a Whoopsie button shows for 3 seconds and undoes it. Check: Play > Games > Yacht, roll, click a category (desktop) or double tap it (phone), then press Whoopsie within 3 s.', card:'PD-156'},
  {id:'PD-158', rev:1, room:'play', anchor:'#bagbtn', text:'During a game you can change a die\'s design: the look only. The dice set (shape and count) stays fixed to what the game needs, and designs with another shape are not selectable. Check: start a game, open the Bag view and pick another design of the same shape: the look changes; a different shape does nothing.', card:'PD-158'},
  {id:'PD-159', rev:1, room:'play', anchor:'#gamestab', text:'Craps: when a bot shoots, every player gets a betting window first. Place or adjust your bets, then tap Ready to let the bot roll. Check: Games > Craps with a bot shooter: bets are open with a Ready button before the roll. (Craps needs ?multipoop in the URL, see PD-162.)', card:'PD-159'},
  {id:'PD-162', rev:1, room:'play', anchor:'#gamestab', text:'Craps is hidden from the Games list unless ?multipoop is in the URL (then it is remembered for the browser session). The game code is untouched; this is a casual gate, not security. Check: Games shows no Craps; reload with ?multipoop and it appears.', card:'PD-162'},
  {id:'PD-165', rev:1, room:'play', anchor:'#gamestab', text:'Yacht on desktop: a single mouse click on a category scores it (touch screens still need a double tap or long press). After scoring, Whoopsie shows for 3 seconds. Check: Play > Games > Yacht on desktop, roll, click one category: it scores at once; Whoopsie disappears after about 3 s.', card:'PD-165'},
  {id:'PD-171', rev:1, room:'play', anchor:'#gamestab', text:'Story Dice: a die you drag to a ring now grows only a little and no longer covers its neighbours. Check: Games > Story Dice, roll, drag a die along the ring row: it stays a similar size and clear of the dice beside it.', card:'PD-171'},
  {id:'PD-172', rev:1, room:'play', anchor:'#gamestab', text:'The Score entry menu under the Yacht card shows only on touch screens, where it matters. Check: on desktop, Games > Yacht shows no Score entry menu; on a phone (or touch emulation) it is there.', card:'PD-172'},
  {id:'PD-173', rev:2, room:'play', anchor:'#gamestab', text:'Story Dice with a bot: after the bot tells its story you see "Judge <bot>\'s story" with the sentence and rate it before play continues; this also holds when every player is a bot (you are the judge, nothing rates or advances without your grade). Check: Games > Story Dice, add a bot player, finish your story: the bot\'s turn ends with a Judge prompt and Bad / Fair / Good.', card:'PD-173'},
  {id:'PD-174', rev:1, room:'play', anchor:'#gamestab', text:'Story Dice: the arrangement row re-lays out when the window is resized or the phone turns, and sits in one row on a landscape phone. Check: start Story Dice with 9 dice, resize the window or rotate the phone: the rings and dice stay on screen; landscape phone shows one row.', card:'PD-174'},
  {id:'PD-175', rev:1, room:'play', anchor:'#gamestab', text:'Story Dice: the ring numbers and rings sit behind the dice, not in front. Check: Games > Story Dice, roll, tap a die into ring 1: the die covers the ring and its number, nothing is drawn over the dice.', card:'PD-175'},
  {id:'PD-176', rev:1, room:'play', anchor:'#gamestab', text:'Story Dice: the bar at the bottom (the dock) now shows the story sentence, the Bad / Fair / Good buttons and the last result, so you can play in full view with the side pane closed. Check: Story Dice, press Full view, roll, arrange: the bottom bar shows the sentence and the three rating buttons.', card:'PD-176'},
  {id:'PD-169', rev:1, room:'play', anchor:'#gravity', text:'New Gravity slider under Roll feel: 1x is true realistic gravity for a 20 mm d20 (9.81 m/s2); the slider runs on a log scale from 1/64x to 2x, and the default (about 1/23 of realistic, the feel the dice always had) is marked. A throw is scaled with the gravity so it flies the same arc at any setting. Check: Play > Roll feel > Gravity: drag it right and flick or roll (dice fall faster but still travel and tumble), left (they hang longer), Reset returns to the default.', card:'PD-169'},
  {id:'PD-166', rev:1, room:'play', anchor:'#gamestab', text:'Story Dice sets: see, edit and save the Story Dice sets you can make. Check: Games > Story Dice sets... > New Story set: pick glyph packs, 3-9 dice, d6/d8/d12/d20, a seed (Reroll seed), shuffled or in pack order, same or different dice; the preview and the set text update live. Save puts it in the bag (Bag > Sets), Use in game loads it into the Story Dice setup, Roll it rolls it on the table.', card:'PD-166'}
];
// PD-164: release tour. build-static.py --artifact --release-tour (the release build: no review flag) injects window.__PD_RELEASE_TOUR='4.1'; the same dot/box/Prev/Next machinery then walks NF_RELEASE instead of NF_ALL, remembered per version under its own key. Never active in a review build or the plain app. pane = Play tab to open first.
const NF_RELEASE=[
  {id:'T1', rev:1, room:'play', pane:'games', anchor:'#gamestab', text:'Story Dice game: roll picture dice, arrange them on the rings, and read the story they tell. Then rate it.'},
  {id:'T2', rev:1, room:'play', pane:'table', anchor:'#rollbox', text:'Picture dice in normal rolls: type something like 5d12{noto#1} to roll dice with emoji or hieroglyph faces.'},
  {id:'T3', rev:1, room:'play', pane:'table', anchor:'#gravity', text:'Gravity slider (Roll feel): make the table heavier or floatier. Reset brings back the default feel.'},
  {id:'T4', rev:1, room:'play', pane:'games', anchor:'#gamestab', text:'Yacht scoring that no longer misfires: on touch, tap to preview a box and long-press to score it.'},
  {id:'T5', rev:1, room:'play', pane:'games', anchor:'#gamestab', text:'Whoopsie! Undo (Yacht): scored the wrong box? You get 3 seconds to take it back.'},
  {id:'T6', rev:1, room:'play', anchor:'#bagbtn', text:'Change a die\'s design during a game (the Bag): swap designs mid-game. Only the look changes, and your dice and holds stay put.'},
].map(f=>({...f, card:"What's new in 4.1"}));
const NF_TOUR=window.__PD_REVIEW?null:(window.__PD_RELEASE_TOUR||null);
const NEW_FEATURES=NF_TOUR?NF_RELEASE:NF_ALL.filter(f=>!(window.__PD_RETIRED||[]).includes(f.id));

const NF_ON=!!(window.__PD_REVIEW||NF_TOUR||new URLSearchParams(location.search).get('new')==='1'), NFKEY=NF_TOUR?'prettydice.tour.'+NF_TOUR:'prettydice.seen';
let nfSeen=new Set(); try{ nfSeen=new Set(JSON.parse(localStorage.getItem(NFKEY)||'[]')); }catch{}
const nfKey=f=>f.id+'@'+f.rev, nfUnseen=()=>NEW_FEATURES.filter(f=>!nfSeen.has(nfKey(f)));
const nfSave=()=>{ try{ localStorage.setItem(NFKEY,JSON.stringify([...nfSeen])); }catch{} };
let nfOpen=null; const nfBox=el('div','nfbox'); nfBox.hidden=true; nfBox.setAttribute('role','dialog');
function nfCollapse(){ nfOpen=null; nfBox.hidden=true; document.querySelectorAll('.nfdot.open').forEach(d=>d.classList.remove('open')); }
function nfRetire(keys){ for(const k of keys) nfSeen.add(k); nfSave(); nfCollapse(); nfRender(); }
function nfPlace(f,dot){ const r=dot.getBoundingClientRect(), w=Math.min(300,innerWidth-24); nfBox.hidden=false; const h=nfBox.offsetHeight;
  let x=Math.max(12,Math.min(innerWidth-w-12,r.left-w/2)), y=r.bottom+10; if(y+h>innerHeight-12) y=Math.max(12,r.top-h-10); nfBox.style.left=x+'px'; nfBox.style.top=y+'px'; }
function nfShow(f,dot){ document.querySelectorAll('.nfdot.open').forEach(d=>d.classList.remove('open')); nfOpen=f; dot.classList.add('open'); nfBox.replaceChildren();
  const un=nfUnseen(), i=un.indexOf(f), hd=el('div','nfh'); hd.append(el('span','',f.card),el('small','','tap to collapse')); hd.onclick=nfCollapse;
  const nav=el('div','nfnav'), mk=(c,t,fn)=>{ const b=el('button',c,t); b.type='button'; b.onclick=fn; return b; };
  nav.append(mk('nfprev','Prev',()=>nfStep(-1)),el('span','nfcount',(i+1)+' of '+un.length),mk('nfnext','Next',()=>nfStep(1)));
  const got=el('button','nfgot','Got it'); got.type='button'; got.onclick=()=>{ const rest=un.filter(x=>x!==f), nx=rest.length?rest[i%rest.length]:null; nfRetire([nfKey(f)]); if(nx) nfGo(nx); };
  nfBox.append(hd,el('div','',f.text),nav,got); nfPlace(f,dot); }
// PD-163: Prev / Next walk the unseen entries in list order (wrapping); an anchor on the other room is reached with the existing Design | Play switch (#roomsw), then the callout opens once its dot is visible.
function nfStep(dir){ const un=nfUnseen(); if(!un.length) return; const i=un.indexOf(nfOpen); nfGo(un[((i<0?(dir>0?-1:0):i)+dir+un.length)%un.length]); }
function nfGo(f){ nfCollapse(); const inDesign=document.body.classList.contains('design'); if(f.room&&((f.room==='design')!==inDesign)) $('roomsw').click();
  if(f.pane){ const pt=document.querySelector('#paneltabs [data-pane='+f.pane+']'); if(pt&&pt.offsetParent) pt.click(); }
  let n=0; const iv=setInterval(()=>{ nfRender(); const d=nfDots.get(nfKey(f)); if(d&&!d.hidden){ clearInterval(iv); nfShow(f,d); } else if(++n>25){ clearInterval(iv); } },80); }
const nfShown=t=>{ if(!t) return false; const r=t.getBoundingClientRect(), cs=getComputedStyle(t); return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'; };
function nfAnchor(f){ const ts=[...document.querySelectorAll(f.anchor)]; let t=ts.find(nfShown)||ts.find(x=>x.closest("#dmenu"))||ts[0];   // PD-142.38.42: the anchor may list alternatives (#modesw,#roomsw); take the first one that is on screen
  if(t&&t.closest('#dmenu')&&!$('drawer').classList.contains('open')) t=$('drawerbtn'); return t; }
const nfDots=new Map();
function nfRender(){ if(!NF_ON) return; const un=nfUnseen(), stack=new Map(); let here=0; for(const [k,d] of [...nfDots]) if(!un.some(f=>nfKey(f)===k)){ d.remove(); nfDots.delete(k); }
  for(const f of un){ const k=nfKey(f); let d=nfDots.get(k); if(!d){ d=el('button','nfdot'); d.type='button'; d.dataset.feature=f.id; d.setAttribute('aria-label','New: '+f.card); d.onclick=e=>{ e.stopPropagation(); if(nfOpen===f) nfCollapse(); else nfShow(f,d); }; document.body.append(d); nfDots.set(k,d); }
    const t=nfAnchor(f), r=t&&t.getBoundingClientRect(), vis=!!r&&r.width>0&&r.height>0&&getComputedStyle(t).visibility!=='hidden'&&getComputedStyle(t).display!=='none'&&r.bottom>0&&r.top<innerHeight;
    d.hidden=!vis; if(vis){ here++; const n=stack.get(t)||0; stack.set(t,n+1); d.style.left=(r.right-4-(n%6)*18)+'px'; d.style.top=(r.top+4+Math.floor(n/6)*18)+'px';   /* PD-142.38.67: more than six dots on one anchor wrap to a second row instead of running under the centred title toast */ } d.classList.toggle('later',nfOpen!==f&&nfCollapsedOnce.has(k)); }
  const all=$('nfall'); if(all){ all.hidden=!un.length; const lb=NF_TOUR?'Skip tour':'Seen all'; all.querySelector('span').textContent=here===un.length?`${lb} (${un.length} new)`:`${lb} (${un.length} new, ${here} on this screen)`; all.title=here===un.length?'':'The others are on another tab or room: Design/Play, Look/Bag/Sets, Table/Games/Log'; } }
const nfCollapsedOnce=new Set();
if(NF_ON){ document.body.append(nfBox);
  const all=el('button','di'); all.id='nfall'; all.type='button'; all.setAttribute('role','menuitem'); all.append(el('span','',NF_TOUR?'Skip tour':'Seen all')); all.onclick=()=>{ closeDrawer(); nfRetire(NEW_FEATURES.map(nfKey)); }; $('dmenu').append(all);
  document.addEventListener('pointerdown',e=>{ if(nfOpen&&!e.target.closest('.nfbox,.nfdot')){ nfCollapsedOnce.add(nfKey(nfOpen)); nfCollapse(); } },true);
  addEventListener('keydown',e=>{ if(e.key==='Escape'&&nfOpen){ nfCollapsedOnce.add(nfKey(nfOpen)); nfCollapse(); } },true);
  setInterval(()=>{ nfRender(); if(nfOpen){ const d=nfDots.get(nfKey(nfOpen)); if(d&&!d.hidden) nfPlace(nfOpen,d); else nfCollapse(); } },400); nfRender(); }
window.__nfEntries=NEW_FEATURES; window.__nf={ on:NF_ON, unseen:()=>nfUnseen().map(nfKey), render:nfRender };
$('roomsw').onclick=()=>{ closeDrawer(); $(document.body.classList.contains('design')?'roll':'back').click(); };
$('rand').onclick=()=>randomize();   // not randomize itself: the click event would arrive as noBuild and skip the rebuild
$('roll').onclick=()=>goPlay();   // PD-142.38 slice 2: a pure switch; in roll view only the dock's Roll button throws
addEventListener('keydown',e=>{
  const typing=e.target.tagName==='INPUT'&&e.target.type==='text';
  if((e.ctrlKey||e.metaKey)&&!typing&&(e.key==='z'||e.key==='Z'||e.key==='y')){ e.preventDefault(); (e.key==='y'||e.shiftKey)?redo():undo(); return; }
  if(e.target.tagName==='INPUT'&&e.target.type!=='checkbox') return;
  if(e.code==='Space'){e.preventDefault(); if(!rolling&&(!game||designRoom)) randomize();} if(e.key==='r') dockRoll(true); if((e.key==='h'||e.key==='H')&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey) toggleFull(); if((e.key==='t'||e.key==='T')&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey) holdTop(true); });
addEventListener('keyup',e=>{ if(e.key==='t'||e.key==='T') holdTop(false); });
addEventListener('blur',()=>holdTop(false));
$('hint').textContent=['Design room: the Look settings, with Undo and Redo on top. Play room: Table, Games and Log tabs. The Design | Play switch changes room; nothing in Design throws dice.','drag = turn dice · right-drag or two fingers = orbit · scroll or pinch = zoom · double-click = reset view','Play: type a roll in the dock (2d6+3; 2d20kh keeps the highest, 4d6dl drops the lowest) or tap a preset chip, then Roll · tap a die to hold it · flick to throw again','space = randomize (Design) · ctrl+z / ctrl+y = undo / redo · r = roll (Play) · h = full view','hold the total, or hold t = top-down look at the dice (controls step aside)','drawer (the stacked-circles button) = sound, reset view, full view, hints, pause spin, reset to defaults'].join('\n');

/* ---------- interaction: drag-rotate with inertia, roll with a bounce ---------- */
const angVel=new THREE.Vector3(0,.5,0.08); let dragging=false, last=null;
const cv=renderer.domElement;
const views={show:{az:0,el:0}, roll:{az:0,el:0}};   // each view keeps its own camera angle and zoom, so repositioning the roll view leaves the showcase alone
const orbit={ get az(){return (rolling?views.roll:views.show).az;}, set az(v){(rolling?views.roll:views.show).az=v;}, get el(){return (rolling?views.roll:views.show).el;}, set el(v){(rolling?views.roll:views.show).el=v;} };
const getZoom=()=>rolling?state.rollZoom:state.zoom, setZoom=z=>{ if(rolling) state.rollZoom=z; else state.zoom=z; };
if(new URLSearchParams(location.search).get('zoom')) state.zoom=state.rollZoom=+new URLSearchParams(location.search).get('zoom'); let orbiting=false;      // right-drag orbits the camera; left-drag turns the dice
cv.addEventListener('contextmenu',e=>e.preventDefault());
function resetView(){ orbit.az=0; orbit.el=0; setZoom(1);
  if(!rolling){ rig.quaternion.identity(); dice.forEach(d=>d.mesh.quaternion.identity()); angVel.set(0,0,0); }   // PD-142.38.39: in the Design showcase Reset view also brings every die back to face-on (a die turned by hand or by the spin, or one carried over a rebuild, stayed cocked); in Play the dice lie as thrown
  save(); }
cv.addEventListener('dblclick',resetView);   // resets the view you are in
const ptrs=new Map(); let pinch=null;       // active touch/mouse pointers: one finger turns the dice, two fingers pinch-zoom and orbit
const pinchState=()=>{ const [a,b]=[...ptrs.values()]; return {d:Math.hypot(a[0]-b[0],a[1]-b[1])||1, m:[(a[0]+b[0])/2,(a[1]+b[1])/2]}; };
cv.addEventListener('pointerdown',e=>{ ptrs.set(e.pointerId,[e.clientX,e.clientY]); cv.setPointerCapture(e.pointerId);
  if(ptrs.size===2){ dragging=false; orbiting=false; flick=null; pinch=pinchState(); return; }
  if(e.button===2){ orbiting=true; last=[e.clientX,e.clientY]; return; }
  flick=rolling&&e.button===0?{x:e.clientX,y:e.clientY,t:performance.now()}:null;
  if(rolling||e.button!==0) return; dragging=true; last=[e.clientX,e.clientY];});
function flickVel(dx,dy,ms){        // screen swipe (px, ms) -> table-plane throw velocity: screen right/up become the camera's right/away directions on the mat
  camera.updateMatrixWorld(); const m=camera.matrixWorld.elements, f=new THREE.Vector3(); camera.getWorldDirection(f);
  let rx=m[0],rz=m[2],fx=f.x,fz=f.z; const rl=Math.hypot(rx,rz)||1, fl2=Math.hypot(fx,fz)||1; rx/=rl; rz/=rl; fx/=fl2; fz/=fl2;
  const sp=THREE.MathUtils.clamp(Math.hypot(dx,dy)/ms*11,7,30), l=Math.hypot(dx,dy)||1, ux=dx/l, uy=-dy/l;   // 1 px/ms (a lazy swipe) is about 11 units/s, a hard flick saturates at 30
  const dep=uy>0?uy*.55:uy;   // PD-142.38.65: an up swipe reads as more 'up' than 'in': less of it goes toward the back wall (the dice stay on the mat and read as carried up the screen); down and sideways keep their feel
  return {x:(rx*ux+fx*dep)*sp, z:(rz*ux+fz*dep)*sp}; }
let flick=null;           // roll view: a quick one-finger swipe throws the dice again
const endPtr=e=>{ const fl=flick; flick=null; if(fl&&e.type==='pointerup'&&ptrs.size===1&&!pinch&&Math.hypot(e.clientX-fl.x,e.clientY-fl.y)<8&&performance.now()-fl.t<400){ const hi=pickDie(e.clientX,e.clientY); if(hi>=0&&toggleHold(hi)) { ptrs.delete(e.pointerId); return; } }   // a short tap on a settled die holds or releases it
   if(fl&&e.type==='pointerup'&&ptrs.size===1&&!pinch&&rolling&&Math.hypot(e.clientX-fl.x,e.clientY-fl.y)>60&&performance.now()-fl.t<450) dockRoll(true,flickVel(e.clientX-fl.x,e.clientY-fl.y,Math.max(30,performance.now()-fl.t)));   // PD-142.38.49: the swipe's direction and speed carry into the throw
  ptrs.delete(e.pointerId); pinch=null; dragging=false; orbiting=false; if(ptrs.size===1){ last=[...ptrs.values()][0]; } };
cv.addEventListener('pointerup',endPtr); cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('pointermove',e=>{
  if(ptrs.has(e.pointerId)) ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptrs.size>=2&&pinch){ const p=pinchState();
    setZoom(THREE.MathUtils.clamp(getZoom()*pinch.d/p.d,.35,2.4));                       // fingers apart -> closer
    orbit.az-=(p.m[0]-pinch.m[0])*.006; orbit.el=THREE.MathUtils.clamp(orbit.el+(p.m[1]-pinch.m[1])*.006,-1.4,1.4); pinch=p; save(); return; }
  if(orbiting){ const dx=e.clientX-last[0], dy=e.clientY-last[1]; last=[e.clientX,e.clientY]; orbit.az-=dx*.006; orbit.el=THREE.MathUtils.clamp(orbit.el+dy*.006,-1.4,1.4); return; }
  if(!dragging) return;
  const dx=e.clientX-last[0], dy=e.clientY-last[1]; last=[e.clientX,e.clientY];
  const ax=new THREE.Vector3(dy,dx,0), len=ax.length(); if(!len) return;
  spinBy(new THREE.Quaternion().setFromAxisAngle(ax.normalize(),len*.012));
  angVel.copy(ax).multiplyScalar(len*.9); });
cv.addEventListener('wheel',e=>{e.preventDefault(); setZoom(THREE.MathUtils.clamp(getZoom()*(1+e.deltaY*.001),.35,2.4)); save();},{passive:false});
function spinBy(q){ if(isMulti()) dice.forEach(d=>d.mesh.quaternion.premultiply(q)); else rig.quaternion.premultiply(q); }
const randQuat=()=>{ const u=rng(), v=rng()*2*Math.PI, w=rng()*2*Math.PI, a=Math.sqrt(1-u), b=Math.sqrt(u); return new THREE.Quaternion(a*Math.sin(v),a*Math.cos(v),b*Math.sin(w),b*Math.cos(w)); };   // uniform random orientation (Shoemake) from the app RNG, so seeded rolls repeat

function resize(){ const w=stage.clientWidth,h=stage.clientHeight; renderer.setSize(w,h,false); camera.aspect=w/h;
  const sh=$('shelf'), band=(!document.body.classList.contains('inroll')&&sh.offsetParent)?Math.max(0,h-sh.offsetTop):0;   // the showcase is centred above the shelf: shift the view up by half the shelf's height (less on a phone, where the name text above is close)
  camera.setViewOffset(w,h,0,Math.round(band*(innerWidth<=760?.3:.5)),w,h); camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(stage); resize();
addEventListener('resize',()=>{ resize(); }); addEventListener('orientationchange',()=>setTimeout(()=>{ resize(); window.scrollTo(0,0); },250)); if(window.visualViewport) visualViewport.addEventListener('resize',resize);

/* ---------- physics roll (cannon-es) ---------- */
const ROLL_DROP=.105;   // PD-142.38.61/.65: fraction of the view height the roll view's dice are moved down (.15 put them a little too far down; .65 backed it off by 30%)
let topHold=false, topBlend=0;     // hold the total (or the t key) in the roll view: the camera swings straight overhead to check the dice, and returns on release
function holdTop(on){ topHold=!!on&&rolling; $('result').classList.toggle('peek',topHold); document.body.classList.toggle('peek',topHold); }
let placed=false, placing=false;   // placed: the dice are set out on the mat at rest, no roll yet (the next roll throws them from where they lie)
let world=null, bodies=[], rolling=false, rollT=0, restT=0, settled=false, retries=0, freeTries=0, camBlend=0;
const ROLL_DIR={y:.788,z:.615}, ROLL_AZ=-Math.PI/2;   // roll view: camera 90° to the left, higher up (the tray is wide along z, which is screen-horizontal from there)
let diceMat,matMat,ccDD,ccDM;
const throwK=()=>Math.max(.5,Math.min(8,Math.sqrt(-gravityY()/GRAV_OLD)));   // PD-169: velocities and spins scale with sqrt(g) so a throw flies the same arc (same apex, same reach, same turns) at any gravity; exactly 1 at the default
function gravityY(){ const x=state.gravity; return Math.abs(x-GRAV_DEF)<1e-9?-GRAV_OLD:-x*GRAV_REAL; }   // the default is exactly the old -34
function setGravity(x,persist=true){ x=+x; if(!isFinite(x)) return; state.gravity=Math.max(GRAV_LO,Math.min(GRAV_HI,x)); if(world){ world.gravity.set(0,gravityY(),0); bodies.forEach(b=>b.wakeUp&&b.wakeUp()); } if(persist) save(); syncGravityUI(); }
function syncGravityUI(){ const x=state.gravity, el=$('gravity'); if(!el) return; if(document.activeElement!==el) el.value=gravToPos(x); $('gravityv').textContent=(x<.1?x.toFixed(3):x.toFixed(2))+'x realistic'+(Math.abs(x-GRAV_DEF)<1e-9?' (default)':''); }
function applyContacts(){ if(!ccDD) return; ccDD.friction=state.fricDice; ccDM.friction=state.fricMat; ccDD.restitution=ccDM.restitution=state.bounce; }
// One table for every ring drawn on the mat: each meaning gets its own colour (never reuse one; hold = gold, cocked/invalid = red-magenta). Settings and games reuse it.
const RING_COLORS={hold:0xf2c14e, cocked:0xff2d6f, cup:0x6ec6ff}; document.documentElement.style.setProperty('--hold-col','#'+RING_COLORS.hold.toString(16).padStart(6,'0'));   // cup: a die that is under the cup (Liar's Dice): never gold (held) or red-magenta (cocked); the panel dots use the same blue
let storyDeal=null, storyPrev=null;   // storyPrev: the setup preview (the story dice on the mat before Start), with what to restore   // Story dice: {fp, glyphs:[[glyph per face] per die]} for the running game; specsFor/buildDice paint these on the faces
let game=null, gameSnap=null, gameAwaiting=false, gameMsg='', gendAsk=false;   // the running game (see the games section near the end)
let held=new Set(), holdRings=[], heldPose={}, restoring=null, restoreTries=0;   // heldPose[i]: the face of record (label, orientation, rest height) a bumped held die is put back to       // PD-142.1: dice the player has locked; a roll throws only the others
function dropHoldRings(){ for(const m of holdRings){ m.parent&&m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); } holdRings=[]; }
function clearHolds(){ held.clear(); heldPose={}; restoring=null; dropHoldRings(); updateHoldUI(); }
function faceLabel(i,q){ const d=dice[i], four=d.faces.length===4; let best=0, bv=four?1e9:-1e9; d.faces.forEach((f,k)=>{ const y=f.n.clone().applyQuaternion(q).y; if(four?y<bv:y>bv){bv=y;best=k;} }); return d.labs[best]; }
function recordHolds(){ for(const k of Object.keys(heldPose)) if(!held.has(+k)) delete heldPose[k];   // face of record is taken when a die is first held
  if(!settled||restoring) return; for(const i of held){ if(heldPose[i]||!bodies[i]) continue; const b=bodies[i], q=new THREE.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w); heldPose[i]={q,y:b.position.y,label:faceLabel(i,q)}; } }
function syncHoldRings(){ dropHoldRings(); recordHolds(); if(!rolling) return;
  for(const i of held){ if(!bodies[i]||!dice[i].mesh.visible) continue; const r=(dice[i].r||1)*1.25, m=new THREE.Mesh(new THREE.RingGeometry(r*.8,r,64),new THREE.MeshBasicMaterial({color:RING_COLORS.hold,transparent:true,opacity:.95,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
    m.renderOrder=11; m.rotation.x=-Math.PI/2; m.userData={i}; m.position.set(bodies[i].position.x,TABLE_Y+.05,bodies[i].position.z); rig.add(m); holdRings.push(m); }
  updateHoldUI(); }
function updateHoldUI(){ for(const m of holdRings) m.visible=!leanDice[m.userData.i];   // a die that is both held and cocked shows the cocked ring only
  const R=$('result'); R.querySelectorAll('.heldnote').forEach(e=>e.remove()); if(!held.size||!settled||game) return;
  const b=document.createElement('button'); b.className='relean heldnote'; b.textContent=held.size+' held \u00B7 release'; b.onclick=ev=>{ ev.stopPropagation(); clearHolds(); }; R.append(b); }
function toggleHold(i){ if(!rolling||!settled||!bodies[i]) return false; if(leanDice[i]&&!held.has(i)){ if(game){ gameMsg='That die is leaning: re-roll it first'; renderGame(); } return false; }   // lean trumps hold
 if(game){ if(!gameHold(i)) return false; } else if(held.has(i)) held.delete(i); else held.add(i); syncHoldRings(); return true; }   // in a game the engine decides what may be held
const _ray=new THREE.Raycaster(), _ndc=new THREE.Vector2();
function pickDie(cx,cy){ if(!rolling||!settled||!bodies.length) return -1; const r=cv.getBoundingClientRect(); _ndc.set((cx-r.left)/r.width*2-1,-((cy-r.top)/r.height)*2+1); _ray.setFromCamera(_ndc,camera);
  let best=-1,bd=1e9; dice.forEach((d,i)=>{ const h=_ray.intersectObject(d.mesh,true); if(h.length&&h[0].distance<bd){ bd=h[0].distance; best=i; } }); return best; }
/* ---- slice 8 (PD-142.38): long-press a die in the Play room to change that one die's design (skin only; the die type, face and place stay) ---- */
function dieScreen(i){ const r=cv.getBoundingClientRect(), v=new THREE.Vector3(); dice[i].mesh.getWorldPosition(v); v.project(camera); return {x:r.left+(v.x+1)/2*r.width, y:r.top+(1-v.y)/2*r.height}; }
function dieSwapOK(i){ const d=dice[i]; if(!d||!rolling||!settled||!bodies[i]||!d.mesh.visible) return false; if(game&&game.info&&game.info.allowDesignSwap===false) return false; return !!bag&&bag.designs.length>0; }
function dieTerms(i){   // the notation split so die i can carry its own design: {terms, mod, at} or null when this layout is not supported
  const d=dice[i]; let p; if(state.shape==='custom'){ p=parseNotation(state.notation); if(p.error) return null; } else { const m=/^d(\d+)$/.exec(state.shape); if(!m||!SIDES[+m[1]]) return null; p={terms:[{count:1,sides:+m[1]}],mod:0,group:1}; }
  if((p.group||1)>1||d.part) return null; const ti=state.shape==='custom'?d.term:0, t=p.terms[ti]; if(!t||t.keep||t.faces||t.sides===100) return null;
  const c=state.shape==='custom'?dice.slice(0,i).filter(x=>x.term===ti).length:0; return {p,ti,t,c}; }
function dieDesignOf(i){ return dice[i].design||(bag&&!bag.active.draft?bag.active.design:null); }
function reskinDie(i,designId){
  if(!dieSwapOK(i)) return false; const dt=dieTerms(i); if(!dt) return false; const {p,ti,t,c}=dt, after=t.count-c-1;
  const terms=[...p.terms.slice(0,ti),...(c?[{...t,count:c}]:[]),{...t,count:1,design:designId},...(after?[{...t,count:after}]:[]),...p.terms.slice(ti+1)];
  checkpoint(); const poses=bodies.map(b=>({p:b.position.clone(),q:b.quaternion.clone()})), res=$('result'), html=res.innerHTML, wasOn=res.classList.contains('on'), wasPlaced=placed;
  state.notation=fmtNotation(terms,p.mod,1); state.shape='custom'; rollSetId=null; if(bag) bag.active.set=null;
  { const bx=$('rollbox'); if(bx){ bx.value=state.notation; dockSeen=stateFormula(); boxSeen=normF(bx.value.trim()); } }   // PD-142.38.50: the dock box mirrors the new formula first; the rebuild below hops through the Design room, and roomFormulaSync used to write the OLD box text back over the per-die design (the pick did nothing)
  buildDice(); pendingLay={n:dice.length,poses}; startRoll(false,true);
  res.innerHTML=html; res.classList.toggle('on',wasOn); placed=wasPlaced; syncUI(); save(); if(game) renderGame(); return true; }
function dieMenu(i){
  if(!dieSwapOK(i)) return false; const dt=dieTerms(i), cur=dieDesignOf(i), items=[{head:'Design for this die'}];
  if(!dt) items.push({label:'This layout cannot mix designs',disabled:true,run:()=>{}});
  else for(const e of bag.designs) items.push({label:(e.id===cur?'✓ ':'')+e.name,run:()=>reskinDie(i,e.id)});
  if(bag.active.set&&setOps.find(bag.active.set)) items.push({label:'Edit this set…',run:()=>openSetEditor(bag.active.set)});
  const pt=dieScreen(i), r0={left:pt.x,right:pt.x,top:pt.y,bottom:pt.y,width:0,height:0}; openMenu({getBoundingClientRect:()=>r0},items); return true; }
let dieLP=null;
const dieLPclear=()=>{ if(dieLP){ clearTimeout(dieLP.t); dieLP=null; } };
cv.addEventListener('pointerdown',e=>{ dieLPclear(); if(e.button!==0||!rolling||ptrs.size!==1) return; const x=e.clientX,y=e.clientY; dieLP={x,y,t:setTimeout(()=>{ dieLP=null; if(ptrs.size!==1||pinch) return; const hi=pickDie(x,y); if(hi>=0&&dieMenu(hi)) flick=null; },500)}; });
cv.addEventListener('pointermove',e=>{ if(dieLP&&Math.hypot(e.clientX-dieLP.x,e.clientY-dieLP.y)>8) dieLPclear(); });
for(const ev of ['pointerup','pointercancel']) cv.addEventListener(ev,dieLPclear);
cv.addEventListener('contextmenu',e=>{ if(!rolling) return; const hi=pickDie(e.clientX,e.clientY); if(hi>=0) dieMenu(hi); });
function startRoll(launch=false,place=false,vel=null){        // launch: re-roll from the dice's current spots (shake / flick) instead of dropping them from above
  if(!dice.length) return; if(game&&!place&&!gameBeforeRoll()) return; if(state.sound) audioInit();
  const prev=launch&&rolling&&bodies.length===dice.length?bodies.map(b=>({p:b.position.clone(),q:b.quaternion.clone()})):null;
  gameCallout=null; placed=false; rollKey=state.shape+'|'+state.notation; clearFx(); clearLeans(); const wasRolling=rolling; rolling=true; settled=false; document.body.classList.add('throwing'); rollT=0; restT=0; retries=0; freeTries=0; $('result').classList.remove('on'); designRoom=false; syncMode(); syncDock();
  const poses=dice.map(d=>{const p=new THREE.Vector3(),q=new THREE.Quaternion(); d.mesh.getWorldPosition(p); d.mesh.getWorldQuaternion(q); return {p,q};});
  rig.position.set(0,0,0); rig.quaternion.identity();
  const dieR=d=>d.r||(d.r=Math.max(...d.verts.map(v=>Math.hypot(v.x,v.y,v.z)))), foot=dice.reduce((a,d)=>a+(2*dieR(d))**2,0);
  const halfX=Math.max(2.4,Math.sqrt((foot+4)/1.5)), halfZ=Math.max(3.6,1.5*halfX);   // the tray is sized by how many (and how big) the dice are, not by the screen
  const sc=Math.max(1,halfZ/3.6); table.scale.setScalar(sc);
  Object.assign(key.shadow.camera,{left:-7.3*sc,right:7.3*sc,top:7.3*sc,bottom:-7.3*sc,far:20+10*sc}); key.shadow.camera.updateProjectionMatrix();
  for(const i of [...held]) if(i>=dice.length) held.delete(i); dropHoldRings(); restoring=null; restoreTries=0;
  if(!place) for(const i of held){ if(heldPose[i]||!poses[i]) continue; heldPose[i]={q:poses[i].q.clone(),y:poses[i].p.y,label:faceLabel(i,poses[i].q)}; }   // a die held without a record (engine locks) is recorded as it lies now
  rollHalf={x:halfX,z:halfZ}; world=new CANNON.World({gravity:new CANNON.Vec3(0,gravityY(),0)}); world.allowSleep=true;
  world.defaultContactMaterial.friction=.2; world.defaultContactMaterial.restitution=state.bounce;
  diceMat=new CANNON.Material('dice'); matMat=new CANNON.Material('mat');                 // dice-on-dice and dice-on-mat (floor + walls) get separate friction
  world.addContactMaterial(ccDD=new CANNON.ContactMaterial(diceMat,diceMat)); world.addContactMaterial(ccDM=new CANNON.ContactMaterial(diceMat,matMat)); applyContacts();
  const plane=(pos,eul)=>{const b=new CANNON.Body({mass:0,material:matMat,shape:new CANNON.Plane()}); b.position.set(...pos); b.quaternion.setFromEuler(...eul); world.addBody(b);};
  plane([0,TABLE_Y,0],[-Math.PI/2,0,0]); plane([halfX,0,0],[0,-Math.PI/2,0]); plane([-halfX,0,0],[0,Math.PI/2,0]);
  plane([0,0,halfZ],[0,Math.PI,0]); plane([0,0,-halfZ],[0,0,0]);
  const hookHit=b=>b.addEventListener('collide',e=>{ const o=e.body; if(o.mass>0&&o.id<b.id) return; const c=e.contact; _ip.set(c.bi.position.x+c.ri.x,c.bi.position.y+c.ri.y,c.bi.position.z+c.ri.z); onImpact(Math.abs(c.getImpactVelocityAlongNormal()),o.mass>0?'dice':'table',_ip); });
  const starts=[], dropH=3.5+5*state.rollZoom;   // drop height above the table grows as the camera zooms out
  bodies=dice.map((d,i)=>{
    const b=new CANNON.Body({mass:1, material:diceMat, linearDamping:.04, angularDamping:.1, sleepSpeedLimit:.1, sleepTimeLimit:1,
      shape:new CANNON.ConvexPolyhedron({vertices:d.verts.map(v=>new CANNON.Vec3(v.x,v.y,v.z)), faces:d.faces.map(f=>[...f.idx])})});
    const {p,q}=poses[i]; d.mesh.position.copy(p); d.mesh.quaternion.copy(q);
    if(held.has(i)&&!place){ b.position.set(p.x,p.y,p.z); b.quaternion.set(q.x,q.y,q.z,q.w); hookHit(b); world.addBody(b); return b; }   // held: starts where it lies and is not thrown; the others may bump it (finishRoll puts it back to its face of record)
    const n=dice.length, R=()=>rng()-.5, rq=randQuat();
    let px=0,pz=0; for(let t=0;t<60;t++){ px=(rng()*2-1)*(halfX-1.1); pz=(rng()*2-1)*(halfZ-1.1);
      if(starts.every(o=>Math.hypot(o[0]-px,o[1]-pz)>2.3)) break; }                      // random drop spot, kept apart from the other dice when there is room
    starts.push([px,pz]);
    if(prev){                                                                              // thrown up off the mat from where it lay
      const pp=prev[i]; b.position.set(pp.p.x,pp.p.y+.25,pp.p.z); b.quaternion.copy(pp.q); d.mesh.quaternion.set(pp.q.x,pp.q.y,pp.q.z,pp.q.w);
      b.velocity.set(vel?vel.x+R()*3:-pp.p.x*.5+R()*6,13+rng()*7,vel?vel.z+R()*3:-pp.p.z*.5+R()*6); b.angularVelocity.set(R()*50,R()*50,R()*50);
      { const k=throwK(); if(k!==1){ b.velocity.scale(k,b.velocity); b.angularVelocity.scale(k,b.angularVelocity); } }
    } else {
    b.position.set(px,TABLE_Y+dropH+i*1.1+rng()*2,pz);                           // random heights too, so overlapping spots never collide at spawn
    b.quaternion.set(rq.x,rq.y,rq.z,rq.w); d.mesh.quaternion.copy(rq);
    b.velocity.set(-px*.4+R()*4,-2-rng()*4,-pz*.4+R()*4);
    b.angularVelocity.set(R()*40,R()*40,R()*40);
    { const k=throwK(); if(k!==1){ b.velocity.scale(k,b.velocity); b.angularVelocity.scale(k,b.angularVelocity); } } }
    const layFrom=!place?null:(pendingLay&&pendingLay.n===dice.length&&pendingLay.poses.length===dice.length?pendingLay:(lastLay&&lastLay.key===rollKey&&lastLay.n===dice.length?lastLay:null));
    if(layFrom){ const L=layFrom.poses[i]; b.position.set(L.p.x,L.p.y+.02,L.p.z); b.quaternion.copy(L.q); d.mesh.quaternion.copy(L.q); b.velocity.set(0,0,0); b.angularVelocity.set(0,0,0); }   // put back where it last lay
    hookHit(b);   // one sound per pair
    world.addBody(b); return b;});
  pendingLay=null;
  if(place){   // set the dice out as if put down by hand: let them fall and come to rest out of sight (no sound, no result), then wait for a roll
    placing=true; try{ simSteps(1500); }finally{ placing=false; } settled=true; placed=true; restT=0; document.body.classList.remove('throwing');   /* dice at rest, nothing is moving: the log and dock are live (PD-142.14.3.1.14) */
    dice.forEach((d,i)=>{ d.mesh.position.copy(bodies[i].position); d.mesh.quaternion.copy(bodies[i].quaternion); });
    const R=$('result'); R.textContent=''; const h=document.createElement('div'); h.className='brk'; h.textContent='Ready: tap Roll or flick the dice'; R.append(h); R.classList.add('on'); }
}
var lastLay=null, pendingLay=null;
function exitRoll(instant){
  if(game&&!instant) return;   // a game keeps the dice on the mat until it ends
  holdTop(false); clearHolds();
  clearFx(); clearLeans();
  if(!rolling&&!instant) return;
  if(rolling&&bodies.length===dice.length&&settled) lastLay={key:rollKey,n:dice.length,poses:bodies.map(b=>({p:b.position.clone(),q:b.quaternion.clone()}))};   // slice 4c: Play shows the dice as they last lay
  rolling=false; placed=false; world=null; bodies=[]; $('result').classList.remove('on'); if(!game&&!holdRoom) designRoom=true; syncMode();
  dice.forEach(d=>{d.mesh.position.set(d.x,d.y,0); d.mesh.quaternion.identity();});
  rig.position.set(0,0,0); if(!instant) rig.quaternion.identity();
}
function readResult(){
  let total=0, parts=[];
  dice.forEach((d,i)=>{
    const q=new THREE.Quaternion(bodies[i].quaternion.x,bodies[i].quaternion.y,bodies[i].quaternion.z,bodies[i].quaternion.w);
    const four=d.faces.length===4; let best=0, bv=four?1e9:-1e9;
    d.faces.forEach((f,k)=>{const y=f.n.clone().applyQuaternion(q).y; if(four?y<bv:y>bv){bv=y;best=k;}});
    parts.push({label:d.labs[best], flat:Math.abs(bv)});
  });
  return parts;
}
function tiltInfo(i){                                   // how far die i is from lying flat, and which way to tip it
  const d=dice[i], b=bodies[i], q=new THREE.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w), four=d.faces.length===4;
  let best=null, bf=null, bv=four?1e9:-1e9; d.faces.forEach(f=>{ const n=f.n.clone().applyQuaternion(q); if(four?n.y<bv:n.y>bv){bv=n.y;best=n;bf=f;} });
  const v0=d.verts[bf.idx[0]], h=Math.abs(bf.n.x*v0.x+bf.n.y*v0.y+bf.n.z*v0.z); d.r=d.r||Math.max(...d.verts.map(v=>Math.hypot(v.x,v.y,v.z)));
  return {flat:Math.abs(bv), n:best, four, lift:(b.position.y-TABLE_Y-h)/d.r};   // lift: how far the die's centre sits above where it would if lying on the mat (> ~.1 = propped on another die)
}
function assistSettle(dt){          // tracks how long each die has been nearly still (restCheck uses it). Dice are never nudged; leaning ones are flagged and re-rolled on request
  bodies.forEach(b=>{ const slow=b.velocity.lengthSquared()<.25&&b.angularVelocity.lengthSquared()<1.2; b.slowT=slow?(b.slowT||0)+dt:0; });
}
function restCheck(dt){   // every die individually still for a moment (one jittering die no longer resets the others)
  return rollT>12 || bodies.every(b=>(b.slowT||0)>.35&&b.position.y<TABLE_Y+2.4);   // after 12 s stop waiting on a die that will not go still
}
/* Restore (PD-142.28, shared with PD-125 / PD-63): a die that ended on the wrong face is lifted, spun to its face of record and set down. */
const RESTORE_T=.75;
function startRestore(ids){ restoring={t:0,ids,from:{}}; for(const i of ids){ const b=bodies[i]; restoring.from[i]={p:new THREE.Vector3(b.position.x,b.position.y,b.position.z),q:new THREE.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w)};
    b.type=CANNON.Body.KINEMATIC; b.velocity.set(0,0,0); b.angularVelocity.set(0,0,0); b.wakeUp(); } }
function tickRestore(dt){ if(!restoring) return; restoring.t+=dt; const u=Math.min(1,restoring.t/RESTORE_T), e=u*u*(3-2*u), tmp=new THREE.Quaternion();
  for(const i of restoring.ids){ const f=restoring.from[i], b=bodies[i], rec=heldPose[i], lift=1.4*Math.sin(Math.PI*u)*(dice[i].r||1);
    tmp.copy(f.q).slerp(rec.q,e); b.position.set(f.p.x,f.p.y+(rec.y-f.p.y)*e+lift,f.p.z); b.quaternion.set(tmp.x,tmp.y,tmp.z,tmp.w); b.velocity.set(0,0,0); b.angularVelocity.set(0,0,0); }
  if(u>=1){ for(const i of restoring.ids){ const b=bodies[i]; b.type=CANNON.Body.DYNAMIC; b.mass=1; b.updateMassProperties(); b.velocity.set(0,0,0); b.angularVelocity.set(0,0,0); b.slowT=0; b.wakeUp(); } restoring=null; } }
/* PD-155: self-check backup. recFaces is the face of record per die from the last settle; faceCheck compares it with the face the orientation shows now and re-reads on disagreement */
var faceTick=0, recFaces=null, faceFixes=0;
function faceWarn(i,oldV,newV,why){ faceFixes++; console.warn('PD-155 face self-check ('+why+'): die '+i+' ('+(dice[i]&&dice[i].name)+') stored '+oldV+', re-read '+newV); }
function faceCheck(why){ if(!rolling||!world||!settled||!recFaces||restoring||placing||recFaces.length!==bodies.length) return false;
  const now=readResult(), bad=[]; now.forEach((p,i)=>{ if(p.label!==recFaces[i]&&!leanDice[i]) bad.push(i); });   // a flagged lean is handled by refreshLeans
  if(!bad.length) return false;
  bad.forEach(i=>faceWarn(i,recFaces[i],now[i].label,why)); recFaces=now.map(p=>p.label); finishRoll(); return true; }
function reconcileParts(parts,why){ const now=readResult(); now.forEach((p,i)=>{ if(parts[i]&&p.label!==parts[i].label){ faceWarn(i,parts[i].label,p.label,why); parts[i]=p; } }); return parts; }
function finishRoll(){ restT=0; if(placing){ settled=true; return; }
  if(restoring) return;   // a held die is being put back: finishRoll runs again when it is down
  const parts=readResult();
  { const bad=restoreTries<3?[...held].filter(i=>bodies[i]&&heldPose[i]&&(parts[i].label!==heldPose[i].label||isLean(i))):[];
    if(bad.length){ restoreTries++; startRestore(bad); return; } }
  leanDice=bodies.map((b,i)=>isLean(i));   // propped on another die, or cocked: flagged, never re-thrown automatically
  const alone=leanDice.map((l,i)=>l&&!held.has(i)&&!bodies.some((o,j)=>j!==i&&bodies[i].position.distanceTo(o.position)<(dice[i].r+dice[j].r)));   // leaning yet no other die within reach: it is not propped on anything
  if(alone.some(Boolean)&&freeTries>=2&&freeTries<5){ freeTries++; rollT=Math.min(rollT,4); dropIn(alone.map((a,i)=>a?i:-1).filter(i=>i>=0)); leanDice=[]; return; }   // topple attempts did not free it: it drops in again from above
  if(alone.some(Boolean)&&freeTries<2){ freeTries++; rollT=Math.min(rollT,4); bodies.forEach((b,i)=>{ if(!alone[i]) return; b.free=true; b.angularDamping=.05; b.linearDamping=.02; b.wakeUp(); b.slowT=-1.2;
    const t=tiltInfo(i), ax=new THREE.Vector3().crossVectors(t.n,new THREE.Vector3(0,t.four?-1:1,0)), ang=Math.asin(Math.min(1,ax.length()));   // tip it the way gravity would: the die sits balanced on an edge/corner the solver will not release
    if(ax.lengthSq()>1e-8){ ax.normalize().multiplyScalar(2.5+ang*5); b.angularVelocity.set(ax.x,ax.y,ax.z); } else b.angularVelocity.set((rng()-.5)*3,0,(rng()-.5)*3); }); leanDice=[]; return; }   // let gravity finish the job (a die that fell asleep balanced on an edge)
  settled=true; showLeans(); recFaces=parts.map(p=>p.label);
  const fmt=(d,p)=> d.name==='d10'&&p.label===0 ? 10 : d.name==='d%' ? String(p.label).padStart(2,'0') : p.label;
  droppedDice=new Set();
  let main, sub='', subItems=null, subMod='', storyText='', glyphLog=false;
  if(state.shape==='custom'){
    const P=parseNotation(state.notation), G=P.group||1;
    if(G>1){ const per=Array.from({length:G},()=>P.terms.map(()=>[])), perI=Array.from({length:G},()=>P.terms.map(()=>[]));
      dice.forEach((d,i)=>{ if(d.part==='tens'){ const t=parts[i].label+parts[i+1].label; per[d.copy][d.term].push(t===0?100:t); perI[d.copy][d.term].push(i); } else if(d.part!=='ones'){ per[d.copy][d.term].push(fmt(d,parts[i])); perI[d.copy][d.term].push(i); } });
      per.forEach((v,c)=>v.forEach((vals,ti)=>{ const k=keepSum(vals,P.terms[ti].keep).kept; perI[c][ti].forEach((di,j)=>{ if(!k.has(j)) droppedDice.add(di); }); }));
      const ls=per.map((v,c)=>groupLine(P.terms,P.mod,v,c+1)); main=ls.map(l=>l.total).join(' · '); subItems=ls.map(l=>l.item); sub=subItems.map(i=>i.text).join('  ·  '); }
    else {
    const groups=P.terms.map(()=>[]);
    const gI=P.terms.map(()=>[]), gN=P.terms.map(()=>[]);
    dice.forEach((d,i)=>{ if(d.part==='tens'){ const t=parts[i].label+parts[i+1].label; groups[d.term].push(t===0?100:t); gI[d.term].push(i); gN[d.term].push(null); } else if(d.part!=='ones'){ groups[d.term].push(fmt(d,parts[i])); gI[d.term].push(i); gN[d.term].push(d.glyphs?faceName(d.glyphs[parts[i].label-1]):null); } });
    const ks=groups.map((g,i)=>keepSum(g,P.terms[i].keep)), sums=ks.map(k=>k.sum), total=sums.reduce((a,b)=>a+b,0)+P.mod;
    ks.forEach((k,ti)=>gI[ti].forEach((di,j)=>{ if(!k.kept.has(j)) droppedDice.add(di); }));   // dice dropped by keep/drop/adv/dis: they do not count, so no nat 20 / nat 1 effect for them
    main=String(total); const glyphOnly=G===1&&!P.mod&&gN.every(a=>a.length&&a.every(Boolean)); glyphLog=glyphOnly;
    if(P.terms.some(t=>t.faces)){ const ids=[]; dice.forEach((d,i)=>{ if(d.glyphs&&P.terms[d.term].faces&&!droppedDice.has(i)) ids.push(d.glyphs[parts[i].label-1].id); }); if(ids.length) storyText=sentenceFor(ids,0).text; }   // PD-167: a set with glyph faces reads as a sentence
    if(P.terms.length>1||P.terms[0].count>1||P.mod||P.terms[0].keep||P.terms.some(t=>t.faces)){ subItems=P.terms.map((t,i)=>({sides:t.sides,design:t.design,text:keepLine(t,groups[i],ks[i],gN[i].some(Boolean)?gN[i]:null,glyphOnly)})); subMod=(P.mod?`${P.mod>0?'+':''}${P.mod}`:'')+(P.mod||(P.terms.length>1&&!glyphOnly)?` = ${total}`:'');   /* PD-142.14.2.1.4: a modifier or a second term ends in '= total', like 3d6 does */
      sub=subItems.map(i=>i.text).join('  ·  ')+(subMod?'  ·  '+subMod:''); }
    }
  }
  else if(state.shape==='set7'){ main=parts.map((p,i)=>fmt(dice[i],p)).join(' · '); sub=dice.map(d=>d.name).join('  ·  '); }   // sub line labels each value
  else if(SHAPES[state.shape].pair){ const t=parts[0].label+parts[1].label; main=String(t===0?100:t); }
  else main=String(fmt(dice[0],parts[0]));
  const R=$('result'); R.textContent=''; const m=document.createElement('div'); m.className='tot'; m.title='Hold for a top-down view'; m.textContent=main; m.style.fontSize=state.shape==='set7'||main.length>6?'30px':''; R.append(m);
  for(const ev of ['pointerup','pointercancel','lostpointercapture']) m.addEventListener(ev,()=>holdTop(false));
  m.addEventListener('pointerdown',e=>{ e.stopPropagation(); try{m.setPointerCapture(e.pointerId);}catch{} holdTop(true); });
  m.addEventListener('contextmenu',e=>e.preventDefault());
  if(sub){ const d2=document.createElement('div'); d2.className='brk'; if(subItems) d2.append(rollItemsEl(subItems,subMod)); else d2.textContent=sub; R.append(d2); }
  document.body.classList.remove('throwing'); updateLeanUI(); syncHoldRings(); if(storyText){ const d4=document.createElement('div'); d4.className='brk look'; d4.textContent=storyText; R.append(d4); }
  { const look=logRoll(main,sub,subItems,subMod,storyText,glyphLog); if(look){ const d3=document.createElement('div'); d3.className='brk look'; d3.textContent='→ '+look; R.append(d3); } } if(game) gameOnSettled(parts);
  showDropped();
  R.classList.add('on'); console.log('ROLL_RESULT',main,sub); triggerFx(parts.map((p,i)=>leanDice[i]||droppedDice.has(i)?{...p,label:null}:p));   // no nat 20 / nat 1 fanfare for a die that is still leaning: its face is not final
}
$('back').onclick=()=>goDesign();
/* PD-142.38 slice 4: two rooms. Design | Play is a pure switch, it never throws. designRoom is the room the owner chose; it matters in a game, where the dice stay on the mat while the Design room shows the look (a running game survives the visit, and Play carries a dot) */
var designRoom=true;
function goDesign(){ syncGameLook(true); designRoom=true; if(rolling||game) exitRoll(true); syncMode(); }
function goPlay(){ designRoom=false; if(!rolling) startRoll(false,true); syncMode(); if(game&&!game.setup) renderGame(); }   // PD-180: a render made in the Design room (no roll view) put the story dice into the flat tiles; Play re-syncs so the 3D arrangement comes back   // placed unrolled; only the dock's Roll throws
/* PD-142.38.47: the dock formula box (Play) and the Custom set (Design: state.shape/notation) are one formula. On a room switch the side that was just edited wins: Design -> Play loads the box from the design's formula when that changed; Play -> Design writes the box into the design (a plain dN selects that shape, anything else is Custom). Shapes that are not a dN or Custom (rd12, Standard 7) are left alone. */
const stateFormula=()=>state.shape==='custom'?state.notation:/^d\d+$/.test(state.shape)?'1'+state.shape:null;
const normF=v=>{ const p=parseNotation(v,true); return p.error?null:fmtNotation(p.terms,p.mod,p.group); };
let lastDes=null, dockSeen=null, boxSeen=null;   // boxSeen: the dock box as of the last hop; only a box edited since then wins over the design (PD-142.38.53: code that sets state.notation itself, then rebuilds, must not be overwritten by stale box text)
   // dockSeen: the design formula as of the last Play <-> Design hop
function roomFormulaSync(des){ if(lastDes===des) return; const was=lastDes; lastDes=des; const box=$('rollbox'); if(!box||was===null) { dockSeen=stateFormula(); boxSeen=normF(box?box.value.trim():''); return; }
  if(des){ const f=normF(box.value.trim()); if(f&&f!==boxSeen&&f!==normF(stateFormula()||'')){ const p=parseNotation(f,true), one=p.terms.length===1&&!p.mod&&!(p.group>1)&&p.terms[0].count===1&&!p.terms[0].keep&&!p.terms[0].design&&SHAPES['d'+p.terms[0].sides]?'d'+p.terms[0].sides:null; checkpoint(); if(one) state.shape=one; else { state.notation=f; state.shape='custom'; } rebuildKeepMode(); } }
  else { const f=stateFormula(); if(f!==null&&f!==dockSeen){ box.value=normF(f); box.classList.remove('bad'); forceCustom=null; if(typeof formulaSync==='function') formulaSync(); } }
  dockSeen=stateFormula(); boxSeen=normF(box.value.trim()); }
function syncMode(){ placeSwitch();  const des=designRoom&&!rolling; try{ roomFormulaSync(des); }catch(e){ console.warn(e); } document.body.classList.toggle('inroll',rolling); document.body.classList.toggle('design',des); if(!rolling) document.body.classList.remove('throwing'); resize(); $('back').classList.toggle('on',des); $('roll').classList.toggle('on',!des); $('back').setAttribute('aria-pressed',des); $('roll').setAttribute('aria-pressed',!des); $('roll').classList.toggle('gamelive',!!game&&!game.setup&&des); if(typeof applyRoomPane==='function') try{ applyRoomPane(); }catch{} try{ const rs=$('roomsw'); if(rs) dset(rs,'<svg viewBox="0 0 24 24"><path d="M7 8h12M15 4l4 4-4 4M17 16H5M9 12l-4 4 4 4"/></svg>',des?'Switch to Play':'Switch to Design'); }catch{} }   // Play carries a dot while a game runs and you are in Design
syncMode();

const _ip=new THREE.Vector3();   // scratch vector for the collision hook (was declared with the sound code)
/* ---------- sound (PD-168): src/sound.js; initSound wires the settings controls ---------- */
initSound({state,camera,TABLE_Y,$,save,live:{get placing(){return placing},get rolling(){return rolling},get settled(){return settled},get bodies(){return bodies},get dice(){return dice}}});

/* ---------- nat 20 / nat 1 effects ---------- */
const sprTex=(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'), gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.35,'rgba(255,255,255,.6)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); })();
const BURST_N=260, BURST_GAP=.5, BURST_LIFE=2.4, BURST_LEAD=.55, bursts=[];   // BURST_LEAD: the room dims slightly for this long before the first starburst (PD-91)
function makeBurst(){ const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(BURST_N*3),3)); geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(BURST_N*3),3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({size:.3,map:sprTex,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));
  pts.frustumCulled=false; pts.visible=false; scene.add(pts);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:sprTex,color:0xffd35a,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,opacity:0})); fl.visible=false; scene.add(fl);
  return {pts,fl,vel:new Float32Array(BURST_N*3),origin:new THREE.Vector3(),die:null,start:0,fired:false,done:true}; }
const critLight=new THREE.PointLight(0xffc24a,0,16,1.5); scene.add(critLight);
const BASE_EXPOSURE=renderer.toneMappingExposure, BASE_KEY=key.intensity;
const fx={t:0,crit:[],fumble:[],dim:0,lead:0,hold:false};   // dim: nat 1 room dimming; lead: nat 20 light dip (+) / flash (-)
let droppedDice=new Set(), leanDice=[], leanRings=[], rollHalf={x:1.9,z:3};
function isLean(i){ const t=tiltInfo(i), b=bodies[i]; return t.lift>.1||t.flat<.95||b.position.y>TABLE_Y+1.45; }   // propped on another die, cocked, or stacked
function showLeans(){ dropRings(); dice.forEach((d,i)=>{ if(!leanDice[i]) return; const r=(d.r||1)*1.2, m=new THREE.Mesh(new THREE.RingGeometry(r*.84,r,64),new THREE.MeshBasicMaterial({color:RING_COLORS.cocked,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));   // flat on the mat, under every die; wider than the die so it shows around it
  m.renderOrder=10;   // the mat is a transparent mesh too: without this, camera-dependent sorting drew the mat over the ring
  m.rotation.x=-Math.PI/2; m.userData={i,y:TABLE_Y+.03}; m.position.set(bodies[i].position.x,m.userData.y,bodies[i].position.z); rig.add(m); leanRings.push(m); }); updateLeanUI(); }
let dropMarks=[];   // PD-142.38.20: a die the keep/drop rule left out (kh/kl/dl, adv/dis) is drawn faded and translucent, with no ring (a ring reads as "chosen"). Each entry keeps the die's own materials so they come back exactly
function undimDropped(){ for(const e of dropMarks){ delete e.mesh.userData.dropped; for(const [o,mat,ro] of e.orig){ o.renderOrder=ro; if(o.material!==mat){ const c=o.material; o.material=mat; (Array.isArray(c)?c:[c]).forEach(x=>x.dispose&&x.dispose()); } } } dropMarks=[]; }
function showDropped(){ undimDropped();
  if(!settled) return; droppedDice.forEach(i=>{ const d=dice[i]; if(!d||!d.mesh) return; const orig=[];
    d.mesh.traverse(o=>{ if(!o.material) return; orig.push([o,o.material,o.renderOrder]); o.renderOrder=5; const dim=x=>{ const c=x.clone(); c.transparent=true; c.opacity=Math.min(c.opacity==null?1:c.opacity,.4); return c; }; o.material=Array.isArray(o.material)?o.material.map(dim):dim(o.material); });
    d.mesh.userData.dropped=i; dropMarks.push({mesh:d.mesh,orig}); }); }
function dropRings(){ undimDropped(); for(const m of leanRings){ m.parent&&m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); } leanRings=[]; }
function clearLeans(){ dropRings(); leanDice=[]; }
function updateLeanUI(){ const R=$('result'); R.querySelectorAll('.lean,.relean').forEach(e=>e.remove()); const nl=leanDice.filter(Boolean).length; if(!nl||!settled) return;
  const bt=document.createElement('button'); bt.className='relean'; bt.textContent='\u26A0 Fix '+nl+' leaning '+(nl>1?'dice':'die'); bt.title=nl+(nl>1?' dice are':' die is')+' leaning: tap to re-roll '+(nl>1?'them':'it'); bt.onclick=rerollLeans; R.append(bt); }   /* PD-142.40: one chip, not a warning plus a button */
function refreshLeans(){                        // a die that settles after the rings went up loses its ring; the note and button go when the last lean clears
  let changed=false; for(const m of leanRings.slice()){ const i=m.userData.i;
    const b=bodies[i], still=b.velocity.lengthSquared()<.1&&b.angularVelocity.lengthSquared()<.5;
    if(!isLean(i)&&still){ leanDice[i]=false; m.parent&&m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); leanRings.splice(leanRings.indexOf(m),1); changed=true; }
    else m.position.set(bodies[i].position.x,m.userData.y,bodies[i].position.z); }
  if(changed) finishRoll(); }   // a die that was balanced or propped has come to rest on a face: read the dice again, so the result (and any nat 20 / nat 1 effect) matches what is on the table
function pulseLeans(t){ const o=.8+.2*Math.sin(t*4.5); for(const m of leanRings) m.material.opacity=o; }
function rerollLeans(){                       // the leaning dice vanish from the mat and drop in again from above; the others stay where they are
  if(!rolling||!world||!settled||!leanDice.some(Boolean)) return;
  const idx=leanDice.map((l,i)=>l?i:-1).filter(i=>i>=0); clearFx(); clearLeans(); $('result').classList.remove('on'); settled=false; rollT=0; restT=0; freeTries=0; dropIn(idx);
}
function dropIn(idx){
  const dropH=3.5+5*state.rollZoom, R=()=>rng()-.5;
  idx.forEach((i,k)=>{ const b=bodies[i]; let px=0,pz=0;
    for(let t=0;t<60;t++){ px=(rng()*2-1)*(rollHalf.x-1.1); pz=(rng()*2-1)*(rollHalf.z-1.1); if(bodies.every((o,j)=>j===i||Math.hypot(o.position.x-px,o.position.z-pz)>2.3)) break; }
    const rq=randQuat(); b.position.set(px,TABLE_Y+dropH+k*1.1+rng()*2,pz); b.quaternion.set(rq.x,rq.y,rq.z,rq.w);
    b.velocity.set(-px*.4+R()*4,-2-rng()*4,-pz*.4+R()*4); b.angularVelocity.set(R()*40,R()*40,R()*40); { const k=throwK(); if(k!==1){ b.velocity.scale(k,b.velocity); b.angularVelocity.scale(k,b.angularVelocity); } } b.free=false; b.angularDamping=.1; b.linearDamping=.04; b.slowT=0; b.wakeUp();
    dice[i].mesh.position.copy(b.position); dice[i].mesh.quaternion.copy(rq); });
  bodies.forEach(b=>b.slowT=0);
}
function clearFx(){ for(const d of dice){ const u=d.mat.userData.fx; if(u){ u.uGlow.value=0; u.uGray.value=0; } }
  fx.crit=[]; fx.fumble=[]; fx.t=0; fx.dim=0; fx.lead=0; for(const b of bursts){ b.pts.visible=false; b.fl.visible=false; b.done=true; b.fired=false; } critLight.intensity=0;
  key.intensity=BASE_KEY; renderer.toneMappingExposure=BASE_EXPOSURE; $('result').classList.remove('crit','fumble'); }
function fireBurst(b){ playChime(Math.max(0,bursts.indexOf(b))); b.fired=true; b.done=false; b.origin.copy(b.die.mesh.position); b.pts.visible=true; b.fl.visible=true;
  const pos=b.pts.geometry.attributes.position.array, col=b.pts.geometry.attributes.color.array, pal=[[1,.85,.3],[1,.65,.2],[1,1,.8],[1,.5,.15]];
  for(let i=0;i<BURST_N;i++){ pos[i*3]=b.origin.x; pos[i*3+1]=b.origin.y+.3; pos[i*3+2]=b.origin.z;
    const th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1), sp=2.5+Math.random()*7, c=pal[i%4], br=.5+Math.random()*.5;
    b.vel[i*3]=Math.sin(ph)*Math.cos(th)*sp; b.vel[i*3+1]=Math.abs(Math.cos(ph))*sp*1.25+3.2; b.vel[i*3+2]=Math.sin(ph)*Math.sin(th)*sp;   // launched higher than before
    col[i*3]=c[0]*br; col[i*3+1]=c[1]*br; col[i*3+2]=c[2]*br; }
  b.pts.geometry.attributes.position.needsUpdate=true; b.pts.geometry.attributes.color.needsUpdate=true; }
function triggerFx(parts){
  clearFx(); parts.forEach((p,i)=>{ const d=dice[i]; if(!d||d.name!=='d20') return; if(p.label===20) fx.crit.push(d); else if(p.label===1) fx.fumble.push(d); });
  fx.crit.forEach((d,j)=>{ while(bursts.length<=j) bursts.push(makeBurst()); const b=bursts[j]; b.die=d; b.start=BURST_LEAD+j*BURST_GAP; b.fired=false; b.done=false; });   // each 20 shoots its own burst in turn
  if(fx.crit.length>=fx.fumble.length&&fx.crit.length) $('result').classList.add('crit'); else if(fx.fumble.length) $('result').classList.add('fumble');
  fx.t=0; if(fx.fumble.length) setTimeout(playFumble,250);
  const tag=document.createElement('div'); tag.className='brk'; tag.style.cssText='letter-spacing:.2em;text-transform:uppercase;margin-top:6px';
  const c20=fx.crit.length>1?`${fx.crit.length} × Natural 20`:'Natural 20', c1=fx.fumble.length>1?`${fx.fumble.length} × Natural 1`:'Natural 1';
  if(fx.crit.length||fx.fumble.length){ tag.textContent=fx.crit.length&&fx.fumble.length?`✦ ${c20} ✦  ·  ${c1}`:fx.crit.length?`✦ ${c20} ✦`:c1; $('result').append(tag); }
}
function updateFx(dt){
  if(!fx.crit.length&&!fx.fumble.length) return;
  if(!fx.hold) fx.t+=dt; const t=fx.t, step=fx.hold?0:dt; let lightI=0, lightB=null;
  fx.crit.forEach((d,j)=>{ const b=bursts[j]; if(t>=b.start&&!b.fired) fireBurst(b);
    d.mat.userData.fx.uGlow.value=b.fired?(.15+.06*Math.sin(t*3.2))+.25*Math.exp(-(t-b.start)*2.5):.4*Math.pow(Math.min(1,t/b.start),1.6);   // the glow starts rising as the lights start to dim, peaks as the burst fires, then settles to the steady glow
    if(!b.fired||b.done) return;
    const age=t-b.start, pos=b.pts.geometry.attributes.position.array, k=Math.exp(-step*1.1);
    for(let i=0;i<BURST_N;i++){ b.vel[i*3]*=k; b.vel[i*3+1]=b.vel[i*3+1]*k-1.8*step; b.vel[i*3+2]*=k;
      pos[i*3]+=b.vel[i*3]*step; pos[i*3+1]+=b.vel[i*3+1]*step; pos[i*3+2]+=b.vel[i*3+2]*step; }
    b.pts.geometry.attributes.position.needsUpdate=true; b.pts.material.opacity=Math.max(0,1-age/BURST_LIFE);
    if(age>BURST_LIFE){ b.done=true; b.pts.visible=false; }
    const fa=age/.7; b.fl.visible=fa<1; if(b.fl.visible){ b.fl.position.copy(b.origin); b.fl.position.y+=.3; b.fl.quaternion.copy(camera.quaternion); b.fl.scale.setScalar(1.5+fa*9); b.fl.material.opacity=(1-fa)*.9; }
    const li=90*Math.exp(-age*2.6); lightI+=li; if(!lightB||li>0) lightB=b; });
  if(lightB){ critLight.position.set(lightB.origin.x,lightB.origin.y+1.6,lightB.origin.z); critLight.intensity=Math.min(lightI,110); } else critLight.intensity=0;
  if(fx.crit.length&&fx.crit.length>=fx.fumble.length){       // nat 20: the lights ease down a touch (the die 'inhales'), spike bright at the starburst, then settle back
    const a=fx.crit[0]&&bursts[0]?t-bursts[0].start:-1;
    fx.lead = t<BURST_LEAD ? .14*Math.sin(Math.PI/2*t/BURST_LEAD) : -.3*Math.exp(-a*7);        // dip up to 14 % (a nat 1 dims 70 %, so the two never look alike), then a flash that decays in about half a second
    key.intensity=BASE_KEY*(1-fx.lead); renderer.toneMappingExposure=BASE_EXPOSURE*(1-.5*fx.lead); }
  if(fx.fumble.length){ const r=Math.min(1,t/1.1), e=1-Math.pow(1-r,2); for(const d of fx.fumble) d.mat.userData.fx.uGray.value=.9*e;     // every nat 1 die fades to gray
    fx.dim=fx.fumble.length>fx.crit.length?e:0;                                                                                          // the room only dims when 1s outnumber 20s
    key.intensity=BASE_KEY*(1-.7*fx.dim); renderer.toneMappingExposure=BASE_EXPOSURE*(1-.3*fx.dim); }
}
const clock=new THREE.Clock();
const loop=(t,dtOver)=>{          // dtOver: fixed step from the test API (__pd.renderOnce)
  const dt=dtOver??Math.min(clock.getDelta(),.05);
  if(labOn){ if(labDirty&&labSc.length){ labDirty=false; labDraw(); } return; }   // the thumbnail lab draws only when something changed
  if(rolling&&!settled&&rollT>25){ freeTries=99; finishRoll(); }   // watchdog: whatever the cause, a roll never waits on the dice for more than 25 s
  if(!dragging&&!rolling){
    const idle = new THREE.Vector3(.12,.55,.05).multiplyScalar(state.spin*1.5);
    angVel.copy(idle).add(angVel.clone().sub(idle).multiplyScalar(Math.exp(-dt*1.6)));
    const a=angVel.length()*dt; if(a>1e-6) spinBy(new THREE.Quaternion().setFromAxisAngle(angVel.clone().normalize(),a));
  }
  if(rolling&&world){
    world.step(1/60,dt,4); rollT+=dt; tickRestore(dt);
    if(!settled) assistSettle(dt); else if(leanRings.length){ pulseLeans(performance.now()/1000); refreshLeans(); }
    if(rollT>3.5) bodies.forEach(b=>{ if(!b.free){b.angularDamping=.5; b.linearDamping=.25;} });
    dice.forEach((d,i)=>{d.mesh.position.copy(bodies[i].position); d.mesh.quaternion.copy(bodies[i].quaternion);});
    if(!settled && rollT>.6 && restCheck(dt)) finishRoll();
    if(settled&&recFaces&&!restoring&&(++faceTick&7)===0) faceCheck('after settle');   // a settled die that was bumped and now shows another face
  }
  updateFx(dt); updateRolling(dt);
  camBlend+=((rolling?1:0)-camBlend)*(1-Math.exp(-dt*3));
  topBlend+=((topHold&&rolling?1:0)-topBlend)*(dtOver!=null?1:1-Math.exp(-dt*9));
  { const tgt=new THREE.Vector3(0,-camBlend,0), L=THREE.MathUtils.lerp, tan=Math.tan(THREE.MathUtils.degToRad(16));
    const rd=Math.max(9.76,(rollHalf.z+.5)/(tan*camera.aspect),(rollHalf.x*ROLL_DIR.y+1)/tan)*state.rollZoom;   // default roll distance keeps the whole tray in view for this stage shape; zoom is the user's multiplier on top
    const showZ=Math.max(baseZ,needHalfW/(tan*camera.aspect))*state.zoom;
    const off=new THREE.Vector3(0,camBlend*rd*ROLL_DIR.y,L(showZ,rd*ROLL_DIR.z,camBlend)).sub(tgt);
    const r=off.length(), az=L(views.show.az,views.roll.az,camBlend), el=L(views.show.el,views.roll.el,camBlend), th=Math.atan2(off.x,off.z)+az+ROLL_AZ*camBlend, ph=L(THREE.MathUtils.clamp(Math.asin(off.y/r)+el,rolling||camBlend>.5?.12:-1.4,1.4),1.5,topBlend);
    let rr=r;
    if(topBlend>.001&&rolling&&dice.length){     // top-down check: back the camera off just enough that every die is in view, whatever the zoom
      const sx=Math.cos(th), sz=-Math.sin(th), ux=Math.sin(th), uz=Math.cos(th), tv=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)); let wx=0, wu=0;
      for(const d of dice){ const p=d.mesh.position, rad=(d.r||1)*1.15; wx=Math.max(wx,Math.abs((p.x-tgt.x)*sx+(p.z-tgt.z)*sz)+rad); wu=Math.max(wu,Math.abs((p.x-tgt.x)*ux+(p.z-tgt.z)*uz)+rad); }
      rr=L(r,Math.max(r,1.08*Math.max(wx/(tv*camera.aspect),wu/tv)/Math.sin(ph)),topBlend); }
    camera.position.set(tgt.x+rr*Math.cos(ph)*Math.sin(th),tgt.y+rr*Math.sin(ph),tgt.z+rr*Math.cos(ph)*Math.cos(th)); camera.lookAt(tgt);
    { const drop=ROLL_DROP*camBlend*(1-topBlend); if(drop>.0005){ const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion); camera.lookAt(tgt.clone().addScaledVector(up,drop*2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*rr)); } } }   /* PD-142.38.61: aim the camera a little above the mat centre so the dice sit lower in the frame (resting dice ~40% up from the bottom instead of ~55%); the Design showcase and the top-down check are untouched */
  tickStoryFly(dt);
  table.visible=camBlend>.01; table.material.opacity=camBlend;
  if(!(LITE&&dtOver===undefined&&window.__ready)) renderer.render(scene,camera);   // ?lite: only renderOnce (and the boot frames) draw
};

/* ---------- thumbnail lab (dev tool, PD-131) ----------
   ?lab=thumbs: four materials, each in two linked viewports (tile and shelf size), all drawn with the app's own materials on the main canvas. One shared setting set (orientation, camera,
   studio-room turn, three lights); drag any viewport to turn the die in all of them, move the sliders to place lights, and copy the settings read-out back. */
let labOn=false, labDirty=true, labSc=[], labEnvTex=null, labPanelOpen=true;
const LAB={q:new THREE.Quaternion(), camZ:5.4, camY:0, fov:29.7, env:[0,0,0], exposure:1.5, key:{p:[3,6,4],i:1.6}, sheen:{on:false,p:[4,.7,1.4],i:1.1}, back:{on:false,p:[-1.2,2,-4],i:2.4}};
const labEu=(x,y,z)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ'));
const LAB_VERT=labEu(Math.atan(1/PHI),0,0), LAB_FACE=(()=>{ const n=new THREE.Vector3(1,1,1).normalize(); return new THREE.Quaternion().setFromUnitVectors(n,new THREE.Vector3(0,0,1)); })(), LAB_ID=new THREE.Quaternion();
const LAB_ANGLES=[['Vertex-first tilt (in the app)',LAB_VERT,[-.3,.4,.4]],['Vertex-on',LAB_VERT,[0,0,0]],['Face-on',LAB_FACE,[0,0,0]],['Face-on, rolled 20°',LAB_FACE,[0,0,.35]],['Face tilted up',LAB_FACE,[-.5,0,.2]],['Face tilted down',LAB_FACE,[.5,0,.2]],['Face turned 35°',LAB_FACE,[0,.6,.3]],
  ['Vertex tilted up',LAB_VERT,[-.6,.2,0]],['Vertex tilted down',LAB_VERT,[.6,.3,.2]],['Vertex turned 35°',LAB_VERT,[0,.6,.5]],['Edge-on',LAB_ID,[0,0,0]],['Edge tilted',LAB_ID,[-.5,.5,.3]],['Three-quarter (earlier)',LAB_ID,[.62,.5,.12]],['Looking down on a face',LAB_FACE,[-1,.2,.1]]];
LAB.q.copy(PIC_Q);
function labDesigns(){ const base=designToJSON();
  const mk=(sub,cols,paint,extra)=>{ const j=structuredClone(base); Object.assign(j,{shape:'d20',substrate:sub,colors:cols,paint,paint_mode:'custom',edge_radius:.04}); j.filigree={style:'none',filled:true,enamel:null}; j.inclusion={type:'none',size:.55,turn_deg:0,height:0}; j.relief={...(j.relief||{}),paint_numbers:true}; if(extra) extra(j); return j; };
  return [['Clear epoxy',mk('epoxy',['#c8141c','#e0303a','#7a0a10'],'#ffffff',j=>{ j.resin={...(j.resin||{}),clarity:.9,glitter:0,bubbles:.25}; })],['Solid metal',mk('metal',['#d4af37','#f5e08a','#8a6d12'],'#ffffff')],['Solid plastic',mk('solid',['#d03a3a','#000000','#000000'],'#ffffff')],['Metallic plastic',mk('pearl',['#2a8a9a','#1a5a66','#70c0cc'],'#ffffff')]]; }
function labEnvUpdate(){ const t=picEnv(...LAB.env); if(labEnvTex) labEnvTex.dispose(); labEnvTex=t; for(const s of labSc) s.sc.environment=t; labDirty=true; }
async function labBuild(){ labSc=[]; const DL=THREE.DirectionalLight;
  for(const [name,j] of labDesigns()){ const d=await picDie(j), sc=new THREE.Scene(); sc.background=scene.background; sc.add(d.mesh);
    const key=new DL(0xffffff,1), sheen=new DL(0xdfe8ff,1), back=new DL(0xfff0d0,1); sc.add(key,sheen,back); labSc.push({name,d,sc,key,sheen,back,cam:new THREE.PerspectiveCamera(32,1,.3,60)}); }
  labEnvUpdate(); }
function labApply(s){ s.d.mesh.quaternion.copy(LAB.q); s.key.position.set(...LAB.key.p); s.key.intensity=LAB.key.i;
  for(const k of ['sheen','back']){ s[k].visible=LAB[k].on; s[k].position.set(...LAB[k].p); s[k].intensity=LAB[k].i; }
  s.cam.position.set(0,LAB.camY,LAB.camZ); s.cam.fov=LAB.fov; s.cam.updateProjectionMatrix(); }
function labLayout(){ const W=stage.clientWidth, H=stage.clientHeight, narrow=W<720, open=labPanelOpen, x0=narrow?8:(open?340:16), availW=W-x0-8, cols=narrow?2:4, gap=10;
  const M=Math.max(80,Math.min(280,Math.floor((availW-(cols-1)*gap)/cols))), out=[]; let y=narrow?8:16;
  for(let i=0;i<4;i++){ const c=i%cols, r=Math.floor(i/cols); out.push({m:i,s:M,x:x0+c*(M+gap),y:y+r*(M+gap+18)}); }
  y+=Math.ceil(4/cols)*(M+gap+18)+6;
  for(let i=0;i<4;i++){ const c=i%cols; out.push({m:i,s:60,x:x0+c*(M+gap),y:y}); }
  return out; }

/* head-to-head (?lab=thumbs&cmp=1): every saved candidate pose (with its own room turn and lights) on the four materials, tile and shelf size */
let cmpOn=false, cmpEnvs=null;
const CMP_BACK={p:[-1.2,2,-4],i:2.4}, CMP_R0=[0,Math.PI,0], CMP_R1=[.55,3.15,0];
const CMP=[{n:'A',q:[.252,.627,.025,.737],env:CMP_R0,key:{p:[-.2,1.9,3.2],i:1.1},sheen:{p:[4,.7,1.4],i:1.1}},
 {n:'B',q:[.463,.327,-.644,-.514],env:CMP_R0,key:{p:[-.2,1.9,3.2],i:1.1},sheen:{p:[4,.7,1.4],i:1.1}},
 {n:'C',q:[.208,-.882,.179,-.384],env:CMP_R1,key:{p:[-.1,1.9,3.2],i:1.3},sheen:{p:[4,.7,1.4],i:1.25}},
 {n:'D',q:[.167,-.888,.173,-.391],env:CMP_R1,key:{p:[-.1,1.9,3.2],i:1.3},sheen:{p:[4,.7,1.4],i:1.25}},
 {n:'E',q:[0.624,-0.604,-0.223,0.443],env:[0.2,2.9,-0.05],cz:4.9,key:{p:[-.2,1.9,3.2],i:1.1},sheen:{p:[4,.7,1.4],i:1.1}},
 {n:'F',q:[-.219,.718,-.598,.28],env:CMP_R0,cz:4.9,key:{p:[-.2,1.9,3.2],i:1.1},sheen:{p:[4,.7,1.4],i:1.1}},
 {n:'Pre-123 stage look (old pose, key only), distance 5.4',q:[.0054,.0247,.0022,.9997],env:[0,0,0],cz:5.4,cy:0,key:{p:[3,6,4],i:1.6},sheen:{p:[4,.7,1.4],i:0},back0:true},
 {n:'G',q:[.217,.233,.116,.941],env:CMP_R0,cz:4.9,key:{p:[-.2,1.9,3.2],i:1.1},sheen:{p:[4,.7,1.4],i:1.1}},
 {n:'E, 20 outward',q:[0.601,-0.619,0.184,-0.47],env:[0.2,2.9,-0.05],cz:4.9,key:{p:[-.2,1.9,3.2],i:1.1},sheen:{p:[4,.7,1.4],i:1.1}},
 {n:'E, 20 rolled -35°',q:[0.387,-0.771,0.317,-0.393],env:[0.2,2.9,-0.05],cz:4.9,key:{p:[-.2,1.9,3.2],i:1.1},sheen:{p:[4,.7,1.4],i:1.1}},
 {n:'E, 20 rolled -50°',q:[0.283,-0.815,0.366,-0.348],env:[0.2,2.9,-0.05],cz:4.9,key:{p:[-.2,1.9,3.2],i:1.1},sheen:{p:[4,.7,1.4],i:1.1}},
 {n:'E, 20 rolled -65°',q:[0.174,-0.845,0.408,-0.298],env:[0.2,2.9,-0.05],cz:4.9,key:{p:[-.2,1.9,3.2],i:1.1},sheen:{p:[4,.7,1.4],i:1.1}}];
function cmpDraw(){ const W=stage.clientWidth, H=stage.clientHeight, x0=8, gap=10, n=CMP.length;
  if(!cmpEnvs){ const cache={}; cmpEnvs=CMP.map(c=>cache[c.env]||(cache[c.env]=picEnv(...c.env))); }
  const byW=Math.floor((W-2*x0-4*gap)/4)-64, byH=Math.floor((H-16)/n)-22, M=Math.max(70,Math.min(byW,byH,260)), cw=M+64;
  renderer.setScissorTest(true); renderer.setClearColor(0x0e1015,1); renderer.setViewport(0,0,W,H); renderer.setScissor(0,0,W,H); renderer.clear(); renderer.toneMappingExposure=1.5;
  const caps=[];
  CMP.forEach((c,ri)=>{ const y=8+ri*(M+22);
    labSc.forEach((s,m)=>{ const x=x0+m*(cw+gap);
      s.sc.environment=cmpEnvs[ri]; s.d.mesh.quaternion.set(...c.q).normalize(); s.key.position.set(...c.key.p); s.key.intensity=c.key.i; s.sheen.visible=true; s.sheen.position.set(...c.sheen.p); s.sheen.intensity=c.sheen.i; s.back.visible=!c.back0; s.back.position.set(...CMP_BACK.p); s.back.intensity=CMP_BACK.i;
      s.cam.position.set(0,c.cy??-.1,c.cz||5.2); s.cam.fov=32; s.cam.updateProjectionMatrix();
      for(const [vx,vy,vs] of [[x,y,M],[x+M+4,y+M-60,60]]){ renderer.setViewport(vx,H-vy-vs,vs,vs); renderer.setScissor(vx,H-vy-vs,vs,vs); renderer.render(s.sc,s.cam); }
      caps.push([x,y+M+2,M,ri===0?s.name+' · '+c.n:c.n]); }); });
  renderer.setScissorTest(false);
  const hit=$('labhit'), sig='cmp'+W+'x'+H; if(hit&&hit.dataset.sig!==sig){ hit.dataset.sig=sig; hit.replaceChildren(...caps.map(([x,y,w,t])=>{ const e=el('div','labcap',t); e.style.cssText=`left:${x}px;top:${y}px;width:${w}px`; return e; })); } }
function setCmp(on){ cmpOn=on; const hit=$('labhit'), pn=$('labpanel'); if(hit){ hit.dataset.sig=''; hit.style.cursor=on?'default':'grab'; } if(pn) pn.style.display=on?'none':''; const b=$('cmpbtn'); if(b) b.textContent=on?'Back to the lab':'Compare candidates'; if(!on) labEnvUpdate(); labDirty=true; }
function labDraw(){ if(cmpOn) return cmpDraw(); const W=stage.clientWidth, H=stage.clientHeight; renderer.setScissorTest(true); renderer.setClearColor(0x0e1015,1); renderer.setViewport(0,0,W,H); renderer.setScissor(0,0,W,H); renderer.clear();
  renderer.toneMappingExposure=LAB.exposure; for(const s of labSc) labApply(s);
  const L=labLayout(); for(const v of L){ const s=labSc[v.m]; renderer.setViewport(v.x,H-v.y-v.s,v.s,v.s); renderer.setScissor(v.x,H-v.y-v.s,v.s,v.s); renderer.render(s.sc,s.cam); }
  renderer.setScissorTest(false); const hit=$('labhit'); if(hit&&hit.dataset.sig!==JSON.stringify(L)){ hit.dataset.sig=JSON.stringify(L); hit.replaceChildren(...L.filter(v=>v.s>60).map(v=>{ const c=el('div','labcap',labSc[v.m].name); c.style.cssText=`left:${v.x}px;top:${v.y+v.s+2}px;width:${v.s}px`; return c; })); } }
const labReadout=()=>{ const r=v=>+(+v).toFixed(3), e=new THREE.Euler().setFromQuaternion(LAB.q,'XYZ'), L=k=>({position:LAB[k].p.map(r),intensity:r(LAB[k].i)});
  return JSON.stringify({orientation:{quaternion:[LAB.q.x,LAB.q.y,LAB.q.z,LAB.q.w].map(r),euler_deg_xyz:[e.x,e.y,e.z].map(v=>r(v*180/Math.PI))},camera:{distance:r(LAB.camZ),y:r(LAB.camY),fov:r(LAB.fov)},room_rotation_rad:LAB.env.map(r),exposure:r(LAB.exposure),key:L('key'),sheen:{on:LAB.sheen.on,...L('sheen')},back:{on:LAB.back.on,...L('back')}},null,1); };
function labChanged(env){ labDirty=true; const t=$('labout'); if(t) t.value=labReadout(); if(env) labEnvThrottle(); }
let labEnvT=0; function labEnvThrottle(){ clearTimeout(labEnvT); labEnvT=setTimeout(labEnvUpdate,120); }
function startLab(){ if(labOn) return; labOn=true; document.body.classList.add('lab'); const root=el('div'); root.id='labui';
  const hit=el('div'); hit.id='labhit'; let drag=null;
  hit.addEventListener('pointerdown',e=>{ drag=[e.clientX,e.clientY]; hit.setPointerCapture(e.pointerId); });
  hit.addEventListener('pointermove',e=>{ if(!drag||cmpOn) return; const k=.008, dx=e.clientX-drag[0], dy=e.clientY-drag[1]; drag=[e.clientX,e.clientY]; LAB.q.premultiply(labEu(dy*k,dx*k,0)).normalize(); labChanged(); });
  const end=()=>{ drag=null; }; hit.addEventListener('pointerup',end); hit.addEventListener('pointercancel',end);
  hit.addEventListener('wheel',e=>{ if(cmpOn) return; e.preventDefault(); LAB.camZ=THREE.MathUtils.clamp(LAB.camZ+e.deltaY*.003,2.5,9); labChanged(); syncAll(); },{passive:false});
  const panel=el('div'); panel.id='labpanel'; const sync=[]; const syncAll=()=>sync.forEach(f=>f());
  const head=el('div','labhead'); head.append(el('b','','Thumbnail lab')); const tog=el('button','','Hide'); tog.type='button'; tog.onclick=()=>{ labPanelOpen=!labPanelOpen; panel.classList.toggle('shut',!labPanelOpen); tog.textContent=labPanelOpen?'Hide':'Controls'; labDirty=true; }; head.append(tog); panel.append(head);
  panel.append(el('p','labnote','Drag any picture to turn the die in all of them; scroll to move the camera. The numbers below follow along: copy them back to me.'));
  const sel=el('select'); sel.append(new Option('Start from an angle…','')); LAB_ANGLES.forEach((a,i)=>sel.append(new Option(`A${i+1} ${a[0]}`,i))); sel.onchange=()=>{ if(sel.value==='') return; const a=LAB_ANGLES[+sel.value]; LAB.q.copy(labEu(...a[2]).multiply(a[1])); labChanged(); };
  panel.append(sel);
  const sec=t=>{ const h=el('div','labsec',t); panel.append(h); };
  const slider=(label,get,set,min,max,step,env)=>{ const row=el('label','labrow'), name=el('span','',label), r=el('input'), n=el('output'); r.type='range'; r.min=min; r.max=max; r.step=step; const upd=()=>{ r.value=get(); n.textContent=(+get()).toFixed(2); }; upd(); sync.push(upd);
    r.oninput=()=>{ set(+r.value); n.textContent=(+r.value).toFixed(2); labChanged(env); }; row.append(name,r,n); panel.append(row); };
  const check=(label,get,set)=>{ const row=el('label','labrow'), c=el('input'); c.type='checkbox'; c.checked=get(); c.onchange=()=>{ set(c.checked); labChanged(); }; row.append(c,el('span','',label)); panel.append(row); };
  sec('Camera'); slider('Distance',()=>LAB.camZ,v=>LAB.camZ=v,2.5,9,.05); slider('Height',()=>LAB.camY,v=>LAB.camY=v,-1,1,.02); slider('Field of view',()=>LAB.fov,v=>LAB.fov=v,15,50,1); slider('Exposure',()=>LAB.exposure,v=>LAB.exposure=v,.5,3,.05);
  sec('Studio room (turns the reflections)'); ['x','y','z'].forEach((a,i)=>slider('Turn '+a,()=>LAB.env[i],v=>LAB.env[i]=v,-3.15,3.15,.05,true));
  for(const [k,t] of [['key','Key light'],['sheen','Sheen light'],['back','Back light']]){ sec(t); if(k!=='key') check('On',()=>LAB[k].on,v=>LAB[k].on=v); slider('Strength',()=>LAB[k].i,v=>LAB[k].i=v,0,4,.05); ['x','y','z'].forEach((a,i)=>slider('Place '+a,()=>LAB[k].p[i],v=>LAB[k].p[i]=v,-6,6,.1)); }
  sec('Settings to copy back'); const out=el('textarea'); out.id='labout'; out.readOnly=true; out.rows=14; out.value=labReadout(); panel.append(out);
  const copy=el('button','','Copy settings'); copy.type='button'; copy.onclick=async()=>{ let ok=false; try{ await navigator.clipboard.writeText(out.value); ok=true; }catch{ out.select(); try{ ok=document.execCommand('copy'); }catch{} } copy.textContent=ok?'Copied':'Select and copy the text'; setTimeout(()=>{ copy.textContent='Copy settings'; },1800); }; panel.append(copy);
  sync.push(()=>{ out.value=labReadout(); });
  const cb=el('button','','Compare candidates'); cb.id='cmpbtn'; cb.type='button'; cb.style.cssText='position:absolute;z-index:7;top:8px;right:8px;padding:8px 12px;border-radius:10px;border:1px solid #3a4052;background:#1b1f2a;color:#e8ecf4;font:600 13px system-ui'; cb.onclick=()=>setCmp(!cmpOn); addEventListener('resize',()=>{ labDirty=true; });
  root.append(hit,panel,cb); stage.append(root); if(new URLSearchParams(location.search).get('cmp')) setTimeout(()=>setCmp(true),0); labBuild().then(()=>{ resize(); labDirty=true; }); }

let frameErrs=0;
let frameN=0;
const startLoop=()=>renderer.setAnimationLoop(t=>{ const f=()=>{ try{ loop(t); }catch(e){ if(frameErrs++<3) console.error('frame error',e); } }; (window.__lag&&frameN++<6)?window.__lag.span('frame '+frameN,f):f(); });   // the first few frames are named in lag reports: new materials compile on first use   // an exception in one frame used to end the loop for good (three.js stops scheduling frames), which looks like a hang
addEventListener('visibilitychange',()=>{ if(!document.hidden){ clock.getDelta(); if(sfx.ctx&&sfx.ctx.state!=='running') sfx.ctx.resume().catch(()=>{}); resize(); } });   // coming back to the tab: drop the long gap and wake audio

/* ---------- lag monitor hooks: name the heavy operations so a pause report says what was running ---------- */
if(window.__lag){ const L=window.__lag;
  buildDice=L.wrap('buildDice',buildDice); randomize=L.wrap('randomize',randomize); restore=L.wrap('restore',restore); loadDesign=L.wrap('loadDesign',loadDesign); importBag=L.wrap('importBag',importBag);
  renderDesignPicture=L.wrap('renderDesignPicture',renderDesignPicture); updateThumbs=L.wrap('updateThumbs',updateThumbs); startRoll=L.wrap('startRoll',startRoll); audioInit=L.wrap('audioInit',audioInit); wrapAudioInit(audioInit);
  L.ctx=()=>({shape:state.shape,sub:state.substrate,notation:state.notation,dice:dice.length,bagDesigns:bag?bag.designs.length:0,rolling,thumbBusy,thumbs:Object.keys(thumbs).length,mem:{...renderer.info.memory},programs:(renderer.info.programs||[]).length,calls:renderer.info.render.calls,tris:renderer.info.render.triangles}); }
/* ---------- go ---------- */
await __bs('Loading fonts',.55);
await ensureFont(state.font);
if(state.inclusion!=='none'&&!MODELS[state.inclusion]) state.inclusion='none';
{ const q=new URLSearchParams(location.search); if(q.get('notation')&&!parseNotation(q.get('notation')).error) state.notation=q.get('notation'); if(q.get('orbit')){ const [a,b]=q.get('orbit').split(',').map(Number); orbit.az=a||0; orbit.el=b||0; } if(SHAPES[q.get('shape')]) state.shape=q.get('shape'); if(q.get('radius')) state.radius=+q.get('radius'); if(q.get('clarity')) state.clarity=+q.get('clarity'); if(MODELS[q.get('incl')]) state.inclusion=q.get('incl'); if(STONES[q.get("stone")]) state.stone=q.get("stone"); if(q.get("polish")) state.polish=+q.get("polish"); if(q.get('panel')) state.panel=+q.get('panel'); if(q.get('patina')) state.patina=+q.get('patina'); if(q.get('raised')) state.numRaised=true; if(q.get('nopaint')) state.numPaint=false; if(['scroll','beads','deco'].includes(q.get('fili'))) state.filigree=q.get('fili'); if(q.get('d4style')) state.d4Style=q.get('d4style')==='center'?'center':'tips'; if(q.get('d6style')) state.d6Style=q.get('d6style')==='pips'?'pips':'numbers';
  if(SUBSTRATES[q.get('sub')]){ setSubstrate(q.get('sub')); repaint(); } if(q.get('fresh')){ if(SUBSTRATES[q.get('sub')]) state.randsub=false; randomize(true); } }
if(!localStorage.getItem(STORE)&&!new URLSearchParams(location.search).get('sub')) randomize(true);
await __bs('Building the dice',.68);
buildDice();
await __bs('Opening your bag',.80);
initBag(); renderBag(); scheduleThumb();
history=[snapshot()]; hIdx=0; syncHistoryUI();
if(new URLSearchParams(location.search).get('test')==='atlas'){ for(const f of Object.keys(FONTS)){ await ensureFont(f); const labs=[0,1,6,8,9,10,20,90], at=makeAtlas(labs.length,labs,f,3,false), c=at.mask.image, g=c.getContext('2d'), out=[];
    labs.forEach((l,i)=>{ const cx=(i%at.cols)*at.cell, cy=Math.floor(i/at.cols)*at.cell, d=g.getImageData(cx,cy,at.cell,at.cell).data; let x0=1e9,x1=-1,y0=1e9,y1=-1;
      for(let y=0;y<at.cell;y++)for(let x=0;x<at.cell;x++) if(d[(y*at.cell+x)*4]>128){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
      out.push(`${l}:(${((x0+x1)/2-128).toFixed(1)},${((y0+y1)/2-128).toFixed(1)})`); });
    console.log('ATLAS',f,out.join(' ')); } }
if(new URLSearchParams(location.search).get('test')==='models'){ rig.clear(); dice.forEach(d=>d.mesh.visible=false); const ks=Object.keys(MODELS); ks.forEach((k,i)=>{ const t=getTemplate(k).clone(true); const g=new THREE.Group(); g.add(t); g.scale.setScalar(1.15); g.position.set((i%4-1.5)*2.8,(1-Math.floor(i/4))*2.8,0); g.rotation.y=.5; rig.add(g); }); baseZ=14; state.zoom=1; }
Object.keys(FONTS).forEach(k=>ensureFont(k));   // warm every font so a randomize never waits on a font download
await __bs('Compiling shaders (slow on some GPUs)',.88);
try{ await (window.__lag?window.__lag.span('compileAsync',()=>renderer.compileAsync(scene,camera)):renderer.compileAsync(scene,camera)); }catch(e){ console.warn('shader precompile',e); }   // parallel shader compile (KHR_parallel_shader_compile): does not block the page
{ const f=()=>{ try{ loop(performance.now()); }catch(e){ console.error('first frame',e); } }; window.__lag?window.__lag.span('first frame (shader compile)',f):f(); }   // the big one-off freeze: pay it here, behind the progress screen
{ const h=+new URLSearchParams(location.search).get('boothold'); if(h>0) await __bs('Holding the loading screen (?boothold='+h+')',.95), await new Promise(r=>setTimeout(r,h*1000)); }   // dev: keep the loading screen up to look at it
await __bs('Almost there',.97);
startLoop();   // frames start only now, so the first (shader-compiling) frame never hides inside an earlier boot stage
window.__ready=true; window.__bootDone&&window.__bootDone();
if(new URLSearchParams(location.search).get('lab')==='thumbs'||window.__PD_LAB) startLab();
/* Test API for the Playwright suite (tests/, docs/design/testing.md). Getters expose live module state. */
const simSteps=n=>{ for(let i=0;i<n&&!settled;i++){ world.step(1/60); rollT+=1/60; tickRestore(1/60); if(!settled) assistSettle(1/60); if(rollT>3.5) bodies.forEach(b=>{ if(!b.free){b.angularDamping=.5; b.linearDamping=.25;} }); if(rollT>.6&&restCheck(1/60)) finishRoll(); } };

/* ---------- games (PD-142.4/.5): panel, setup, scorecard; the engine is 'pd-games' ---------- */
const GPstage=$('gamepanel'), SP=$('scorepane'), PT=$('paneltabs'), GKEY='prettydice.games';
let GP=SP, paneAuto=false, paneKey='', paneSeen='', paneRaf=0;   // GP is where the full panel is drawn: the stage on desktop and landscape, the scorecard pane in the settings slot on phones
const phoneMq=matchMedia('(max-width:760px)'), phoneUI=()=>phoneMq.matches;
const roomTab={design:'look',play:'table'}, roomNow=()=>document.body.classList.contains('design')?'design':'play';   // PD-142.38 slice 5: the last tab per room is remembered
const PANES=['look','table','games','log'];   // PD-142.38.41/.43: Design has no tabs (always Look; the strip holds Undo/Redo); Bag and Sets are the Bag view's tabs
function setPane(name){ const room=roomNow();
  if(name==='settings'||(name==='games'&&!game&&!SP.childNodes.length)){ name=roomTab[room]; if(name==='games'&&!game) name='table'; }
  if(name==='games'&&room==='design') name='look';
  if(!PANES.includes(name)) return; roomTab[room]=name;
  const g=name==='games', lg=name==='log';
  $('settingspane').hidden=g||lg; SP.hidden=!g; $('logpanel').hidden=!lg;
  if(lg) renderLog();
  if(!(g||lg)) $('settingspane').dataset.tab=name;
  PT.querySelectorAll('button[data-pane]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.pane===name))); paneKey=room+':'+name; if(!paneRaf) paneRaf=requestAnimationFrame(()=>{ paneRaf=0; if(paneKey!==paneSeen){ paneSeen=paneKey; $('gamestab').closest('aside').scrollTop=0; } }); }   /* PD-142.38.55: syncMode re-applies the pane on every shape tap and mode sync (and a Play rebuild passes through the Design room for a moment), so only a room or tab that has really changed by the next frame goes back to the top */
function applyRoomPane(){ try{ setPane('settings'); }catch{} }
function resetUiState(){ roomTab.design='look'; roomTab.play='table'; editSet=null; sheetTab='designs'; applyRoomPane(); }   /* test hook (shared.reset), no use in the app: the remembered tab per room back to Look / Table, and no half-open Bag set editor */
PT.querySelectorAll('button[data-pane]').forEach(b=>b.onclick=()=>{ const n=b.dataset.pane;
  if(n==='games'&&!game){ document.dispatchEvent(new CustomEvent('pd-open-games')); return; } setPane(n); syncGameLook(); });   // PD-191: opening Games always redraws it (the story dice come back with the setup); any other tab releases them   // slice 6: the Games tab replaces the round Games button
$('settingspane').parentNode.append($('logpanel')); document.body.append($('bagsheet'));   // the roll log lives in the panel; the Bag view is an overlay on the page (it also works in Full view)
applyRoomPane();
function peekHandle(el){ if(!el) return; el.classList.add('peekh'); el.title='Hold to look from above'; el.setAttribute('aria-label','Hold to look from above');
  for(const ev of ['pointerup','pointercancel','lostpointercapture']) el.addEventListener(ev,()=>holdTop(false));
  let t0=0; el.addEventListener('pointerup',()=>{ if(t0&&Date.now()-t0<350) toast('Hold to look from above'); t0=0; });   // PD-192: a tap does nothing, so say what the eye is for (mouse and touch)
  el.addEventListener('pointerdown',e=>{ if(e.target.closest('button')) return; t0=Date.now(); try{el.setPointerCapture(e.pointerId);}catch{} holdTop(true); }); el.addEventListener('contextmenu',e=>e.preventDefault()); }
const stripHome=$('modesw').parentNode, stripNext=$('modesw').nextSibling, histHome=$('histrow').parentNode, histNext=$('histrow').nextSibling;
var stripReady=false;
function placeSwitch(){ if(!stripReady) return; const ph=phoneUI(), tp=$('topstrip'); if($('histrow').parentNode!==histHome) histHome.insertBefore($('histrow'),histNext); }
peekHandle($('stripmid')); stripReady=true; placeSwitch(); phoneMq.addEventListener('change',placeSwitch); addEventListener('resize',placeSwitch);   // resize too: a viewport change must always re-place the strip contents
addEventListener('blur',()=>holdTop(false));
const rollSum=st=>['craps','shutbox','bunco','shipcaptain'].includes(game&&game.id)&&st.dice?st.dice.reduce((a,b)=>a+b,0):null;   // games that use the roll sum keep it in their status text now the big total is hidden
function closeGamesUI(){ sset=null; storyPreviewOff(); document.body.classList.toggle('game',!!game); GPstage.hidden=true; GPstage.classList.remove('strip'); GPstage.textContent=''; SP.textContent=''; $('gamestab').textContent='Games'; setPane('settings'); document.body.classList.remove('gstrip'); GP=SP; renderDock(); }
let gcollapsed=false;   // the Scorecard button folds the table on the desktop side panel; on phones the scorecard has its own tab, so it is never folded
let gprefs={suggest:true,names:['Player 1','Player 2','Player 3','Player 4','Player 5','Player 6'],count:1,gameId:'yahtzee',opts:{},bots:[false,false,false,false,false,false]};
try{ Object.assign(gprefs,JSON.parse(localStorage.getItem(GKEY)||'{}')); }catch{}
if(gprefs.gameId==='none') gprefs.gameId='yahtzee';   // a 'No game' choice saved by an earlier build (removed) falls back to the default game
const gsave=()=>{ try{ localStorage.setItem(GKEY,JSON.stringify(gprefs)); }catch{} };
const gel=(tag,props={},...kids)=>{ const e=document.createElement(tag); Object.assign(e,props); for(const k of kids) e.append(k); return e; };
function gameSync(){ const st=GAMES.status(game.state); held=new Set(st.held.map((h,i)=>h?i:-1).filter(i=>i>=0)); syncHoldRings(); }
const TURN_GAMES=['farkle','pig','shutbox','shipcaptain','bunco'];   // dice-and-bank games: no scorecard, a running turn total
const KEPT_GAMES=['yahtzee','farkle','pig','craps','liarsdice','story'];   // PD-142.41: the games offered in 4.0 (ids kept from before the Yacht / Ten Thousand renames so saved games load); Shut the Box, Ship Captain and Crew and Bunco are parked
// PD-162: Craps is hidden from the UI unless ?multipoop is in the URL (remembered for the browser session). All Craps code stays in place; this is a casual gate, not security.
const SECRET_GAMES=['craps'];
const secretOn=(()=>{ let on=new URLSearchParams(location.search).has('multipoop'); try{ if(on) sessionStorage.setItem('pd.multipoop','1'); else on=sessionStorage.getItem('pd.multipoop')==='1'; }catch{} return on; })();
setStorySecret(secretOn);   // the secret gate also lifts the story generator's soft-verb rule
const keptGames=()=>GAMES.listGames().filter(g=>KEPT_GAMES.includes(g.id)&&(secretOn||!SECRET_GAMES.includes(g.id))).sort((a,b)=>KEPT_GAMES.indexOf(a.id)-KEPT_GAMES.indexOf(b.id));
let gsel=new Set(), gtiles=new Set();   // Farkle: dice the player has picked to set aside (shown with the hold ring until set aside)
function gameHold(i){ if(botLock()) return false; const st=GAMES.status(game.state); if(game.id!=='yahtzee'&&game.id!=='farkle') return false;   // only these two take taps on the dice
  if(game.id==='farkle'){ if(!st.canScore||!settled){ gameMsg=st.canRoll?'Roll first':'Wait for the dice to stop'; renderGame(); return false; }
    if(st.held[i]){ gameMsg='That die is already set aside'; renderGame(); return false; }
    if(gsel.has(i)) gsel.delete(i); else gsel.add(i); gameMsg=''; held=new Set([...st.held.map((h,k)=>h?k:-1).filter(k=>k>=0),...gsel]); renderGame(); return true; }
  if(!st.canHold){ gameMsg='Roll first, then tap dice to keep them'; renderGame(); return false; }
  const r=GAMES.act(game.state,{type:'hold',slot:i}); if(!r.ok){ gameMsg=r.error; renderGame(); return false; } game.state=r.state; gameMsg=''; const sh=GAMES.status(game.state).held; held=new Set(sh.map((h,k)=>h?k:-1).filter(k=>k>=0)); renderGame(); return true; }
function gameBeforeRoll(){ whoopEnd(); gpv=null; const st=GAMES.status(game.state); if(!st.canRoll||st.phase==='over'){ if(game.id==='story') gameMsg=st.phase==='rate'?'Rate the story first':st.phase==='arrange'?'Put the dice in story order first':''; else if(st.canScore) gameMsg=TURN_GAMES.includes(game.id)?'Set aside scoring dice first':'Pick a box on the scorecard'; renderGame(); return false; }
  gsel.clear(); if(game.id==='story'){ storyTray.hide(); for(const d of dice) d.mesh.visible=true; storySalt=0; } if(game.info.hidden) liveDiceOnly();
  if(game.id==='craps'){ for(let k=0;k<12;k++){ const a=GAMES.botMove(game.state,{seed:++botN}); if(!a||a.type!=='bet') break; const b=GAMES.act(game.state,a); if(!b.ok) break; game.state=b.state; } }   // bots place their bets before the dice go
  if(game.id==='craps'){ const rs=GAMES.act(game.state,{type:'rollStart'}); if(rs.ok) game.state=rs.state; }   // the engine locks betting from the throw until the roll is reported
  { const live=new Set(GAMES.rollSpec(game.state).slots); held=new Set(st.held.map((h,i)=>h?i:-1).filter(i=>i>=0)); for(let i=0;i<dice.length;i++) if(!live.has(i)) held.add(i); }   // dice the engine is not rolling (set aside, locked, or the unused second die) stay put
  gameAwaiting=true; gameMsg=''; renderGame(); return true; }
function gameOnSettled(parts){ if(!gameAwaiting||!game) return;
  if(!leanDice.some(Boolean)) reconcileParts(parts,'before game score');
  if(leanDice.some(Boolean)){ if(botLock()) setTimeout(rerollLeans,0); return; }   // PD-157: a bot never taps the 'Fix leaning dice' chip, so it re-rolls the leaning dice itself and the turn goes on
  const spec=GAMES.rollSpec(game.state); if(!spec.slots.length||spec.slots.some(i=>!parts[i])){ gameAwaiting=false; return; }
  cbet.ready=false; const prevPoint=game.state.point; const r=GAMES.act(game.state,{type:'roll',values:spec.slots.map(i=>parts[i].label)}); gameAwaiting=false;
  if(!r.ok){ gameMsg=r.error; renderGame(); return; } game.state=r.state; if(spec.private){ gameMsg=''; setTimeout(()=>{ if(game&&game.info.hidden&&!gameAwaiting) hideDice(true); },700); }   // the throw stays in view a moment, then the set goes back to the showcase
  if(game.id==='craps'){ const ev=r.events, tot=ev.find(e=>e.type==='rolled')?.total, pay=ev.filter(e=>e.type==='payout'&&e.amount);
    gameCallout=crapsCallout(ev,prevPoint);
    gameMsg='Rolled '+tot+(ev.some(e=>e.type==='sevenOut')?' · seven out':'')+(ev.some(e=>e.type==='pointMade')?' · point made':'')+pay.map(e=>' · '+game.state.players[e.player]+' '+(e.amount>0?'+':'')+e.amount).join(''); }
  if(TURN_GAMES.includes(game.id)){ const bust=r.events.find(e=>e.type==='bust'); const pts=r.events.find(e=>e.type==='turnScore'||e.type==='scored'); if(bust) gflash='bust'; gameMsg=bust?'Bust! Turn total lost':(pts?(game.id==='bunco'&&pts.kind==='bunco'?'BUNCO! ':'')+'+'+pts.points:''); gameSync(); gtiles.clear(); }
  renderGame(); }
var gameCallout=null;   // PD-142.33.2: the roll's effect (Craps!, Seven out, Point is 6...) in the big result area while a game runs
function crapsCallout(ev,prevPoint){
  const t=ev.find(e=>e.type==='rolled')?.total, np=ev.find(e=>e.type==='point'), out=[];
  if(ev.some(e=>e.type==='sevenOut')) out.push('Seven out'); else if(ev.some(e=>e.type==='pointMade')) out.push('Point made'); else if(np) out.push('Point is '+np.number);
  else if(prevPoint==null&&(t===7||t===11)) out.push('Natural'); else if(prevPoint==null&&[2,3,12].includes(t)) out.push('Craps!');
  if(ev.some(e=>e.type==='payout'&&e.kind==='field'&&e.result==='win')) out.push('Field wins');
  return out.length?(t!=null?t+' · ':'')+out.join(' · '):(t!=null?String(t):null); }
function showCallout(){ const R=$('result'); R.querySelectorAll('.callout').forEach(n=>n.remove()); if(!game||game.setup||!gameCallout) return; const d=document.createElement('div'); d.className='callout'; d.textContent=gameCallout; R.append(d); R.classList.add('on'); }
function gameSetAside(slots){ if(botLock()) return; faceCheck('before set aside'); const r=GAMES.act(game.state,{type:'score',dice:[...slots]}); if(!r.ok){ gameMsg=r.error; renderGame(); return; }
  game.state=r.state; gsel.clear(); const hot=r.events.some(e=>e.type==='hotDice'); if(hot) gflash='hot'; gameMsg=hot?'Hot dice! Roll all six again':''; gameSync(); renderGame(); }
function gameBank(){ if(botLock()) return; faceCheck('before bank'); const r=GAMES.act(game.state,{type:'bank'}); if(!r.ok){ gameMsg=r.error; renderGame(); return; }
  game.state=r.state; gsel.clear(); const b=r.events.find(e=>e.type==='banked'); gflash='bank'; gameMsg=b?'Banked '+(b.points??b.amount??''):'Banked'; clearHolds(); gameSync(); renderGame(); }
/* PD-156: scoring is deliberate (double tap / long press; a single tap previews) and a score can be taken back for 3 s ('Whoopsie'); PD-165: a mouse click scores at once on desktop, deliberate entry is for touch/pen. prev is the engine state before the score; it is what a reload would see while the window is open (a pending score is never saved). Bots never get a window, and a bot's turn waits for it to close. */
const WHOOP_MS=3000; let gpv=null, whoop=null, lpAt=0, lastPtr='mouse'; addEventListener('pointerdown',e=>{ lpAt=0; lastPtr=e.pointerType||'mouse'; },true);
const isTouchy=e=>{ if(e&&e.type==='click'&&e.detail===0&&!e.pointerType) return false; return lastPtr==='touch'||lastPtr==='pen'; };   // PD-179: the pointer is the one of the last pointerdown (a click's own pointerType is 'mouse' on some touch browsers, and emulated mouse events after a touch carry no pointerdown); a click with detail 0 is the keyboard
const scoreModeOf=()=>gprefs.scoreMode||'long';   // PD-179: unset pref = long press (only touch/pen ever reads it; a stored explicit choice wins)   // PD-165: by the pointer of the event, not the screen width
const whoopLabel=()=>'Whoopsie! Undo ('+(Math.max(0,whoop.until-Date.now())/1000).toFixed(1)+'s)';
function whoopTick(){ if(!whoop) return; document.querySelectorAll('[data-whoop]').forEach(b=>{ b.textContent=whoopLabel(); }); }
function whoopEnd(){ if(!whoop) return; clearTimeout(whoop.t); clearInterval(whoop.iv); whoop=null; if(game&&!game.setup){ renderGame(); } }
function whoopClear(){ if(!whoop) return; clearTimeout(whoop.t); clearInterval(whoop.iv); whoop=null; }
function whoopBtn(){ const b=gel('button',{type:'button',className:'whoop',textContent:whoopLabel(),onclick:gameWhoops}); b.dataset.whoop='1'; return b; }
function gameWhoops(){ if(!whoop||!game) return; const w=whoop; whoopClear(); game.state=w.prev; gpv=null; gameMsg='Score taken back'; gameSync(); renderGame(); }
function gameScore(cat){ if(botLock()) return; faceCheck('before score entry'); whoopEnd(); const prev=JSON.parse(JSON.stringify(game.state)), r=GAMES.act(game.state,{type:'score',category:cat}); if(!r.ok){ gameMsg=r.error; renderGame(); return; }
  game.state=r.state; gpv=null; const sc=r.events.find(e=>e.type==='scored'), bn=r.events.filter(e=>e.type==='bonus').map(e=>e.name+' +'+e.points);
  gameMsg=(sc?'Scored '+sc.points:'')+(bn.length?' · '+bn.join(', '):''); clearHolds();
  if(game.id==='yahtzee'&&!GAMES.status(prev).botTurn){ whoop={prev,until:Date.now()+WHOOP_MS,t:setTimeout(whoopEnd,WHOOP_MS),iv:setInterval(whoopTick,100)}; }
  gameSync(); renderGame(); }
/* a tap on a scorecard box: the mode is a preference (double tap by default); a short tap always only previews unless the mode is 'single' */
function scoreTap(cat,label,pts,ev){ if(lpAt){ lpAt=0; return; }   // the click that ends a long press is not a tap
  if(!isTouchy(ev)){ gameScore(cat); return; }   // PD-165: mouse (and keyboard) click scores; Whoopsie is the safety net
  const mode=scoreModeOf();
  if(mode==='single'){ gameScore(cat); return; }
  if(mode==='double'&&gpv&&gpv.cat===cat&&Date.now()-gpv.t<700){ gameScore(cat); return; }
  gpv={cat,t:Date.now(),pts,label,mode}; renderGame(); }   // the hint goes in the dock (no layout shift between the two taps)
function scorePress(td,cat){ const mode=scoreModeOf(); if(mode!=='long') return; let t=0; const off=()=>{ clearTimeout(t); };
  td.addEventListener('pointerdown',e=>{ off(); if(!isTouchy(e)) return; t=setTimeout(()=>{ lpAt=Date.now(); gameScore(cat); },450); }); for(const ev of ['pointerup','pointerleave','pointercancel']) td.addEventListener(ev,off); td.addEventListener('contextmenu',e=>e.preventDefault()); }
const GSAVE=GKEY+'.game';   // a game in progress survives a reload: the engine state is plain JSON (hidden dice included; same device, not a security boundary)
const gsaved=()=>{ try{ const j=JSON.parse(localStorage.getItem(GSAVE)||'null'); return j&&j.id&&j.state&&keptGames().some(g=>g.id===j.id)?j:null; }catch{ return null; } };
function gsaveGame(){ try{ if(game&&!game.setup&&(whoop||GAMES.status(game.state).phase!=='over')) localStorage.setItem(GSAVE,JSON.stringify({id:game.id,state:whoop?whoop.prev:game.state})); else if(game&&!game.setup&&!whoop) localStorage.removeItem(GSAVE); }catch{} }
async function startGame(id,players,options,botSeats=[],resume=null){
  const info=GAMES.listGames().find(g=>g.id===id); gameSnap={shape:state.shape,notation:state.notation};
  whoopClear(); gpv=null; gcollapsed=false; game={id,info,state:resume||GAMES.newGame(id,{players,options,bots:botSeats}),setup:false,ack:null}; storyDeal=id==='story'?makeStoryDeal(game.state.options):null; storyTray.hide(); storySalt=0; lbid=null; gameMsg=''; gameAwaiting=false; gsel.clear(); gtiles.clear(); cbet.chip=null; cbet.who=null; cbet.ready=false;
  if(id==='story'){ storyPrev=null; lookSwap(); }   // plain look for the game (already swapped when started from the setup preview); ending the game puts the player's look back
  state.shape='custom'; state.notation=(id==='story'?game.state.options.dice:info.dice.count)+'d'+(id==='story'?game.state.options.sides:info.dice.sides); buildDice(); startRoll(false,true); if(info.hidden) hideDice(true); if(resume) gameSync(); syncUI(); if(lookSnap) lookHistoryReset(); paneAuto=true; renderGame(); }
function endGame(){ if(!game) return; gendAsk=false; whoopClear(); gpv=null; storyDeal=null; storyTray.hide(); const wasPlay=!designRoom; try{ localStorage.removeItem(GSAVE); }catch{} clearTimeout(botTimer); for(const d of dice) d.mesh.visible=true; game=null; gameAwaiting=false; clearHolds(); if(gameSnap){ state.shape=gameSnap.shape; state.notation=gameSnap.notation; gameSnap=null; lookRestore(); buildDice(); syncUI(); } if(wasPlay&&designRoom) goPlay(); closeGamesUI(); }   // exitRoll with no game drops to Design; ending a game keeps the player in Play (PD-142.14.3.1.6)
// ---- hidden information (Liar's Dice, PD-142.37): the UI only ever draws from status(state, viewer) ----
const botLock=()=>!!game&&!game.setup&&GAMES.status(game.state).botTurn;   // a bot's turn: the human buttons that would act for it stay shut
const humanSeats=()=>game.state.players.map((_,i)=>i).filter(i=>!(game.state.bots||[]).includes(i));
function gviewer(){ if(!game||!game.info.hidden) return undefined; const hum=humanSeats(); if(hum.length===1) return hum[0];   // a lone human always sees their own cup
  const h=GAMES.status(game.state,null).handoff; if(h==null){ game.ack=null; return null; } return game.ack===h?h:null; }   // several humans: only after the device was handed over
function needPass(){ if(!game||!game.info.hidden||humanSeats().length<2) return false; const h=GAMES.status(game.state,null).handoff; return h!=null&&!(game.state.bots||[]).includes(h)&&game.ack!==h; }
function hideDice(on){ if(on){ for(const d of dice) d.mesh.visible=true; if(rolling) exitRoll(true); } }   // 'under the cup': leave the roll view for the showcase of the set (no values on the mat); unused dice come back with it
function showcaseCount(){   // PD-142.39.1: between rolls the showcase shows exactly the dice the current player has left, and says how many
  if(!game||!game.info.hidden||game.setup||rolling) return; const st=GAMES.status(game.state), c=st.cups&&st.cups[st.player]; if(!c||st.phase==='over') return;
  dice.forEach((d,i)=>{ d.mesh.visible=i<c.count; }); const nm=$('name'); if(nm) nm.textContent=c.name+': '+c.count+(c.count===1?' die':' dice')+' left'; }
function liveDiceOnly(){ const live=new Set(GAMES.rollSpec(game.state).slots); dice.forEach((d,i)=>{ d.mesh.visible=live.has(i); }); }   // while throwing, only the dice the engine rolls are drawn: no rings on spares
let botTimer=null, botN=0, lbid=null, gflash=null;   // gflash: 'bust' | 'hot' | 'bank' plays once on the next render (a short colour pulse on the status line)
const BOT_MS=+new URLSearchParams(location.search).get('botms')||900;
/* PD-159: a bot shooter places its bets, then waits for the humans' 'Ready' before the dice go, so everyone can bet or adjust first (the human shooter's Roll button is its own Ready). */
function crapsHold(){ if(!game||game.setup||game.id!=='craps'||cbet.ready||!humanSeats().length) return false; const st=GAMES.status(game.state); if(st.phase==='over'||!st.botTurn) return false; const a=GAMES.botMove(game.state,{seed:botN+1}); return !!a&&a.type==='roll'; }
function crapsReady(){ if(!game||game.id!=='craps') return; cbet.ready=true; gameMsg=''; renderGame(); }
function botPump(){ clearTimeout(botTimer); botTimer=null; if(!game||game.setup||gameAwaiting||whoop||(rolling&&!settled)) return;
  const st=GAMES.status(game.state); if(st.phase==='over'||!st.botTurn||crapsHold()) return; botTimer=setTimeout(botStep,BOT_MS); }
function botStep(){ botTimer=null; if(!game||game.setup||gameAwaiting||whoop||(rolling&&!settled)||crapsHold()) return;
  const S=game.state, st=GAMES.status(S); if(st.phase==='over'||!st.botTurn) return;
  const a=GAMES.botMove(S,{seed:++botN}); if(!a) return; const nm=S.players[a.player??st.player];
  if(a.type==='roll'){ const spec=GAMES.rollSpec(S);
    if(spec.private){ const r=GAMES.act(S,{type:'roll',values:spec.slots.map(()=>1+Math.floor(rng()*6))}); if(r.ok){ game.state=r.state; hideDice(true); gameMsg=GAMES.status(game.state).phase==='roll'?nm+' rolled under the cup':''; } renderGame(); return; }   // a bot's secret dice are never thrown where the humans can see
    startRoll(rolling); return; }
  const r=GAMES.act(S,a); if(!r.ok){ gameMsg=r.error; renderGame(); return; } game.state=r.state;
  gameMsg=a.type==='bid'?nm+' bids '+a.quantity+' × '+a.face+'s':a.type==='challenge'?nm+' challenges!':a.type==='bet'?nm+' bets '+a.amount+' on '+a.kind:a.type==='next'?'':game.id==='story'?'':nm+': '+a.type; gameSync(); renderGame(); }
const cupPeek=(()=>{ const e=document.createElement('div'); e.id='cuppeek'; e.hidden=true; e.setAttribute('role','status'); $('stage').append(e); return e; })();   // big dice for old eyes: shown only while a finger is down on your own row
let lastPeek={who:-1,at:0};
function logPeek(who,name){ const now=Date.now(); if(lastPeek.who===who&&now-lastPeek.at<4000){ lastPeek.at=now; return; } lastPeek={who,at:now}; addLog({note:name+' peeked at their cup',total:'',notation:"Liar's Dice"}); }   // trust-based peeking, audited: one line per hold, the name only, never the dice (PD-142.14.3.1.15)
function peekDice(vals){ cupPeek.textContent=''; for(const v of vals) cupPeek.append(gel('span',{className:'bigdie',textContent:String(v)})); cupPeek.hidden=false; }
addEventListener('pointerup',()=>{ cupPeek.hidden=true; }); addEventListener('pointercancel',()=>{ cupPeek.hidden=true; }); addEventListener('blur',()=>{ cupPeek.hidden=true; });
document.documentElement.style.setProperty('--cup','#'+RING_COLORS.cup.toString(16).padStart(6,'0'));
const DIEFACE=['⚀','⚁','⚂','⚃','⚄','⚅'];
function renderLiars(S,st,over){
  const nm=i=>S.players[i], h=GAMES.status(S,null).handoff;
  if(!over&&needPass()){ GP.append(gel('div',{className:'gstat'},'Pass the device to '+nm(h),gel('small',{textContent:'Nobody else looks: their dice stay hidden until they tap'})),
    gel('div',{className:'row'},gel('button',{className:'big',type:'button',textContent:"I'm "+nm(h),onclick:()=>{ game.ack=h; renderGame(); }}))); return; }
  const res=over?GAMES.result(S):null, bid=st.bid;
  GP.append(gel('div',{className:'gstat'},over?'Game over: '+res.winners.map(nm).join(' & ')+' win'+(res.winners.length>1?'':'s'):(gameMsg||st.message),gel('small',{textContent:'Round '+st.round+' · '+st.totalDice+' dice in play'+(st.wild?' · ones are wild':'')+(bid&&!over?' · bid: '+bid.quantity+' × '+bid.face+'s by '+nm(bid.player):'')})));
  const cups=gel('div',{className:'cups'}); for(const c of st.cups){ const out=c.count===0, mine=c.player===st.viewer, open=st.phase==='reveal'||over, canPeek=mine&&c.dice&&!open;
    const row=gel('div',{className:'cup'+(c.player===st.player&&!over?' cur':'')+(out?' out':'')+(canPeek?' peekme':''),ariaLabel:c.name+(out?' is out':' has '+c.count+' of '+S.options.dice+' dice')+(canPeek?'. Press and hold to look at your dice':'')},
      gel('b',{textContent:c.name+(mine?' (you)':'')}),gel('small',{textContent:out?'':c.count+' of '+S.options.dice+(canPeek?' · hold to peek':'')}),
      gel('span',{className:'pips',textContent:out?'out':open&&c.dice?'':'●'.repeat(c.count)},...(!out&&open&&c.dice?c.dice.map(v=>gel('span',{className:'rd'+(st.reveal&&(st.reveal.face===v||(st.wild&&v===1&&st.reveal.face!==1))?' hit':''),textContent:String(v)})):[])));
    if(canPeek){ row.tabIndex=0; row.onpointerdown=e=>{ e.preventDefault(); peekDice(c.dice); logPeek(c.player,c.name); }; row.oncontextmenu=e=>e.preventDefault(); }
    cups.append(row); }
  GP.append(cups);
  if(over) return;
  if(st.phase==='reveal'){ const rv=st.reveal; if(rv) GP.append(gel('div',{className:'gstat'},'Count of '+rv.face+'s'+(st.wild?' (ones wild)':'')+': '+rv.count+' vs bid '+rv.quantity,gel('small',{textContent:'The bid was '+(rv.bidTrue?'true':'false')+': '+nm(rv.loser)+' loses a die'})));
    GP.append(gel('div',{className:'row'},gel('button',{className:'big',type:'button',textContent:'Next round',disabled:!st.canNext,onclick:()=>{ const r=GAMES.act(S,{type:'next'}); if(r.ok){ game.state=r.state; gameMsg=''; lbid=null; } else gameMsg=r.error; renderGame(); }}))); return; }
  if(st.botTurn){ GP.append(gel('div',{className:'gstat'},nm(st.player)+' is thinking…')); return; }
  if(st.phase==='roll'){ GP.append(gel('div',{className:'gstat'},gel('small',{textContent:'Roll under the cup with the Roll button below'}))); return; }
  // bidding: a quantity and a face, then Bid; Challenge once there is a bid to challenge
  const me=st.viewer, rows=S.options.help&&me!=null&&me!=='all'?GAMES.suggest(S,me):[], faces=st.wild?[2,3,4,5,6]:[1,2,3,4,5,6];
  const first=rows.find(r=>r.kind==='raise'); if(!lbid||lbid.round!==st.round||lbid.stand!==(bid?bid.quantity+'x'+bid.face:'')) lbid={round:st.round,stand:bid?bid.quantity+'x'+bid.face:'',q:first?first.quantity:(bid?bid.quantity:1),f:first?first.face:(bid&&bid.face<faces[faces.length-1]?bid.face+1:faces[0])};
  const q=gel('span',{className:'qty',textContent:String(lbid.q)});
  GP.append(gel('div',{className:'row'},gel('span',{textContent:'Quantity'}),gel('button',{type:'button',ariaLabel:'Fewer',textContent:'−',onclick:()=>{ lbid.q=Math.max(1,lbid.q-1); renderGame(); }}),q,gel('button',{type:'button',ariaLabel:'More',textContent:'+',onclick:()=>{ lbid.q=Math.min(st.totalDice,lbid.q+1); renderGame(); }})));
  const fr=gel('div',{className:'sugs'}); for(const f of faces) fr.append(gel('button',{type:'button',className:'face'+(lbid.f===f?' on':''),ariaLabel:'Face '+f,ariaPressed:String(lbid.f===f),textContent:String(f),onclick:()=>{ lbid.f=f; renderGame(); }})); GP.append(fr);
  const hint=rows.find(r=>r.kind==='raise'&&r.quantity===lbid.q&&r.face===lbid.f), ch=rows.find(r=>r.kind==='challenge');
  if(S.options.help&&(hint||ch)) GP.append(gel('div',{className:'gstat'},gel('small',{textContent:(hint?'This bid: '+Math.round(hint.chance*100)+'% likely true':'')+(hint&&ch?' · ':'')+(ch?'challenge wins '+Math.round(ch.chance*100)+'%':'')})));
  const act=(a)=>{ const r=GAMES.act(S,a); if(!r.ok){ gameMsg=r.error; renderGame(); return; } game.state=r.state; gameMsg=a.type==='bid'?nm(st.player)+' bid '+a.quantity+' × '+a.face+'s':''; lbid=null; renderGame(); };
  GP.append(gel('div',{className:'row'},gel('button',{className:'big',type:'button',textContent:'Bid '+lbid.q+' × '+lbid.f+'s',disabled:!st.canBid,onclick:()=>act({type:'bid',quantity:lbid.q,face:lbid.f})}),gel('button',{type:'button',textContent:'Challenge',disabled:!st.canChallenge,onclick:()=>act({type:'challenge'})})));
}
// ---- Story dice (PD-160 spike): glyph faces from the seeded deal, the ring tray, hints, the bot's sentence and manual bad/fair/good rating ----
const storyTray=createStoryTray(stage); let storySalt=0;
function makeStoryDeal(o){ const dice=Array.from({length:o.dice},()=>({faces:o.sides})), fp=fingerprint(dice,'set'+o.seed,o.packs); return {fp,glyphs:dealTerms([{count:o.dice,sides:o.sides,faces:{kind:'deal',packs:[...new Set(o.packs)].sort(),seed:o.seed,dice:'different',order:'shuffled'}}])[0]}; }   // PD-166: the same deal as the set formula {packs#seed}, so a Story set plays as it previews
const storyGlyphs=st=>st.dice.map((v,i)=>storyDeal.glyphs[i][v-1]);   // the glyph showing on each rolled die (face value v is the v-th face of its die)
function storyPreviewOn(o){ const key=JSON.stringify([o.dice,o.sides,o.seed,o.packs]); if(storyPrev&&storyPrev.key===key) return;
  if(!storyPrev) storyPrev={rolling}; lookSwap(); storyPrev.key=key; storyDeal=makeStoryDeal(o); state.shape='custom'; state.notation=o.dice+'d'+o.sides; buildDice(); startRoll(false,true); lookHistoryReset(); syncUI(); setPane('games'); }   // the story dice rest on the mat like at game start (Play room, not rolling for real); the new build must not drop the setup panel
/* PD-191: the story look (setup preview, with the player's own look parked in lookSnap) is held only while the Games tab shows it and no game runs; leaving the tab, the Design room or the panel releases it. A running game never calls this (storyPrev is null then). */
function syncGameLook(leaving){ if(!storyPrev||game) return; if(leaving||roomNow()!=='play'||SP.hidden||document.body.classList.contains('full')) storyPreviewOff(); }
function storyPreviewOff(){ if(!storyPrev) return; const p=storyPrev, inSetup=!game&&!SP.hidden; storyPrev=null; storyDeal=null; lookRestore(); buildDice(); if(p.rolling) startRoll(false,true); syncUI(); if(inSetup) setPane('games'); }
var storyFly=null, storyLogE=null, storyRings=null;   // storyFly: the dice flying up into the line facing the player (3D arrangement view); storyLogE: this turn's roll-log entry, rewritten as the order changes
function storyOrderText(st){ const g=storyGlyphs(st), names=st.order.filter(x=>x!==null).map(i=>g[i].n[0]); return names.length?names.join(' → ')+(names.length<st.order.length?' …':''):''; }
function storyLogOrder(st){ if(!bag) return; const key=game.state.turn.round+':'+game.state.turn.player+':'+game.state.tellings.reduce((a,t)=>a+t.length,0);
  if(!storyLogE||storyLogE.key!==key){ const e=bag.log[bag.log.length-1]; storyLogE=e&&!e.note&&!e.story?{key,e}:null; }   // the roll was logged when the dice settled, just before the arrange phase began
  if(storyLogE){ const t=storyOrderText(st); if((storyLogE.e.story||'')===t) return; if(t) storyLogE.e.story=t; else delete storyLogE.e.story; save(); renderLog(); } }
function storyRingsEnd(){ if(!storyRings) return; storyRings.parent&&storyRings.parent.remove(storyRings); storyRings.traverse(o=>{ if(o.material){ if(o.material.map) o.material.map.dispose(); o.material.dispose(); } if(o.geometry) o.geometry.dispose(); }); storyRings=null; }   // PD-175: the 3D ring markers live in the scene so the dice can be in front of them
function storyFlyEnd(){ if(!storyFly) return; storyFly=null; storyRingsEnd(); for(const d of dice){ d.mesh.scale.setScalar(1); } storyTray.root.classList.remove('d3'); }
function faceOrient(d,k,rot){   // the mesh rotation that turns face k to face +z (the viewer) with its glyph upright; mirrors the label basis in buildGeometry
  const f=d.faces[k], P=f.pts||f.idx.map(v=>d.verts[v]), n=f.n, C=new THREE.Vector3(); P.forEach(p=>C.add(p)); C.multiplyScalar(1/P.length);
  let far=P[0]; P.forEach(p=>{ if(p.distanceTo(C)>far.distanceTo(C)+1e-6) far=p; });
  let up=new THREE.Vector3().subVectors(far,C).normalize(); const equi=P.every(p=>Math.abs(p.distanceTo(C)-far.distanceTo(C))<1e-4*far.distanceTo(C)+1e-6);
  if(P.length===4&&equi) up.copy(new THREE.Vector3().subVectors(P[1],P[0]).cross(n).normalize());
  up.applyAxisAngle(n,THREE.MathUtils.degToRad(rot)); const right=new THREE.Vector3().crossVectors(up,n);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,n)).invert(); }
function storyFlyStart(st){
  const faces=st.dice, from=dice.map(d=>({p:d.mesh.position.clone(),q:d.mesh.quaternion.clone()}));
  const qf=dice.map((d,i)=>{ const k=Math.max(0,d.labs.indexOf(faces[i])); return faceOrient(d,k,(d.look||state).numRot); });
  storyFly={t:0,from,qf,k:dice.map(()=>1)}; }
function tickStoryFly(dt){
  if(!storyFly||!storyTray.visible||!dice.length) return; storyFly.t+=dt; camera.updateMatrixWorld();
  const items=storyTray.tiles, sz=storyTray.size, r=stage.getBoundingClientRect(), fwd=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion), D=camera.position.distanceTo(new THREE.Vector3(0,TABLE_Y,0))*.6;
  const upx=2*D*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/r.height;   // world units per screen pixel at depth D
  const sc=sz*upx/2.1, tmpP=new THREE.Vector3(), tq=new THREE.Quaternion(), rq=rig.quaternion.clone().invert();
  dice.forEach((d,i)=>{ const el=items[i]; if(!el) return; const b=el.getBoundingClientRect(), nx=((b.left+b.width/2-r.left)/r.width)*2-1, ny=-(((b.top+b.height/2-r.top)/r.height)*2-1);
    const ray=new THREE.Vector3(nx,ny,.5).unproject(camera).sub(camera.position); tmpP.copy(camera.position).addScaledVector(ray,D/ray.dot(fwd)); rig.worldToLocal(tmpP);
    tq.copy(rq).multiply(camera.quaternion).multiply(storyFly.qf[i]);
    const u=Math.min(1,Math.max(0,(storyFly.t-i*.07)/.75)), e=u*u*(3-2*u), f=storyFly.from[i], lift=2.2*Math.sin(Math.PI*u)*(d.r||1);
    d.mesh.position.lerpVectors(f.p,tmpP,e); d.mesh.position.y+=lift; if(storyFly.k[i]>1.001){ const lv=new THREE.Vector3().copy(fwd).applyQuaternion(rq).multiplyScalar(-(storyFly.k[i]-1)*3*sc*(d.r||1)); d.mesh.position.add(lv); } d.mesh.quaternion.copy(f.q).slerp(tq,e); const want=el.classList.contains('drag')?(matchMedia('(max-width:760px)').matches?1.12:1.25):1; storyFly.k[i]+=(want-storyFly.k[i])*(1-Math.exp(-dt*14)); if(dt===0) storyFly.k[i]=want;   // a die picked up is a little bigger (25% desktop, 12% phone; PD-171) and lifted toward the camera so it never cuts through neighbours
    d.mesh.scale.setScalar((1+(sc-1)*e)*storyFly.k[i]); });
  // ring markers with their numbers, drawn in the scene a little behind the dice (the DOM rings are hidden in 3D mode)
  const rs=storyTray.rings, par=dice[0].mesh.parent; if(storyRings&&(storyRings.children.length!==rs.length||storyRings.parent!==par)) storyRingsEnd();
  if(!storyRings&&par){ storyRings=new THREE.Group(); rs.forEach((el,k)=>{ const g=new THREE.Group(), ring=new THREE.Mesh(new THREE.RingGeometry(.46,.5,48),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55,depthWrite:false,toneMapped:false})), c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); x.fillStyle='#fff'; x.font='700 40px system-ui,sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(String(k+1),32,34);
    const num=new THREE.Mesh(new THREE.PlaneGeometry(.4,.4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,opacity:.65,depthWrite:false,toneMapped:false})); ring.renderOrder=num.renderOrder=-1; g.add(ring,num); storyRings.add(g); }); par.add(storyRings); }
  if(storyRings){ const Dr=D*1.12, up2=new THREE.Vector3(); storyRings.children.forEach((g,k)=>{ const el=rs[k], b=el.getBoundingClientRect(), nx=((b.left+b.width/2-r.left)/r.width)*2-1, ny=-(((b.top+b.height/2-r.top)/r.height)*2-1);
    const ray=up2.set(nx,ny,.5).unproject(camera).sub(camera.position); tmpP.copy(camera.position).addScaledVector(ray,Dr/ray.dot(fwd)); rig.worldToLocal(tmpP); g.position.copy(tmpP); g.quaternion.copy(rq).multiply(camera.quaternion); g.scale.setScalar(b.width*upx*Dr/D); g.children[0].material.opacity=el.classList.contains('hot')?.95:.55; }); } }
function storySentence(st){ if(st.phase!=='rate') return ''; const ids=st.order.map(i=>storyGlyphs(st)[i].id); return st.botTurn?adLibFor(ids,storySalt).text:sentenceFor(ids,storySalt).text; }   // PD-176: shown on the mat once every die is placed
function storySync(){
  if(!game||game.setup||game.id!=='story'||!storyDeal){ storyTray.hide(); storyFlyEnd(); return; }
  const st=GAMES.status(game.state); if(st.phase==='roll'||st.phase==='over'||!st.dice||(rolling&&!settled&&gameAwaiting)){ storyTray.hide(); storyFlyEnd(); if(!gameAwaiting) for(const d of dice) d.mesh.visible=true; return; }
  const d3=gprefs.hivis!==true&&rolling&&!!bodies.length&&dice.length===st.dice.length;   // 3D: the real dice fly up into a line facing the player; hi-vis: the flat glyph tiles
  if(!d3) storyFlyEnd();
  for(const d of dice) d.mesh.visible=d3;   // hi-vis: the dice are swept off the mat while the tray is up
  storyTray.show({sentence:storySentence(st),sentencePre:st.botTurn?(String(game.state.players[st.player]||'').trim()||'The bot')+"'s story: ":'Tell your own: ',glyphs:storyGlyphs(st),order:st.order,locked:st.botTurn,dice3d:d3,autoswap:gprefs.autoswap!==false,onOrder:o=>{ const r=GAMES.act(game.state,{type:'arrange',order:o}); if(r.ok){ game.state=r.state; gameMsg=''; storySalt=0; renderGame(); } }});
  storyLogOrder(st);
  if(d3){ storyTray.root.classList.add('d3'); if(!storyFly) storyFlyStart(st); }
}
function storyDone(){ endGame(); document.dispatchEvent(new CustomEvent('pd-open-games')); }
function storyPlayAgain(){ if(!game||game.id!=='story') return; const S=game.state, snap=gameSnap; startGame('story',S.players.slice(),{...S.options,seed:1+Math.floor(rng()*999999)},(S.bots||[]).slice()); if(snap) gameSnap=snap; }   // PD-192: same players and options, a fresh set number; the look to restore at the end stays the player's own
function storyRate(rating){ const r=GAMES.act(game.state,{type:'rate',rating}); if(!r.ok){ gameMsg=r.error; renderGame(); return; } game.state=r.state; const e=r.events.find(x=>x.type==='scored'); gameMsg='+'+(e?e.points:0)+' ('+rating+')'; gflash=rating==='good'||rating==='great'?'bank':rating==='bad'?'bust':null; storySalt=0; renderGame(); }
// ---- Story Dice sets editor (PD-166): Story sets are bag sets with one glyph-face term (src/storysets.js); this view lists, edits and saves them from the Games panel ----
let sset=null;   // null (closed) | {view:'list'} | {view:'edit', id:null|setId, d:draft, orig:json, err}
const ssRandSeed=()=>1+Math.floor(rng()*999);
function ssOpenEdit(id){ const st=id&&setOps.find(id), d=st?draftOf(st):newDraft(uniqueName(bag.sets.map(x=>x.name),'Story set'),ssRandSeed()); sset={view:'edit',id:st?id:null,d,orig:JSON.stringify(d),err:''}; renderGame(); }
function ssSave(){ const S=sset, d=S.d, err=draftError(d); if(err){ S.err=err; renderGame(); return null; }
  let id=S.id; const t=[draftTerm(d)];
  if(id&&setOps.find(id)){ if(!setOps.edit(id,{name:d.name,terms:t,mod:0})) return null; } else { id=setOps.create({name:d.name,terms:t,mod:0}); }
  const st=setOps.find(id); S.id=id; S.d.name=st.name; S.orig=JSON.stringify(S.d); S.err=''; return id; }
function ssUse(d){ gprefs.gameId='story'; Object.assign(gprefs.opts,{'story.dice':d.count,'story.sides':d.sides,'story.seed':d.seed,'story.packs':[...d.packs]}); gsave(); sset=null; renderGame(); }
function ssRoll(){ const id=ssSave(); if(!id) return; storyPreviewOff(); sset=null; closeGamesUI(); setOps.open(id,{roll:true}); }
function ssPreviewMat(d){ const err=draftError(d); if(err){ storyPreviewOff(); return; } const note=draftFormula(d), key='sset|'+note; if(storyPrev&&storyPrev.key===key) return;
  if(!storyPrev) storyPrev={rolling}; lookSwap(); storyPrev.key=key; storyDeal=null; state.shape='custom'; state.notation=note; buildDice(); startRoll(false,true); lookHistoryReset(); syncUI(); setPane('games'); }
function renderStorySets(){
  const S=sset, hd=(title,back,label)=>GP.append(gel('div',{className:'gh'},gel('h2',{textContent:title}),gel('button',{textContent:label,onclick:back,type:'button',className:'ssback'})));
  const leave=()=>{ storyPreviewOff(); sset=null; renderGame(); };
  GP.textContent=''; GP.hidden=false;
  if(S.view==='list'){ hd('Story Dice sets',leave,'Back');
    const list=bag.sets.filter(isStorySet), box=gel('div',{className:'ssets'});
    for(const st of list){ const d=draftOf(st), row=gel('div',{className:'setrow ssrow'}); row.dataset.id=st.id;
      const main=gel('button',{type:'button',className:'main',onclick:()=>ssOpenEdit(st.id)},gel('span',{className:'nm',textContent:st.name}),gel('small',{textContent:summaryOf(d)}));
      const pen=gel('button',{type:'button',className:'pen',textContent:'✎',title:'Edit',ariaLabel:'Edit '+st.name,onclick:()=>ssOpenEdit(st.id)});
      const dots=gel('button',{type:'button',className:'dots',textContent:'⋯',ariaLabel:'Menu for '+st.name,onclick:e=>{ e.stopPropagation(); openMenu(dots,[{label:'Edit…',run:()=>ssOpenEdit(st.id)},{label:'Roll it',disabled:!!draftError(d),run:()=>{ sset=null; closeGamesUI(); setOps.open(st.id,{roll:true}); }},{label:'Use in game',disabled:!gameReady(d),run:()=>ssUse(d)},{label:'Make a copy',run:()=>{ setOps.copy(st.id); renderGame(); }},
        {label:'Delete…',danger:true,run:()=>setTimeout(()=>openMenu(dots,[{head:`Delete "${st.name}"?`},{label:'Delete',danger:true,run:()=>{ setOps.remove(st.id); renderGame(); }},{label:'Cancel',run:()=>{}}]),0)}]); }});
      row.append(main,pen,dots); box.append(row); }
    if(!list.length) box.append(gel('div',{className:'setempty',textContent:'No Story Dice sets yet. Make one: pick the glyph packs, the dice and a seed.'}));
    GP.append(gel('div',{className:'setact'},gel('button',{type:'button',id:'ssnew',className:'big',textContent:'New Story set',onclick:()=>ssOpenEdit(null)})),box);
    GP.append(gel('div',{className:'gstat'},gel('small',{textContent:'Story sets are saved in the bag (Bag > Sets) like any other set.'}))); storyPreviewOff(); return; }
  const d=S.d, dirty=JSON.stringify(d)!==S.orig, err=S.err||draftError(d), pv=previewOf(d), note=draftFormula(d);
  hd(S.id?'Edit Story set':'New Story set',()=>{ if(!dirty){ sset={view:'list'}; renderGame(); return; } openMenu(GP.querySelector('.ssback'),[{head:'Discard your changes?'},{label:'Discard',danger:true,run:()=>{ sset={view:'list'}; renderGame(); }},{label:'Keep editing',run:()=>{}}]); },'Close');
  const host=gel('div',{className:'seted sseditor'+(dirty?' dirty':'')}), lab=t=>gel('div',{className:'selab',textContent:t});
  const nm=gel('input',{type:'text',className:'sename',value:d.name,maxLength:80,placeholder:'Set name',ariaLabel:'Set name',oninput:()=>{ d.name=nm.value; host.classList.toggle('dirty',JSON.stringify(d)!==S.orig); },onkeydown:e=>e.stopPropagation()});
  const again=()=>{ S.err=''; renderGame(); };
  const packs=gel('div',{className:'sspacks'}); for(const p of PACK_LIST){ const cb=gel('input',{type:'checkbox',checked:d.packs.includes(p.id),onchange:()=>{ d.packs=PACK_LIST.filter(x=>x.id===p.id?cb.checked:d.packs.includes(x.id)).map(x=>x.id); again(); }}); packs.append(gel('label',{className:'row',title:p.blurb+' · '+p.credit},cb,gel('span',{textContent:p.name+' ('+p.count+') · '+p.license}))); }
  const cnt=gel('div',{className:'row2'},gel('label',{textContent:'Dice'}),gel('button',{type:'button',textContent:'−',ariaLabel:'Fewer dice',disabled:d.count<=STORY_MIN,onclick:()=>{ d.count--; again(); }}),gel('b',{className:'mv sscount',textContent:String(d.count)}),gel('button',{type:'button',textContent:'+',ariaLabel:'More dice',disabled:d.count>=STORY_MAX,onclick:()=>{ d.count++; again(); }}));
  const sides=gel('div',{className:'presets sssides'}); for(const n of STORY_SIDES) sides.append(gel('button',{type:'button',textContent:'d'+n,ariaPressed:String(d.sides===n),className:d.sides===n?'on':'',onclick:()=>{ d.sides=n; again(); }}));
  const seed=gel('div',{className:'row2'},gel('label',{textContent:'Seed'}),gel('input',{type:'number',className:'ssseed',min:1,max:999999,value:d.seed,ariaLabel:'Seed',disabled:d.order==='ordered',onkeydown:e=>e.stopPropagation(),onchange:e=>{ d.seed=Math.max(1,Math.min(999999,Math.round(+e.target.value)||1)); again(); }}),gel('button',{type:'button',className:'ssreseed',textContent:'Reroll seed',disabled:d.order==='ordered',onclick:()=>{ d.seed=ssRandSeed(); again(); }}));
  const sel=(label,cls,val,opts,set)=>{ const s=gel('select',{className:cls,ariaLabel:label,onchange:()=>{ set(s.value); again(); }}); for(const [v,t] of opts) s.append(gel('option',{value:v,textContent:t,selected:v===val})); return gel('div',{className:'row2'},gel('label',{textContent:label}),s); };
  const mode=sel('Faces on the dice','ssdice',d.dice,[['different','Different on every die'],['same','Same on every die']],v=>{ d.dice=v; });
  const ord=sel('Glyph order','ssorder',d.order,[['shuffled','Shuffled (by seed)'],['ordered','In pack order']],v=>{ d.order=v; });
  const pre=gel('div',{className:'sspreview'}); if(pv){ pv.dice.forEach((faces,i)=>{ const r=gel('div',{className:'ssdie'},gel('small',{textContent:'Die '+(i+1)})); const fl=gel('span',{className:'ssfaces'}); for(const g of faces){ const sp=gel('span',{className:'ssg',title:g.name.replace(/[-_]+/g,' ')}); sp.innerHTML=`<svg viewBox="${g.vb}"><path d="${g.path}"/></svg>`; fl.append(sp); } r.append(fl); pre.append(r); });
    pre.append(gel('div',{className:'sssent',textContent:pv.sentence})); }
  const ft=gel('input',{type:'text',className:'ssformula',readOnly:true,value:note,ariaLabel:'Set text',onfocus:()=>ft.select(),onkeydown:e=>e.stopPropagation()});
  const cp=gel('button',{type:'button',className:'sscopy',textContent:'Copy',onclick:async()=>{ try{ await navigator.clipboard.writeText(note); toast('Copied '+note); }catch{ ft.select(); toast('Press Ctrl+C to copy'); } }});
  const save=gel('button',{type:'button',className:'primary sesave sssave',textContent:'Save',disabled:!!draftError(d),onclick:()=>{ const id=ssSave(); if(id){ toast(`Saved "${S.d.name}" to the bag`); sset={view:'list'}; renderGame(); } }});
  const use=gel('button',{type:'button',className:'ssuse',textContent:'Use in game',disabled:!gameReady(d),title:gameReady(d)?'Load this pack, dice count and seed into the Story Dice setup':'The game deals shuffled, different dice only',onclick:()=>ssUse(d)});
  const roll=gel('button',{type:'button',className:'ssroll',textContent:'Roll it',disabled:!!draftError(d),title:'Save and roll these dice on the table',onclick:ssRoll});
  const del=S.id?gel('button',{type:'button',className:'ssdel',textContent:'Delete',onclick:()=>{ const st=setOps.find(S.id); if(!st) return; openMenu(del,[{head:`Delete "${st.name}"?`},{label:'Delete',danger:true,run:()=>{ setOps.remove(S.id); sset={view:'list'}; renderGame(); }},{label:'Cancel',run:()=>{}}]); }}):null;
  host.append(gel('div',{className:'sehead'},nm,save),lab('Glyph packs'),packs,cnt,lab('Faces per die'),sides,seed,mode,ord,gel('div',{className:'seerr',textContent:err||''}),lab('Preview'),pre,lab('Set text'),gel('div',{className:'row2'},ft,cp),gel('div',{className:'setact'},use,roll,...(del?[del]:[])));
  GP.append(host); ssPreviewMat(d); }   // the mat preview last: a rebuild re-selects the Games pane, which needs the panel to have content
function storyFit(o){ const have=poolFor(o.packs).length; if(o.dice*o.sides<=have) return {ok:true,dice:o.dice,sides:o.sides};   // the closest dice set the packs can fill: keep the dice count and take the biggest die that fits, else fewer d6
  for(const sd of [20,12,8,6]) if(sd<o.sides&&o.dice*sd<=have) return {ok:false,dice:o.dice,sides:sd};
  const n=Math.floor(have/6); return n>=3?{ok:false,dice:Math.min(o.dice,n),sides:6}:{ok:false,dice:3,sides:6,short:true}; }
function renderStory(S,st,over){
  const res=over?GAMES.result(S):null;
  if(over) GP.append(gel('div',{className:'gstat story-over'},storyOverText(S),gel('small',{textContent:S.players.length>1?res.ranking.map(r=>r.name+' '+r.total).join(' · '):''})),
    gel('div',{className:'story-endbtns'},gel('button',{type:'button',className:'big',id:'storyagain',textContent:'Play again',onclick:storyPlayAgain}),gel('button',{type:'button',className:'big',id:'storydone',textContent:'Done',onclick:storyDone})));   // PD-192: a real end screen
  else GP.append(gel('div',{className:'gstat'},st.phase==='rate'?storyRateLine(S,st):(S.players.length>1&&S.players[st.player]?S.players[st.player]+': ':'')+(st.botTurn?(st.phase==='roll'?'the bot is rolling':'the bot is arranging the dice'):st.phase==='roll'?'roll the dice':'put the dice in story order'),gel('small',{textContent:'Story '+st.round+' of '+st.rounds+(gameMsg?' · '+gameMsg:'')})));
  if(!over&&st.phase==='arrange'&&!st.botTurn){ const ac=gel('input',{type:'checkbox',checked:gprefs.autoswap!==false,onchange:()=>{ gprefs.autoswap=ac.checked; gsave(); renderGame(); }}); GP.append(gel('div',{className:'gstat'},gel('small',{textContent:st.order.filter(x=>x!==null).length+' of '+st.order.length+' placed: click the dice in order, or drag them onto the rings'})),gel('label',{className:'row'},ac,gel('span',{textContent:'Autoswap when dropping on a filled ring'})),gel('label',{className:'row'},gel('input',{type:'checkbox',checked:gprefs.hivis===true,onchange:ev=>{ gprefs.hivis=ev.target.checked; gsave(); renderGame(); }}),gel('span',{textContent:'Hi-vis: flat glyph tiles instead of the 3D dice'}))); }
  if(!over&&st.phase==='rate'){
    const ids=st.order.map(i=>storyGlyphs(st)[i].id), txt=st.botTurn?adLibFor(ids,storySalt).text:sentenceFor(ids,storySalt).text;
    GP.append(gel('div',{className:'story-sent',textContent:txt}),gel('div',{className:'row'},gel('small',{textContent:st.botTurn?'This is the bot\'s whole story.':'A sample sentence to start from: tell your own.'}),...(st.botTurn?[]:[gel('button',{type:'button',className:'reword',textContent:'Re-word',title:'Another sample sentence',onclick:()=>{ storySalt++; renderGame(); }})])));   // Re-word only re-rolls the sample prompt; a bot's ad-lib is what it said, so it is not re-rolled
    GP.append(gel('div',{className:'story-scale',textContent:storyScale()}),gel('div',{className:'story-rate'},...storyRatings().map(r=>storyRateBtn(r,()=>storyRate(r.id)))));
  }
  if(!over&&st.phase!=='roll'&&S.options.hints){ const ids=(st.phase==='rate'?st.order.map(i=>storyGlyphs(st)[i]):storyGlyphs(st).filter((_,i)=>!st.order.includes(i))).map(g=>g.id), box=gel('div',{className:'story-hints'});
    for(const id of ids){ const h=hintFor(id); box.append(gel('div',{},gel('b',{textContent:h.nouns[0]}),gel('br'),'n: '+h.nouns.join(', '),gel('br'),'adj: '+h.adjectives.join(', '),gel('br'),'adv: '+h.adverbs.join(', '),gel('br'),'v: '+h.verbs.join(', '))); } GP.append(box); }
  const tb=gel('table'), hr=gel('tr'); hr.append(gel('th',{textContent:'Story'})); S.players.forEach((nm,p)=>hr.append(gel('th',{textContent:nm,className:p===st.player&&!over?'cur':'',title:nm}))); tb.append(gel('thead',{},hr));
  const body=gel('tbody'); for(let r=0;r<S.options.rounds;r++){ const tr=gel('tr'); tr.append(gel('td',{textContent:String(r+1)})); S.players.forEach((_,p)=>{ const e=S.tellings[p][r]; tr.append(gel('td',{textContent:e?e.points+' '+e.rating:'',className:p===st.player&&!over&&r+1===st.round?'cur':''})); }); body.append(tr); }
  const tt=gel('tr',{className:'tot'}); tt.append(gel('td',{textContent:'Total'})); S.players.forEach((_,p)=>tt.append(gel('td',{textContent:String(S.scores[p]),className:p===st.player&&!over?'cur':''}))); body.append(tt); tb.append(body); GP.append(tb);
}
function renderGame(){
  GP=SP;   // slice 6: the scorecard lives in the panel's Games tab on every size
  renderGameBody(); document.body.classList.toggle('game',!!game&&!game.setup); peekHandle(GP.querySelector('.gstat'));
  { $('gamestab').textContent=game&&!game.setup?'Scorecard':'Games'; if(paneAuto){ setPane('games'); paneAuto=false; } renderStrip(); }
  if(gflash){ for(const el of [GP.querySelector('.gstat'),GPstage.querySelector('.st')]) if(el){ el.classList.remove('fx-bust','fx-hot','fx-bank'); void el.offsetWidth; el.classList.add('fx-'+gflash); } gflash=null; }
  renderDock(); gsaveGame(); botPump(); showCallout(); showcaseCount(); storySync();
}

function renderStrip(){   // the phone's mat strip keeps one line: the status (Roll, Bank and Set aside live in the dock)
  if(!game||game.setup){ GPstage.hidden=true; GPstage.classList.remove('strip'); document.body.classList.remove('gstrip'); return; }
  const S=game.state, st=GAMES.status(S), over=st.phase==='over', farkle=game.id==='farkle';
  GPstage.textContent=''; GPstage.hidden=false; GPstage.classList.add('strip'); document.body.classList.add('gstrip');
  const who=S.players.length>1&&!over&&!(game.id==='story'&&st.phase==='rate')?S.players[st.player]+': ':'', msg=over?'Game over':game.id==='story'&&st.phase==='rate'?storyRateLine(S,st):(gameMsg||(st.message||'').replace(S.players[st.player]+': ',''));
  { const sm=rollSum(st), sp=gel('span',{className:'st',textContent:who+msg+(sm!=null?' · total '+sm:'')}); peekHandle(sp); GPstage.append(sp); }
 }
function renderGameBody(){
  GP.textContent=''; GP.hidden=false;
  const hd=(title,closeFn,closeLbl)=>GP.append(gel('div',{className:'gh'},gel('h2',{textContent:title}),gel('button',{textContent:closeLbl||'Close',onclick:closeFn,type:'button'})));
  if(!game&&sset) return renderStorySets();
  if(!game||game.setup){ hd('Games',()=>{ if(game) game.setup=false,renderGame(); else closeGamesUI(); });
    if(!game){ const sv=gsaved(); if(sv) GP.append(gel('div',{className:'row'},gel('button',{className:'big',type:'button',textContent:'Resume '+keptGames().find(g=>g.id===sv.id).name,onclick:()=>startGame(sv.id,sv.state.players,sv.state.options,sv.state.bots||[],sv.state)}))); }
    const games=keptGames(), g=games.find(x=>x.id===gprefs.gameId)||games[0];
    const sel=gel('select',{ariaLabel:'Game',onchange:()=>{ gprefs.gameId=sel.value; gsave(); renderGame(); }}); for(const x of games) sel.append(gel('option',{value:x.id,textContent:x.name,selected:x.id===g.id}));
    GP.append(gel('div',{className:'row'},gel('label',{textContent:'Game'}),sel));
    const cnt=gel('select',{onchange:()=>{ gprefs.count=+cnt.value; gsave(); renderGame(); }}); for(let n=g.minPlayers;n<=g.maxPlayers;n++) cnt.append(gel('option',{value:n,textContent:n+(n>1?' players':' player'),selected:n===Math.max(g.minPlayers,Math.min(gprefs.count,g.maxPlayers))}));
    GP.append(gel('div',{className:'row'},gel('label',{textContent:'Players'}),cnt));
    const n=Math.max(g.minPlayers,Math.min(gprefs.count,g.maxPlayers)), nameIn=[], botIn=[]; for(let i=0;i<n;i++){ const inp=gel('input',{type:'text',value:gprefs.names[i],maxLength:14,ariaLabel:'Player '+(i+1)+' name',oninput:()=>{ gprefs.names[i]=inp.value; gsave(); }}), bc=gel('input',{type:'checkbox',checked:!g.noBots&&!!gprefs.bots[i],ariaLabel:'Seat '+(i+1)+' is a computer player',onchange:()=>{ gprefs.bots[i]=bc.checked; gsave(); }}); nameIn.push(inp); botIn.push(bc); GP.append(gel('div',{className:'row'},inp,g.noBots?'':gel('label',{className:'botlbl'},bc,gel('span',{textContent:'Bot'})))); }
    const opts={}; for(const o of g.options){ const v=gprefs.opts[g.id+'.'+o.id]??o.default; opts[o.id]=v;
      if(o.type==='bool'){ const cb=gel('input',{type:'checkbox',checked:!!v,onchange:()=>{ gprefs.opts[g.id+'.'+o.id]=cb.checked; opts[o.id]=cb.checked; gsave(); }}); GP.append(gel('label',{className:'row'},cb,gel('span',{textContent:o.label}))); }
      else if(o.type==='int'){ const ni=gel('input',{type:'number',min:o.min,max:o.max,step:o.id==='seed'?1:o.max>=1000?(o.min>=1000?1000:50):5,value:v,ariaLabel:o.label,onchange:()=>{ const x=Math.max(o.min,Math.min(o.max,Math.round(+ni.value)||o.default)); ni.value=x; gprefs.opts[g.id+'.'+o.id]=x; opts[o.id]=x; gsave(); if(g.id==='story') renderGame(); }}); GP.append(gel('label',{className:'row'},gel('span',{textContent:o.label}),ni)); }
      else if(o.type==='choice'){ const se=gel('select',{ariaLabel:o.label,onchange:()=>{ const x=+se.value; gprefs.opts[g.id+'.'+o.id]=x; opts[o.id]=x; gsave(); renderGame(); }}); for(const c of o.choices) se.append(gel('option',{value:c.value,textContent:c.label,selected:c.value===v})); GP.append(gel('label',{className:'row'},gel('span',{textContent:o.label}),se)); }
      else if(o.type==='multi'){ const list=o.id==='packs'?PACK_LIST:o.choices, have=new Set(v); GP.append(gel('div',{className:'row'},gel('span',{textContent:o.label+' (pick any)'})));
        for(const c of list){ const cb=gel('input',{type:'checkbox',checked:have.has(c.id),onchange:()=>{ const next=list.filter(x=>x.id===c.id?cb.checked:have.has(x.id)).map(x=>x.id), pk=next.length?next:['noto']; gprefs.opts[g.id+'.'+o.id]=pk; gsave(); renderGame(); }}); GP.append(gel('label',{className:'row',title:c.blurb+' · '+c.credit},cb,gel('span',{textContent:c.name+' ('+c.count+') · '+c.license}))); } } }
    const sfit=g.id==='story'?storyFit(opts):null;   // too many faces for the glyph pool: preview (and offer) the closest set that fits, never the plain d6s
    if(!game){ if(sfit&&!sfit.short) storyPreviewOn(sfit.ok?opts:{...opts,dice:sfit.dice,sides:sfit.sides}); else storyPreviewOff(); }   // the story dice show on the mat while setting up
    if(g.id==='story'){ const need=opts.dice*opts.sides, have=poolFor(opts.packs).length;
      if(sfit&&sfit.ok) GP.append(gel('div',{className:'gstat'},gel('small',{textContent:need+' faces from '+have+' glyphs'})));
      else if(sfit) GP.append(gel('div',{className:'story-warn',role:'alert'},gel('b',{textContent:'Not enough glyphs for '+opts.dice+' × d'+opts.sides}),gel('span',{textContent:' needs '+need+' different faces, but the chosen packs have only '+have+'. '+(sfit.short?'Even 3 × d6 needs 18, so add a glyph pack.':'The mat shows '+sfit.dice+' × d'+sfit.sides+' ('+sfit.dice*sfit.sides+' faces), the closest set that fits. Add a glyph pack to keep your choice.')}),
        sfit.short?'':gel('button',{type:'button',className:'big',textContent:'Use '+sfit.dice+' × d'+sfit.sides,onclick:()=>{ gprefs.opts['story.dice']=sfit.dice; gprefs.opts['story.sides']=sfit.sides; gsave(); renderGame(); }}))); }
    if(!game&&g.id==='story') GP.append(gel('div',{className:'row'},gel('button',{type:'button',id:'storysets',textContent:'Story Dice sets…',title:'See, edit and save Story Dice sets',onclick:()=>{ sset={view:'list'}; renderGame(); }})));
    if(g.id!=='liarsdice'&&g.id!=='story'){ const sg=gel('input',{type:'checkbox',checked:gprefs.suggest,onchange:()=>{ gprefs.suggest=sg.checked; gsave(); }}); GP.append(gel('label',{className:'row'},sg,gel('span',{textContent:'Suggest scores'}))); }
    GP.append(gel('div',{className:'row startrow'},gel('button',{className:'big startbtn',type:'button',textContent:game?'Back to game':'Start game',disabled:g.id==='story'&&opts.dice*opts.sides>poolFor(opts.packs).length,onclick:()=>{ if(game){ game.setup=false; renderGame(); } else { const bs=botIn.map((c,i)=>c.checked?i:-1).filter(i=>i>=0); startGame(g.id,nameIn.map((x,i)=>{ const v=x.value.trim()||('Player '+(i+1)); return botIn[i].checked&&/^Player \d$/.test(v)?'Bot '+(i+1):v; }),opts,bs); } }})));
    return; }
  const S=game.state, st=GAMES.status(S,gviewer()), sug=game.info.hidden?[]:GAMES.suggest(S), over=st.phase==='over';
  const storyAsk=game.id==='story'&&!over;   // PD-192: ending a Story Dice game that is still going asks once (scores would be lost)
  hd(game.info.name,()=>{ if(storyAsk&&!gendAsk){ gendAsk=true; renderGame(); return; } endGame(); document.dispatchEvent(new CustomEvent('pd-open-games')); },over&&game.id==='story'?'Done':'End game');
  if(storyAsk&&gendAsk) GP.append(gel('div',{className:'story-confirm',role:'alertdialog',ariaLabel:'End the game?'},gel('span',{textContent:'End the game? Scores will be lost.'}),gel('button',{type:'button',className:'big',id:'endyes',textContent:'End game',onclick:()=>{ endGame(); document.dispatchEvent(new CustomEvent('pd-open-games')); }}),gel('button',{type:'button',className:'big',id:'endno',textContent:'Keep playing',onclick:()=>{ gendAsk=false; renderGame(); }})));
  else if(!storyAsk) gendAsk=false; if(false) GP.firstChild.insertBefore(gel('button',{type:'button',textContent:gcollapsed?'Scorecard ▴':'Scorecard ▾',ariaExpanded:String(!gcollapsed),onclick:()=>{ gcollapsed=!gcollapsed; renderGame(); }}),GP.firstChild.lastChild);
  if(game.id==='liarsdice'){ renderLiars(S,st,over); return; }
  if(TURN_GAMES.includes(game.id)){ renderTurn(S,st,over); return; }
  if(game.id==='craps'){ renderCraps(S,st,over); return; }
  if(game.id==='story'){ renderStory(S,st,over); return; }
  const res=over?GAMES.result(S):null;
  if(over) GP.append(gel('div',{className:'gstat'},'Game over: '+res.winners.map(i=>S.players[i]).join(' & ')+' win'+(res.winners.length>1?'':'s')+' with '+res.ranking[0].total,gel('small',{textContent:res.ranking.map(r=>r.name+' '+r.total).join(' · ')})));
  else GP.append(gel('div',{className:'gstat'},(S.players.length>1?S.players[st.player]+': ':'')+(st.canRoll?(st.rollsUsed?'roll again or pick a box':'roll the dice'):'pick a box'),gel('small',{textContent:'Round '+st.round+' of '+st.rounds+(st.rollsUsed?' · roll '+st.rollsUsed+' of 3':'')+(gameMsg?' · '+gameMsg:'')})));
  if(gcollapsed){ GP.append(gel('div',{className:'gstat'},S.players.map((n,p)=>n+' '+GAMES.scorecard(S,p).total).join(' · '))); return; }
  const cards=S.players.map((_,p)=>GAMES.scorecard(S,p)), tb=gel('table'), hr=gel('tr'); hr.append(gel('th'));
  S.players.forEach((nm,p)=>hr.append(gel('th',{textContent:nm,className:p===st.player&&!over?'cur':'',title:nm}))); tb.append(gel('thead',{},hr));
  const body=gel('tbody'); const cell=(tr,p,txt,cls,fn,cat)=>{ const td=gel('td',{textContent:txt,className:cls}); if(fn){ td.onclick=fn; if(cat) scorePress(td,cat); } tr.append(td); };
  cards[0].sections.forEach((sec,si)=>{ body.append(gel('tr',{className:'sec'},gel('td',{textContent:sec.label,colSpan:S.players.length+1})));
    sec.rows.forEach((row,ri)=>{ const tr=gel('tr'); tr.append(gel('td',{textContent:row.label}));
      S.players.forEach((_,p)=>{ const pt=cards[p].sections[si].rows[ri].points, cur=p===st.player&&!over; let txt=pt==null?'':String(pt), cls=cur?'cur':'', fn=null;
        let cat=null; if(cur&&pt==null){ const sg=sug.find(r=>r.category===row.category); if(st.canScore&&sg&&sg.open&&sg.points!=null){ cls+=' pick'; cat=row.category; fn=e=>scoreTap(cat,row.label,sg.points,e); if(gprefs.suggest){ txt=String(sg.points); cls+=sg.best?' sug best':' sug'; } } else if(st.canScore&&sg&&sg.open&&!gprefs.suggest){ cls+=' pick'; cat=row.category; fn=e=>scoreTap(cat,row.label,null,e); }
          if(cat&&gpv&&gpv.cat===cat){ cls+=' prev'; if(sg&&sg.points!=null) txt=String(sg.points); } }
        cell(tr,p,txt,cls.trim(),fn,cat); }); body.append(tr); });
    if(sec.subtotal!=null||sec.bonus){ const tr=gel('tr'); tr.append(gel('td',{textContent:si===0?'Upper bonus':'Yacht bonus'})); S.players.forEach((_,p)=>{ const c=cards[p].sections[si]; cell(tr,p,String(c.bonus||''),p===st.player&&!over?'cur':''); }); body.append(tr); } });
  const tt=gel('tr',{className:'tot'}); tt.append(gel('td',{textContent:'Total'})); S.players.forEach((_,p)=>cell(tt,p,String(cards[p].total),p===st.player&&!over?'cur':'')); body.append(tt); tb.append(body); if(whoop) GP.append(gel('div',{className:'row'},whoopBtn())); GP.append(tb);
  { const ms=gel('select',{ariaLabel:'Score entry',onchange:()=>{ gprefs.scoreMode=ms.value; gpv=null; gsave(); renderGame(); }}); for(const [v,t] of [['double','Double tap to score'],['long','Long press to score'],['single','Single tap scores']]) ms.append(gel('option',{value:v,textContent:t,selected:scoreModeOf()===v})); if(navigator.maxTouchPoints>0||matchMedia('(any-pointer:coarse)').matches) GP.append(gel('div',{className:'row'},gel('label',{textContent:'Score entry'}),ms)); }   // PD-172: touch devices only; a mouse click scores directly
}
let cbet={chip:null,who:null,rules:false,n:1,ready:false};   // n: how many of the chosen chip (or units) one tap adds; drag a chip up or down to change it (PD-142.33.1)
const betsLocked=()=>gameAwaiting||(rolling&&!settled)||!!(game&&GAMES.status(game.state).rolling);   // owner rule: no betting while the dice are rolling, until the roll settles and is reported
const PCOL=['#f2c14e','#5aa9e6','#e8647a','#6fcf97','#b78cf2','#f2994a'];   // chip colour per player seat
const betWho=st=>cbet.who!=null&&cbet.who<game.state.players.length?cbet.who:((game.state.bots||[]).includes(st.player)&&humanSeats().length?humanSeats()[0]:st.player);   // PD-159: bets default to the shooter, or to the first human while a bot shoots
function gameBet(r,chip){ if(betsLocked()){ gameMsg='No betting while the dice are rolling'; renderGame(); return; } const st=GAMES.status(game.state), who=betWho(st);
  if(!r||!r.available){ gameMsg=(r&&r.note)||'That bet is not open'; renderGame(); return; }
  const k=Math.max(1,cbet.n||1), want=r.add?r.unit:r.minAmount, amt=Math.min(r.maxAmount,Math.max(want,chip?Math.ceil(chip*k/r.unit)*r.unit:want*k));   // a tap adds one unit; a chosen chip adds that much, snapped up to the bet's unit
  const a=GAMES.act(game.state,{type:'bet',kind:r.kind,amount:amt,number:r.number,on:r.on,player:who}); if(!a.ok){ gameMsg=a.error; renderGame(); return; } game.state=a.state; gameMsg=''; renderGame(); }
function gameTakeDown(b,whole){ if(betsLocked()){ gameMsg='No betting while the dice are rolling'; renderGame(); return; }
  const a=GAMES.act(game.state,whole||!b.canReduce?{type:'removeBet',id:b.id}:{type:'removeBet',id:b.id,amount:b.unit}); if(!a.ok) gameMsg=a.error; else { game.state=a.state; gameMsg=''; } renderGame(); }
function gameCashOut(){ if(betsLocked()){ gameMsg='Wait for the dice to stop'; renderGame(); return; } const r=GAMES.act(game.state,{type:'end'}); if(!r.ok){ gameMsg=r.error; renderGame(); return; } game.state=r.state; gameMsg=''; renderGame(); }
function chipStack(b,st,who){   // one player's bet on a spot: discs in their colour (greedy by chip value, up to 5 shown) and the amount; tap takes down a unit, long-press the whole bet
  let left=b.amount,n=0; for(const c of [...st.chips].sort((x,y)=>y-x)){ n+=Math.floor(left/c); left%=c; }
  const k=Math.max(1,Math.min(5,n)), discs=gel('span',{className:'discs'}); discs.style.setProperty('--n',k);
  for(let i=0;i<k;i++){ const d=gel('span',{className:'disc'}); d.style.setProperty('--i',i); discs.append(d); }
  const tag=({come:'C',dontCome:'DC',comeOdds:'odds',dontComeOdds:'lay'})[b.kind]||'', who0=game.state.players[b.player];
  const e=gel('button',{type:'button',className:'stk'+(b.player===who?' mine':''),ariaLabel:(game.state.players.length>1?who0+': ':'')+'chips '+b.amount+(tag?' ('+tag+')':'')+'. Tap takes down '+(b.canReduce?b.unit:'the bet')+', hold takes it all',title:who0+' · '+b.amount,disabled:betsLocked()||b.player!==who},discs,gel('span',{className:'amt',textContent:(tag&&tag.length<3?tag+' ':'')+b.amount}));
  e.style.setProperty('--pc',PCOL[b.player%PCOL.length]); let t=null,long=false;
  e.onpointerdown=()=>{ long=false; t=setTimeout(()=>{ long=true; gameTakeDown(b,true); },500); }; e.onpointerup=e.onpointerleave=e.onpointercancel=()=>clearTimeout(t);
  e.onclick=ev=>{ if(long){ long=false; ev.preventDefault(); return; } gameTakeDown(b,false); }; return e; }
function renderCraps(S,st,over){
  const who=betWho(st), sug=over?[]:GAMES.suggest(S,who), res=over?GAMES.result(S):null;
  if(over) GP.append(gel('div',{className:'gstat'},'Table closed: '+res.winners.map(i=>S.players[i]).join(' & ')+' finish'+(res.winners.length>1?'':'es')+' on top',gel('small',{textContent:res.ranking.map(r=>r.name+' '+r.total).join(' · ')})));
  else { GP.append(gel('div',{className:'gstat'},(S.players.length>1?S.players[st.player]+' shoots: ':'')+(st.stage==='point'?'point is '+st.point:'come-out roll')+(crapsHold()?' · bets open: tap Ready':''),gel('small',{textContent:(gameMsg||st.message||'')+(rollSum(st)!=null?' · total '+rollSum(st):'')})));
    const ar=gel('div',{className:'row chips'}); ar.append(gel('span',{textContent:'Chip'}));
    for(const c of [null,...st.chips]){ const on=(cbet.chip||null)===c, lab=(c==null?'Unit':String(c)), n=on?Math.max(1,cbet.n||1):1;
      const b=gel('button',{type:'button',className:'chipsel'+(on?' on':''),textContent:lab+(n>1?' ×'+n:''),ariaLabel:(c==null?'Add one unit per tap':'Add chips worth '+c)+(n>1?', '+n+' at a time':'')+'. Drag up or down to change how many',title:'Tap to choose. Drag up or down to add more per tap',ariaPressed:String(on),disabled:betsLocked()});
      let y0=null,n0=1,dragged=false; b.style.touchAction='none';
      b.onpointerdown=e=>{ y0=e.clientY; n0=(cbet.chip||null)===c?Math.max(1,cbet.n||1):1; dragged=false; try{b.setPointerCapture(e.pointerId);}catch{} };
      b.onpointermove=e=>{ if(y0==null) return; const dy=y0-e.clientY; if(!dragged&&Math.abs(dy)<12) return; dragged=true; cbet.chip=c; cbet.n=Math.max(1,Math.min(20,n0+Math.round(dy/16))); b.textContent=lab+(cbet.n>1?' ×'+cbet.n:''); };
      b.onpointerup=b.onpointercancel=()=>{ if(y0==null) return; y0=null; if(dragged) setTimeout(()=>renderGame(),0); };
      b.onclick=e=>{ if(dragged){ dragged=false; e.preventDefault(); return; } if((cbet.chip||null)!==c) cbet.n=1; cbet.chip=c; renderGame(); };
      ar.append(b); }
    if(S.players.length>1){ const ws=gel('select',{ariaLabel:'Betting as',onchange:()=>{ cbet.who=+ws.value; renderGame(); }}); S.players.forEach((n,i)=>ws.append(gel('option',{value:i,textContent:n,selected:i===who}))); ar.append(ws); }
    GP.append(ar);
    const R=(kind,number,on)=>sug.find(r=>r.kind===kind&&(number==null||r.number===number)&&(on==null||r.on===on));
    const spot=(r,label,pred,cls='',puck=false)=>{ const d=gel('div',{className:'spot '+cls}), sub=r?(r.pays?r.pays:''):'';
      d.append(gel('button',{type:'button',className:'sp',disabled:!r||!r.available||betsLocked(),ariaLabel:label+(r&&r.unit>1?' (units of '+r.unit+')':''),title:r?(r.note?r.note+'. ':'')+(r.pays?'Pays '+r.pays+'. ':'')+(r.unit>1?'Bet in units of '+r.unit+'. ':'')+r.help:'',onclick:()=>gameBet(r,cbet.chip)},label,gel('small',{textContent:sub})));
      const bs=st.bets.filter(pred); if(bs.length){ const k=gel('div',{className:'stks'}); for(const b of bs) k.append(chipStack(b,st,who)); d.append(k); }
      if(puck){ d.append(gel('span',{className:'puck',textContent:'ON'})); } return d; };
    const tbl=gel('div',{className:'ctab'}), grid=(n,...kids)=>{ const g=gel('div',{className:'g'+n}); g.append(...kids); return g; };
    const NUMS=[4,5,6,8,9,10], isNum=(b,n)=>b.number===n;
    tbl.append(grid(6,...NUMS.map(n=>spot(R('place',n),String(n),b=>(b.kind==='place'&&isNum(b,n))||((b.kind==='come'||b.kind==='dontCome')&&isNum(b,n)),'num',st.stage==='point'&&st.point===n))));
    tbl.append(grid(6,...[4,6,8,10].map(n=>spot(R('hardway',n),'H'+n,b=>b.kind==='hardway'&&isNum(b,n))),spot(R('bigSix'),'B6',b=>b.kind==='bigSix'),spot(R('bigEight'),'B8',b=>b.kind==='bigEight')));
    const cb=S.bets.filter(b=>b.player===who&&(b.kind==='come'||b.kind==='dontCome')&&b.number!=null), orows=sug.filter(r=>(r.kind==='comeOdds'||r.kind==='dontComeOdds')&&r.on!=null);
    if(orows.length) tbl.append(grid(Math.min(4,orows.length)||1,...orows.map(r=>spot(r,(r.kind==='comeOdds'?'Odds ':'Lay ')+r.number,b=>(b.kind==='comeOdds'||b.kind==='dontComeOdds')&&b.on===r.on))));
    tbl.append(grid(3,spot(R('come'),'Come',b=>b.kind==='come'&&b.number==null),spot(R('dontCome'),"Don't come",b=>b.kind==='dontCome'&&b.number==null),spot(R('field'),'Field',b=>b.kind==='field')));
    tbl.append(grid(2,spot(R('pass'),'Pass line',b=>b.kind==='pass'),spot(R('passOdds'),'Pass odds',b=>b.kind==='passOdds'),spot(R('dontPass'),"Don't pass",b=>b.kind==='dontPass'),spot(R('dontPassOdds'),'Lay odds',b=>b.kind==='dontPassOdds')));
    tbl.append(grid(4,...[['anySeven','Any 7'],['anyCraps','Any craps'],['two','2'],['three','3'],['eleven','11'],['twelve','12'],['horn','Horn']].map(([k,l])=>spot(R(k),l,b=>b.kind===k))));
    tbl.append(gel('div',{className:'ptxt'},gel('span',{className:'puck '+(st.stage==='point'?'on':'off'),textContent:st.stage==='point'?'ON':'OFF'}),st.stage==='point'?' puck on '+st.point:' puck off: come-out roll'));
    GP.append(tbl);
    GP.append(gel('button',{type:'button',textContent:cbet.rules?'Hide rules':'Rules',onclick:()=>{ cbet.rules=!cbet.rules; renderGame(); }}));
    if(cbet.rules){ const seen=new Set(), d=gel('div',{className:'rules'}); for(const r of sug){ if(seen.has(r.kind)) continue; seen.add(r.kind); d.append(gel('p',{},gel('b',{textContent:(['place','hardway'].includes(r.kind)?r.label.replace(/ \d+$/,'')+' bets':r.label)+(r.unit>1?' (units of '+r.unit+')':'')+': '}),r.help)); } GP.append(d); } }
  const tb=gel('table'), body=gel('tbody'); tb.append(gel('thead',{},gel('tr',{},gel('th',{textContent:'Player'}),gel('th',{textContent:'Bankroll'}),gel('th',{textContent:'On the table'}))));
  S.players.forEach((nm,p)=>{ const cur=p===st.player&&!over, tr=gel('tr'), on=st.bets.filter(b=>b.player===p).reduce((a,b)=>a+b.amount,0); tr.append(gel('td',{textContent:nm,className:cur?'cur':''}),gel('td',{textContent:String(st.bankrolls[p]),className:cur?'cur':''}),gel('td',{textContent:on?String(on):'',className:cur?'cur':''})); body.append(tr); });
  tb.append(body); GP.append(tb); }
function turnInfo(S,st){ const sm=rollSum(st), id=game.id, rd=(sm!=null?'Total '+sm+' · ':'')+(st.rounds?'Round '+st.round+' of '+st.rounds+' · ':'');
  if(id==='shutbox') return rd+'open tiles add up to '+st.openSum+' · lower wins';
  if(id==='shipcaptain') return rd+'roll '+Math.max(st.rollsUsed,0)+' of 3 · cargo '+st.cargo+(st.lock?' · '+['ship','captain','crew'].filter(k=>st.lock[k]!=null).join(', '):'');
  if(id==='bunco') return rd+'this turn '+(st.turnTotal||0);
  return 'Turn total '+st.turnTotal+' · first to '+st.target+(st.finalRound?' · final round':''); }
function gameCloseTiles(tiles){ const r=GAMES.act(game.state,{type:'score',tiles:[...tiles].sort((a,b)=>a-b)}); if(!r.ok){ gameMsg=r.error; renderGame(); return; } game.state=r.state; gtiles.clear(); gameMsg=''; clearHolds(); gameSync(); renderGame(); }
function renderTurn(S,st,over){
  const res=over?GAMES.result(S):null, farkle=game.id==='farkle', sug=farkle?GAMES.suggest(S):[];
  if(over) GP.append(gel('div',{className:'gstat'},'Game over: '+res.winners.map(i=>S.players[i]).join(' & ')+' win'+(res.winners.length>1?'':'s')+' with '+res.ranking[0].total,gel('small',{textContent:res.ranking.map(r=>r.name+' '+r.total).join(' · ')})));
  else GP.append(gel('div',{className:'gstat'},(S.players.length>1?S.players[st.player]+': ':'')+(st.message||'').replace(S.players[st.player]+': ',''),gel('small',{textContent:turnInfo(S,st)+(gameMsg?' · '+gameMsg:'')})));
  if(!over){
    if(game.id==='shutbox'){ const tg=gel('div',{className:'tiles'}); st.tiles.forEach((open,k)=>{ const n=k+1; tg.append(gel('button',{type:'button',className:'tile'+(open?'':' shut')+(gtiles.has(n)?' sel':''),textContent:String(n),disabled:!open||!st.canScore,ariaPressed:String(gtiles.has(n)),onclick:()=>{ if(gtiles.has(n)) gtiles.delete(n); else gtiles.add(n); renderGame(); }})); }); GP.append(tg);
      if(st.canScore){ const sum=[...gtiles].reduce((a,b)=>a+b,0), tot=st.dice?st.dice.reduce((a,b)=>a+b,0):0; GP.append(gel('div',{className:'row'},gel('button',{type:'button',textContent:gtiles.size?'Close '+[...gtiles].sort((a,b)=>a-b).join('+')+' = '+sum+' (need '+tot+')':'Pick tiles that add to '+tot,disabled:!gtiles.size,onclick:()=>gameCloseTiles(gtiles)})));
        const sg=GAMES.suggest(S); if(gprefs.suggest&&sg.length){ const box=gel('div',{className:'sugs'}); for(const r of sg) box.append(gel('button',{type:'button',className:r.best?'best':'',textContent:r.label,onclick:()=>gameCloseTiles(r.tiles)})); GP.append(box); } } }
    if(farkle&&st.canScore){ 
      if(gprefs.suggest&&sug.length){ const box=gel('div',{className:'sugs'}); for(const r of sug) box.append(gel('button',{type:'button',className:r.best?'best':'',textContent:r.label+' = '+r.points,onclick:()=>gameSetAside(r.slots)})); GP.append(box); } } }
  const tb=gel('table'), body=gel('tbody'); tb.append(gel('thead',{},gel('tr',{},gel('th',{textContent:'Player'}),gel('th',{textContent:game.id==='farkle'||game.id==='pig'?'Banked':'Score'}))));
  S.players.forEach((nm,p)=>{ const cur=p===st.player&&!over, tr=gel('tr'); tr.append(gel('td',{textContent:nm,className:cur?'cur':''}),gel('td',{textContent:String(st.scores[p]),className:cur?'cur':''})); body.append(tr); });
  tb.append(body); GP.append(tb); }
document.addEventListener('pd-open-games',()=>{ if(game){ game.setup=true; } if(roomNow()==='design') goPlay(); paneAuto=true; renderGame(); });   // the Games tab belongs to the Play room
{ const want=new URLSearchParams(location.search).get('game')||window.__PD_AUTOGAME; if(want&&keptGames().some(g=>g.id===want)){ gprefs.gameId=want; document.dispatchEvent(new CustomEvent('pd-open-games')); } }   // ?game=story opens the Games setup on that game (the shared artifact sets __PD_AUTOGAME)
window.__pd={resetUiState, setGravity, gravityY, get worldGravityY(){ return world?world.gravity.y:null; }, gravFromPos, gravToPos, GRAV:{LO:GRAV_LO,HI:GRAV_HI,DEF:GRAV_DEF,REAL:GRAV_REAL,OLD:GRAV_OLD,U_PER_M:GRAV_U_PER_M},get faceFixes(){return faceFixes;}, faceCheck, nudgeDie(i){ const d=dice[i], b=bodies[i], cur=readResult()[i].label; const f=d.faces.find((f,k)=>d.labs[k]!==cur); const q=new THREE.Quaternion().setFromUnitVectors(f.n.clone().normalize(),new THREE.Vector3(0,d.faces.length===4?-1:1,0)); b.quaternion.set(q.x,q.y,q.z,q.w); b.velocity.set(0,0,0); b.angularVelocity.set(0,0,0); },   // test hook: turn a settled die onto another face
  corruptFace(i,v){ recFaces[i]=v; }, get recFaces(){return recFaces;},get gprefs(){return gprefs;},renderGame,ROLL_DROP,flickVel,get rollHalf(){return rollHalf;},RING_COLORS,state,dockRoll,uScale:U.uScale,holdTop,get topBlend(){return topBlend;},get camera(){return camera;},key,BASE_KEY,SHAPES,SUBSTRATES,STONES,FONTS,views,orbit,canvas:cv,rig,fx,triggerFx,updateFx,rerollLeans,TABLE_Y,
  keepSum,fmtNotation,initOps,lookupTable,logText,designToJSON,loadDesign,parseBag,importBag,bagToJSON,bagFileJSON,bagOps,setOps,renderLog,botStep,botPump,gviewer,dieChip,renderDesignPicture,PIC_Q,picGear,picDie,bagActivate:activate,isModified,get bag(){return bag;},save,updateThumbs,get thumbs(){return thumbs;},get thumbBusy(){return thumbBusy;},get camBlend(){return camBlend;}, set camBlend(v){ camBlend=v; topBlend=0; table.visible=v>.01; table.material.opacity=v; },thumbKey,randomize,buildDice,applyLook,startRoll,exitRoll,undo,redo,snapshot,checkpoint,parseNotation,exportImage,setSubstrate,setStone,ensurePalette,setFull,setShake,
  get dice(){return dice;}, get leans(){return [...leanDice];}, finishRoll, drift(n){ for(let i=0;i<n;i++){ world.step(1/60); if(settled&&leanRings.length) refreshLeans(); } },   // what the live loop does after a roll has settled
  get held(){return [...held];}, reskinDie, dieMenu, dieScreen, crapsCallout, get heldPose(){return heldPose;}, get faces(){ return readResult().map(p=>p.label); }, get restoring(){return !!restoring;}, get restoreTries(){return restoreTries;}, GAMES, get game(){return game;}, startGame, endGame, gameScore, openGames(){ document.dispatchEvent(new CustomEvent('pd-open-games')); }, markLean(i){ leanDice[i]=true; showLeans(); updateHoldUI(); }, RING_COLORS, get holdRingsVisible(){return holdRings.filter(m=>m.visible).length;}, get leanRingCount(){return leanRings.length;}, bodyScreen(i){ const b=bodies[i].position, v=new THREE.Vector3(b.x,b.y,b.z).project(camera), r=cv.getBoundingClientRect(); return {x:r.left+(v.x+1)/2*r.width, y:r.top+(1-v.y)/2*r.height}; }, toggleHold, clearHolds, pickDie, get holdRings(){return holdRings.length;},
  get rollT(){return rollT;}, set rollT(v){ rollT=v; }, step(n=1){ simSteps(n); }, get bodies(){return bodies;}, get rolling(){return rolling;}, get placed(){return placed;}, get settled(){return settled;}, set settled(v){ settled=v; }, get dragging(){return dragging;}, get history(){return {idx:hIdx,length:history.length};},
  pause(){ renderer.setAnimationLoop(null); }, resume(){ clock.getDelta(); renderer.setAnimationLoop(loop); },
  renderOnce(dt=0){ camBlend=rolling?1:0; loop(0,dt); },                                  // one frame with the camera fully in the current view and no time passing
  setView({az,el,zoom}={}){ if(az!=null) orbit.az=az; if(el!=null) orbit.el=el; if(zoom!=null) state[rolling?'rollZoom':'zoom']=zoom; },
  simRoll({maxSteps=1500,rerolls=0}={}){ startRoll(); simSteps(maxSteps); const firstLeans=leanDice.filter(Boolean).length; let rr=0;   // the whole roll in fixed 1/60 s steps, synchronously
    for(;rr<rerolls&&leanDice.some(Boolean);rr++){ rerollLeans(); simSteps(maxSteps); }
    dice.forEach((d,i)=>{d.mesh.position.copy(bodies[i].position); d.mesh.quaternion.copy(bodies[i].quaternion);});
    return {settled,simT:rollT,firstLeans,rerolls:rr,leans:leanDice.filter(Boolean).length,freeTries,rollHalf:{...rollHalf},tableY:TABLE_Y,result:$('result').textContent,main:$('result').firstChild?.textContent??'',
      dice:settled?readResult().map((p,i)=>({name:dice[i].name,label:p.label,flat:p.flat,pos:bodies[i].position.toArray()})):[]}; },
  reseed(n){ rng=mulberry32(n); },                                                    // restart the app RNG without a reload (shared-page tests)
  memory(){ return {...renderer.info.memory, programs:(renderer.info.programs||[]).length, calls:renderer.info.render.calls, triangles:renderer.info.render.triangles}; }, buildDice, makeAtlas, get sfx(){ return sfx; }, audioInit, SB, playImpactNow, makeLimiter, hardnessFor, MAT_HARD, ringFor, RING, GLASS_FM, makeSpatial, rollTick, setSoundBackend, get soundBackend(){ return sfx.bk; }};
window.__dice=window.__pd;   // old name
