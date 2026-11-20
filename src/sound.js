// Sound: Web Audio synthesis, the sound backends (classic, procedural, Kenney and Best-of samples, blend) and the metal/glass ring (4.1 factoring step S10, PD-168). Moved from src/main.js without changes except where it reads main's live state:
// main calls initSound({state, camera, TABLE_Y, $, save, live}) once, at the place the section used to run. state/camera/TABLE_Y/$/save are main's own objects (not copies); live has getters for the roll variables main reassigns (placing, rolling, settled, bodies, dice).
import * as THREE from 'three';
import { GLASS_FM, MAT_HARD, RING } from './sound-tables.js';

let state, camera, TABLE_Y, $, save, live;
/* ---------- sound: everything is synthesised with Web Audio, no audio files ---------- */
export const sfx={ctx:null,master:null,trim:null,spat:null,rings:0,bk:'classic',noise:null,voices:0,count:0,last:0};
function keepAudible(){     // iPhone: with the ring/silent switch on, Web Audio is muted unless the page holds a 'playback' audio session
  try{ if(navigator.audioSession&&navigator.audioSession.type!=='playback') navigator.audioSession.type='playback';   // iOS 16.4+
    if(sfx.hold||!IS_IOS) return;     // belt and braces on iOS: a looping silent clip also moves the page onto the media channel (older iOS, or when the session API is not allowed, e.g. in a sandboxed frame)
    const n=800, v=new Uint8Array(44+n), dv=new DataView(v.buffer), w=(o,t)=>[...t].forEach((c,k)=>v[o+k]=c.charCodeAt(0));
    w(0,'RIFF'); dv.setUint32(4,36+n,true); w(8,'WAVEfmt '); dv.setUint32(16,16,true); dv.setUint16(20,1,true); dv.setUint16(22,1,true); dv.setUint32(24,8000,true); dv.setUint32(28,8000,true); dv.setUint16(32,1,true); dv.setUint16(34,8,true); w(36,'data'); dv.setUint32(40,n,true);
    v.fill(128,44);
    const a=new Audio('data:audio/wav;base64,'+btoa(String.fromCharCode(...v))); a.loop=true; a.setAttribute('playsinline',''); a.play().catch(()=>{}); sfx.hold=a;   // data: URI, because blob: media is blocked in artifact frames
  }catch{} }
const IS_IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
/* limiter: a fast compressor catches the sum of overlapping hits, then a soft clipper (linear below 0.7, rounded above) catches whatever overshoots before the compressor reacts. Output never exceeds 1.0. */
export function makeLimiter(ctx){ const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-9; comp.knee.value=0; comp.ratio.value=20; comp.attack.value=.001; comp.release.value=.12;
  const sh=ctx.createWaveShaper(), n=2048, c=new Float32Array(n); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1, a=Math.abs(x); c[i]=Math.sign(x)*(a<.7?a:.7+.3*Math.tanh((a-.7)/.3)); } sh.curve=c; sh.oversample='2x'; comp.connect(sh); return {input:comp,output:sh,comp}; }
export function audioInit(){
  keepAudible();
  if(sfx.ctx){ if(sfx.ctx.state!=='running') sfx.ctx.resume().catch(()=>{}); return sfx.ctx; }   // 'suspended' or iOS 'interrupted'
  try{ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null; const ctx=new AC(); sfx.ctx=ctx;
    sfx.master=ctx.createGain(); sfx.master.connect(ctx.destination); sfx.trim=ctx.createGain(); const lim=makeLimiter(ctx); sfx.limiter=lim.comp; sfx.trim.connect(lim.input); lim.output.connect(sfx.master);   // trim: per-backend loudness match, then the limiter so many overlapping hits cannot clip
    const buf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate), d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; sfx.noise=buf;
    setVolume(); applyTrim(); SB[sfx.bk].activate(); if(ctx.state!=='running') ctx.resume().catch(()=>{});
  }catch{ sfx.ctx=null; } return sfx.ctx;
}
export function audioStatus(){ const c=sfx.ctx; return 'audio '+(c?c.state:'not started')+(navigator.audioSession?', session '+navigator.audioSession.type:'')+(sfx.hold&&!sfx.hold.paused?', silent-mode bypass on':'')+(state.sound?'':', sound is off')+(IS_IOS?'. No sound? Check the ring/silent switch.':''); }
export function playBlip(quiet){   // a short tick played inside the tap itself: the most reliable way to start audio on iOS. Audible for the Test sound button; silent (quiet) when sound is switched on, so enabling sound makes no noise
  const ctx=audioInit(); if(!ctx) return; setVolume(); sfx.lastBlip={quiet:!!quiet};
  const go=()=>voice(.3,(c,out,t)=>{ const o=c.createOscillator(), g=c.createGain(); o.type='sine'; o.frequency.setValueAtTime(720,t); o.frequency.exponentialRampToValueAtTime(360,t+.14); g.gain.setValueAtTime(quiet?.0001:.45,t); g.gain.exponentialRampToValueAtTime(.001,t+.22); if(quiet) g.gain.setValueAtTime(0,t+.0011); o.connect(g); g.connect(out); o.start(t); o.stop(t+.25); });
  if(ctx.state==='running') go(); else ctx.resume().then(go).catch(()=>{}); }
export function setVolume(){ if(sfx.master) sfx.master.gain.value=state.sound?Math.pow(state.volume,1.6):0; }
const audioReady=()=>state.sound&&sfx.ctx&&sfx.ctx.state==='running'&&state.volume>0;
function voice(dur,build){ const ctx=sfx.ctx; if(sfx.voices>22) return; sfx.voices++; const out=ctx.createGain(); out.connect(sfx.spat||sfx.trim); build(ctx,out,ctx.currentTime); setTimeout(()=>{ sfx.voices--; try{out.disconnect();}catch{} },dur*1000+80); }
function noiseHit(ctx,out,t,freq,q,gain,dur,type='bandpass'){ const src=ctx.createBufferSource(); src.buffer=sfx.noise; const f=ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q;
  const g=ctx.createGain(); g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(.0008,t+dur); src.connect(f); f.connect(g); g.connect(out); src.start(t,Math.random()*.5,dur+.02); }
export function tone(ctx,out,t,type,f0,f1,gain,dur,delay=0){ const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f0,t+delay); if(f1!==f0) o.frequency.exponentialRampToValueAtTime(f1,t+delay+dur);
  g.gain.setValueAtTime(.0001,t+delay); g.gain.linearRampToValueAtTime(gain,t+delay+.006); g.gain.exponentialRampToValueAtTime(.0004,t+delay+dur); o.connect(g); g.connect(out); o.start(t+delay); o.stop(t+delay+dur+.05); }
export function onImpact(speed,kind,pos){ if(live.placing) return;
  sfx.count++; if(!audioReady()||speed<.8) return; const now=performance.now(); if(now-sfx.last<10) return; sfx.last=now;
  playImpactNow(speed,kind,pos);
}
// Spatial (stereo only, no HRTF): pan follows where the impact is on screen through the active camera, level and brightness follow its distance from the camera.
// state.spatialWidth 0 = mono (the old sound), 1 = full. makeSpatial returns an input node for this impact's voices (sfx.spat while they are created), or null for mono.
const _sp=new THREE.Vector3();
export function makeSpatial(pos){ const W=Math.max(0,Math.min(1,state.spatialWidth||0)); if(!pos||!(W>0)||!sfx.ctx||!sfx.ctx.createStereoPanner) return null;
  _sp.copy(pos).project(camera); if(_sp.z>1) return null;   // behind the camera
  const ctx=sfx.ctx, d=camera.position.distanceTo(pos), ref=camera.position.length()||1, r=(d-ref)/ref, inp=ctx.createGain(), lp=ctx.createBiquadFilter(), pan=ctx.createStereoPanner();
  inp.gain.value=Math.max(.55,Math.min(1.2,1-r*1.5*W)); lp.type='lowpass'; lp.frequency.value=Math.max(4000,Math.min(20000,18000*Math.pow(2,-r*3*W))); lp.Q.value=.5;
  pan.pan.value=Math.max(-1,Math.min(1,_sp.x*.8*W+(Math.random()-.5)*.08*W)); inp.connect(lp); lp.connect(pan); pan.connect(sfx.trim);
  return {input:inp, pan:pan.pan.value, gain:inp.gain.value, cutoff:lp.frequency.value, release(){ setTimeout(()=>{ try{ inp.disconnect(); lp.disconnect(); pan.disconnect(); }catch{} },2500); }}; }
export function playImpactNow(speed,kind,pos){ const sp=makeSpatial(pos); sfx.spat=sp?sp.input:null;
  try{ SB[sfx.bk].impact(speed,kind); ringFor(kind,speed); } finally{ sfx.spat=null; if(sp) sp.release(); } }   // the metal/glass ring layer sits on top of every sound set, so they compare fairly
function classicImpact(speed,kind){
  const g=Math.min(1,Math.pow(speed/14,.8))*.9, sub=state.substrate, metal=sub==='metal', stone=sub==='marble', heavy=sub==='epoxy', dice=kind==='dice', r=()=>.85+Math.random()*.3;
  voice(.3,(ctx,out,t)=>{
    if(stone){                                                   // stone: very crisp, hard and short
      if(dice){ noiseHit(ctx,out,t,5200*r(),3.2,g*.95,.014); noiseHit(ctx,out,t+.004*r(),3400*r(),2.6,g*.5,.02); tone(ctx,out,t,'square',2600*r(),1500,g*.05,.012); }
      else { noiseHit(ctx,out,t,4300*r(),2.8,g*.7,.016); noiseHit(ctx,out,t,420*r(),.7,g*.22,.06,'lowpass'); tone(ctx,out,t,'sine',105*r(),52,g*.16,.06); }
    } else if(dice){                                             // die on die: a dry, quick clack (two tiny strikes a few ms apart)
      noiseHit(ctx,out,t,(heavy?2600:3600)*r(),2.2,g*.85,.022);
      noiseHit(ctx,out,t+.006*r(),(heavy?1800:2500)*r(),1.8,g*.5,.03);
      tone(ctx,out,t,'triangle',1500*r(),700,g*.07,.025);
    } else {                                                     // die on table: short clack on top, muffled low thud underneath
      noiseHit(ctx,out,t,(heavy?1700:2300)*r(),1.6,g*.55,.03);
      noiseHit(ctx,out,t,(metal?260:380)*r(),.7,g*(metal?.4:.28),metal?.1:.07,'lowpass');
      tone(ctx,out,t,'sine',(metal?72:95)*r()*(heavy?.85:1),metal?36:48,g*(metal?.34:.2),metal?.12:.07);   // metal: deeper, weightier
    }
    if(metal){ for(let i=0;i<2;i++) noiseHit(ctx,out,t+Math.random()*.004,(4200+Math.random()*3800),9+Math.random()*10,g*.14,.03+Math.random()*.025);
      const f=2300*r(); tone(ctx,out,t,'sine',f,f*.98,g*.05,.09); tone(ctx,out,t,'sine',f*2.41,f*2.38,g*.025,.06); }       // a tiny, quickly-damped ring in the clack
  });
}
export function playChime(j){ if(audioReady()) SB[sfx.bk].chime(j); }
function classicChime(j){ const m=Math.pow(2,j*2/12);
  voice(1.4,(ctx,out,t)=>{ [659.25,830.6,987.8,1318.5].forEach((f,i)=>{ tone(ctx,out,t,'triangle',f*m,f*m,.14,.9,i*.07); tone(ctx,out,t,'sine',f*m*2,f*m*2,.05,.7,i*.07); }); }); }
export function playFumble(){ if(audioReady()) SB[sfx.bk].fumble(); }
function classicFumble(){
  voice(1,(ctx,out,t)=>{ tone(ctx,out,t,'sine',150,42,.55,.7,.05); tone(ctx,out,t,'triangle',220,110,.12,.5,.0); noiseHit(ctx,out,t,300,.8,.3,.25); }); }
// Rolling sound: no continuous noise bed (it sounded like wind on a phone microphone). Instead each die in contact with the mat ticks softly every time it turns about one face edge,
// through the normal impact path, so the ticks use the sample sets, follow the surface hardness and pan with the die. rollTick returns how many ticks a die owes this frame (rough on purpose).
export function rollTick(b,name,dt){ if(b.position.y>TABLE_Y+1.3) return 0; const w=b.angularVelocity.length(), v=Math.hypot(b.velocity.x,b.velocity.z); if(w<1.5&&v<.6) return 0;
  const F=parseInt(String(name).replace(/\D/g,''))||10, edge=2*Math.PI/(1.6*Math.sqrt(F));   // radians per face edge: about 92 degrees on a d6, 50 on a d20
  b._roll=(b._roll||0)+(w+v*.6)*Math.min(dt,.05); let n=0; while(n<2&&b._roll>=edge){ b._roll-=edge*rndr(.8,1.25); n++; } return n; }
const _rp=new THREE.Vector3();
export function updateRolling(dt){ if(!state.rumble||!live.rolling||live.settled||!live.bodies.length||!audioReady()) return;
  for(let i=0;i<live.bodies.length;i++){ const b=live.bodies[i], n=rollTick(b,live.dice[i]&&live.dice[i].name,dt); if(!n) continue; const w=b.angularVelocity.length(), v=Math.hypot(b.velocity.x,b.velocity.z);
    for(let k=0;k<n;k++){ _rp.set(b.position.x,TABLE_Y,b.position.z); onImpact(Math.min(4,.9+.4*w+.3*v)*rndr(.75,1.2),'table',_rp); } } }

/* ---------- sound backends (PD-114): the physics and UI call onImpact / playChime / playFumble / updateRolling, which hand off to the active backend in SB.
   A backend is {label, trim, activate(), impact(speed,kind), chime(j), fumble()}. Switch live with setSoundBackend(id), the settings dropdown or ?sound=id.
     classic : the original synth (kept as the baseline and the last-resort fallback)
     proc    : new procedural synth (modal strikes per material, grainy rolling)
     kenney  : samples, everything from the Kenney CC0 packs        (sounds/kenney/manifest.json)
     best    : samples, best clip per role from any library         (sounds/best/manifest.json)
   Sample backends fall back to proc for any role they have no clip for, so a missing or broken manifest never means silence. ---------- */
const SURFACES=['felt','carpet','leather','cardboard','wood','plastic','stone','metal','glass'];
const pairHard=(a,b)=>2*a*b/(a+b+1e-6);
export function hardnessFor(kind,speed){ const die=MAT_HARD[matClass(state.substrate)]||.45, other=kind==='dice'?die:(MAT_HARD[state.surfaceMat]||.05), g=Math.min(1,Math.pow(speed/14,.8));
  return Math.max(0,Math.min(1,pairHard(die,other)+(g-.5)*.3+(kind==='dice'?.08:0)+rndr(-.1,.1))); }
const matClass=sub=>sub==='metal'?'metal':sub==='marble'?'stone':sub==='epoxy'?'resin':'plastic';
const rndr=(a,b)=>a+Math.random()*(b-a);
// procedural recipes. hit = noise-excited resonators [Hz, Q, gain, decay s]; ring = tiny undamped-ish sine partials [Hz, gain, decay s]; thud = low body {f, g, d}
const PROC={
  die:{ plastic:{hit:[[3300,10,.9,.025],[5200,12,.6,.02],[2400,6,.4,.03]]},  resin:{hit:[[2500,9,.9,.03],[3900,10,.5,.024],[1800,5,.4,.035]]},
        metal:{hit:[[3800,14,.7,.03],[6200,16,.4,.025]], ring:[[2300,.05,.1],[5550,.03,.07],[3300,.04,.09]]}, stone:{hit:[[5200,14,.95,.014],[3400,10,.5,.02],[7600,18,.3,.012]]} },
  table:{ plastic:{hit:[[2100,3,.7,.03],[1300,2,.5,.045]], thud:{f:110,g:.3,d:.07}},  resin:{hit:[[1700,3,.7,.035],[1000,2,.5,.05]], thud:{f:90,g:.36,d:.08}},
        metal:{hit:[[2500,6,.5,.03],[1500,3,.4,.04]], thud:{f:70,g:.4,d:.12}, ring:[[2300,.05,.1],[5550,.03,.07],[3300,.04,.09]]}, stone:{hit:[[4300,4,.85,.016],[2900,3,.5,.02]], thud:{f:105,g:.15,d:.05}} } };
function strike(ctx,out,t,rec,gain,bright){
  for(const [f,q,g,d] of rec.hit){ const s=ctx.createBufferSource(); s.buffer=sfx.noise; const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=f*bright*rndr(.93,1.07); bp.Q.value=q*rndr(.85,1.2);
    const e=ctx.createGain(); e.gain.setValueAtTime(g*gain*1.8,t); e.gain.exponentialRampToValueAtTime(.0008,t+d); s.connect(bp); bp.connect(e); e.connect(out); s.start(t,Math.random()*.6,d+.02); }
  if(rec.thud) tone(ctx,out,t,'sine',rec.thud.f*rndr(.9,1.1),rec.thud.f*.5,rec.thud.g*gain,rec.thud.d);
  if(rec.ring) for(const [f,g,d] of rec.ring){ const ff=f*rndr(.97,1.03); tone(ctx,out,t,'sine',ff,ff*.99,g*gain,d); } }
const procBackend={ label:'Procedural synth', trim:1, activate(){},
  impact(speed,kind){ const g=Math.min(1,Math.pow(speed/14,.8))*.9, rec=PROC[kind==='dice'?'die':'table'][matClass(state.substrate)], bright=(.8+.4*g)*(.6+.8*hardnessFor(kind,speed));   // harder pairing: brighter strike
    voice(.35,(ctx,out,t)=>{ strike(ctx,out,t,rec,g,bright); if(g>.5&&Math.random()<.35) strike(ctx,out,t+rndr(.004,.011),rec,g*.45,bright*1.05); }); },
  chime(j){ const m=Math.pow(2,j*2/12); voice(1.6,(ctx,out,t)=>{ [[659.25,1],[830.6,1],[987.8,1],[1318.5,1]].forEach(([f,],i)=>{ const dl=i*.07;
      tone(ctx,out,t,'sine',f*m,f*m,.13,1.1,dl); tone(ctx,out,t,'sine',f*m*2.76,f*m*2.76,.04,.5,dl); tone(ctx,out,t,'sine',f*m*5.4,f*m*5.4,.018,.25,dl); }); }); },
  fumble(){ voice(1,(ctx,out,t)=>{ tone(ctx,out,t,'sine',150,42,.55,.7,.05); noiseHit(ctx,out,t,300,.8,.3,.25); noiseHit(ctx,out,t+.12,180,.6,.18,.3,'lowpass'); }); } };

// sound files: embedded as base64 in window.__SOUNDS by scripts/build-static.py (offline and artifact builds), otherwise fetched from sounds/
async function soundBytes(path){ const E=window.__SOUNDS; if(E){ if(!E[path]) throw new Error('not embedded: '+path); const bin=atob(E[path]), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u.buffer; }
  const r=await fetch('sounds/'+path); if(!r.ok) throw new Error('no '+path+' ('+r.status+')'); return r.arrayBuffer(); }
// metal and glass ring: struck metal and glass sing, which brightness alone cannot give. A few decaying sine partials ride on top of the sample hit.
// "ringLevel" 0..1 -> peak strength ringLevel*0.08 at full impact speed. The ring is always applied and its strength is proportional to impact speed (v = speed/14, capped at 1), so over a roll the average is about half the peak:
// the range is doubled to compensate (50% = the sweet spot the owner found earlier, which used a sparser gate). Returns the total ring strength started (0 = none).
// Glass is an FM voice (GLASS_FM); metal uses additive partials (RING).
function ringFM(strength,v,t){ if(sfx.rings>=8) return 0; const ctx=sfx.ctx, life=.6+.6*v; sfx.rings++; const out=ctx.createGain(), lp=ctx.createBiquadFilter(); out.gain.value=strength; lp.type='lowpass'; lp.frequency.value=7000; lp.Q.value=.5; out.connect(lp); lp.connect(sfx.spat||sfx.trim); let end=0;
  for(const [fc0,ratio,idx,idxDec,ampDec,gn] of GLASS_FM){ const fc=fc0*rndr(.97,1.03), car=ctx.createOscillator(), mod=ctx.createOscillator(), mg=ctx.createGain(), e=ctx.createGain(), depth=idx*fc*ratio*Math.min(1,v*1.4+.2);   // harder hits brighten the attack
    car.frequency.value=fc; mod.frequency.value=fc*ratio; mg.gain.setValueAtTime(depth,t); mg.gain.exponentialRampToValueAtTime(Math.max(1,depth*.02),t+idxDec); mod.connect(mg); mg.connect(car.frequency);
    e.gain.setValueAtTime(0,t); e.gain.linearRampToValueAtTime(gn,t+.003); e.gain.exponentialRampToValueAtTime(.0005,t+ampDec*life); car.connect(e); e.connect(out); car.start(t); mod.start(t); car.stop(t+ampDec*life+.05); mod.stop(t+ampDec*life+.05); end=Math.max(end,ampDec*life); }
  setTimeout(()=>{ sfx.rings--; try{out.disconnect();lp.disconnect();}catch{} },(end+.2)*1000); return 1; }
function ringAdditive(m,strength,v,t){ if(sfx.rings>=8) return 0; const ctx=sfx.ctx, [f0,amp,ratio,gain,dec,lpHz,atk]=RING[m]; sfx.rings++; const out=ctx.createGain(), lp=ctx.createBiquadFilter(); out.gain.value=strength; lp.type='lowpass'; lp.frequency.value=lpHz; lp.Q.value=.5; out.connect(lp); lp.connect(sfx.spat||sfx.trim);   // lowpass takes the edge off
  const base=f0*rndr(.97,1.03), life=.6+.6*v;
  ratio.forEach((r,i)=>{ const a=gain[i]*(i?Math.min(1,v*1.4):1), f=base*r*rndr(.99,1.01); if(a<.02||f>16000) return; const o=ctx.createOscillator(), e=ctx.createGain(); o.frequency.value=f;   // harder hits also wake the upper partials
    e.gain.setValueAtTime(0,t); e.gain.linearRampToValueAtTime(a,t+atk); e.gain.exponentialRampToValueAtTime(.0005,t+dec[i]*life); o.connect(e); e.connect(out); o.start(t); o.stop(t+dec[i]*life+.05); });
  setTimeout(()=>{ sfx.rings--; try{out.disconnect();lp.disconnect();}catch{} },(dec[0]*life+.2)*1000); return 1; }
export function ringFor(kind,speed,when=0){ const E=Math.min(1,state.ringLevel)*.08; if(!sfx.ctx||!(E>0)) return 0;   // callers have already checked audioReady()
  const rings=new Set(); if(RING[matClass(state.substrate)]) rings.add(matClass(state.substrate)); if(kind==='table'&&RING[state.surfaceMat]) rings.add(state.surfaceMat);   // the die rings, and so does the surface it lands on
  const t=sfx.ctx.currentTime+when, v=Math.min(1,speed/14); let total=0;
  for(const m of rings){ const strength=RING[m][1]*E*v*rndr(.7,1.1); total+=strength;
    if(m==='glass') ringFM(strength,v,t); else ringAdditive(m,strength,v,t); }
  return total; }
// sample backends: manifest {trim, impact:{dice:[..],table:[..],plastic|resin|metal|stone:[..]}, chime:[..], fumble:[..], roll:"loop.ogg"}; files are relative to sounds/<id>/
function sampleBackend(id,label){
  const b={ label, id, trim:1, samples:true, man:null, bufs:{}, state:'idle', note:'', last:{}, loop:null,
    activate(){ if(b.state==='idle'&&sfx.ctx) b.load(); },
    async load(){ if(b.state!=='idle') return; b.state='loading'; b.note='loading…'; sbStatus();
      try{ b.man=JSON.parse(new TextDecoder().decode(await soundBytes(id+'/manifest.json'))); b.trim=b.man.trim||1;
        const files=new Set(); const add=v=>[].concat(v||[]).forEach(f=>files.add(f)); Object.values(b.man.impact||{}).forEach(add); add(b.man.chime); add(b.man.fumble); add(b.man.roll);
        let bad=0; await Promise.all([...files].map(async f=>{ try{ b.bufs[f]=await sfx.ctx.decodeAudioData(await soundBytes(id+'/'+f)); }catch{ bad++; } }));
        b.state='ready'; b.note=(files.size-bad)+' clips loaded'+(bad?', '+bad+' failed (synth fills in)':''); if(sfx.bk===id) applyTrim();
      }catch(e){ b.state='failed'; b.note='no samples ('+(e.message||e)+'): using procedural synth'; } sbStatus(); },
    pick(list){ const L=(list||[]).filter(f=>b.bufs[f]); if(!L.length) return null; let i=Math.floor(Math.random()*L.length); const k=L.join(); if(L.length>1&&i===b.last[k]) i=(i+1)%L.length; b.last[k]=i; return b.bufs[L[i]]; },
    play(buf,gain,rate,d=0){ voice(buf.duration/rate+.05,(ctx,out,t)=>{ const s=ctx.createBufferSource(); s.buffer=buf; s.playbackRate.value=rate*(1+d*.1); const g=ctx.createGain(); g.gain.value=gain; let tail=g; s.connect(g);
      if(Math.abs(d)>.04){ const f=ctx.createBiquadFilter();                                          // the clip is not as hard as wanted: darken it (lowpass) or brighten it (high shelf)
        if(d<0){ f.type='lowpass'; f.frequency.value=12000*Math.pow(2,d*4.5); f.Q.value=.7; } else { f.type='highshelf'; f.frequency.value=3500; f.gain.value=Math.min(8,d*14); } g.connect(f); tail=f; }
      tail.connect(out); s.start(t); }); },
    cands(speed,kind){ const man=b.man; if(!man||b.state!=='ready') return []; const im=man.impact||{}, files=[...new Set([...(im.dice||[]),...(im.table||[])])].filter(f=>b.bufs[f]); if(!files.length) return [];
      const g=Math.min(1,Math.pow(speed/14,.8)), T=20*Math.log10(g), h=hardnessFor(kind,speed), meta=man.meta||{};
      return files.map(f=>{ const m=meta[f]||{}, cl=m.clack==null?.5:m.clack, db=m.db||0; return {b,f,cl,db,T,h,cost:Math.abs(cl-h)+.6*Math.abs(db-T)/30}; }); },
    playPick(c,k){ const near=c.slice().sort((x,y)=>x.cost-y.cost).slice(0,Math.min(3,c.length)); let p=near[Math.floor(Math.random()*near.length)]; if(near.length>1&&p.f===p.b.last.imp) p=near[(near.indexOf(p)+1)%near.length];
      p.b.last.imp=p.f; p.b.lastPick=p.f; p.b.play(p.b.bufs[p.f],Math.max(.25,Math.min(1.3,Math.pow(10,(p.T-p.db)/20)))*.9*k,rndr(.96,1.04),p.h-p.cl); },
    impact(speed,kind,k=1){ const c=b.cands(speed,kind); if(!c.length) return procBackend.impact(speed,kind); b.playPick(c,k); },
    chime(j){ const buf=b.pick(b.man&&b.man.chime); if(!buf) return procBackend.chime(j); b.play(buf,.8,Math.pow(2,j*2/12)); },
    fumble(){ const buf=b.pick(b.man&&b.man.fumble); if(!buf) return procBackend.fumble(); b.play(buf,.8,1); } };
  return b; }
// blend: mixes the two sample sets. state.soundMix 0 = Best only (bright, clacky), 1 = Kenney only (dark, rich).
// 'random' plays each hit from one set, chosen with probability = mix; 'layer' plays every hit from both at equal-power gains.
const mixBackend={ label:'Blend: Best + Kenney', trim:1, samples:true, activate(){ SB.best.activate(); SB.kenney.activate(); },
  impact(speed,kind){ const p=Math.max(0,Math.min(1,state.soundMix));
    if(state.soundMixMode==='layer'){ const kg=Math.sin(p*Math.PI/2), bg=Math.cos(p*Math.PI/2); if(bg>.02) SB.best.impact(speed,kind,bg); if(kg>.02) SB.kenney.impact(speed,kind,kg); }
    else if(state.soundMixMode==='auto'){ const c=[...SB.best.cands(speed,kind),...SB.kenney.cands(speed,kind)]; if(c.length) c[0].b.playPick(c,1); else procBackend.impact(speed,kind); }   // both sets as one pool, chosen by hardness alone
    else (Math.random()<p?SB.kenney:SB.best).impact(speed,kind); },
  chime:classicChime, fumble:classicFumble };   // the stingers stay on the classic synth until they get samples of their own
export const SB={ classic:{label:'Classic synth', trim:1, activate(){}, impact:classicImpact, chime:classicChime, fumble:classicFumble},
  proc:procBackend, mix:mixBackend, kenney:sampleBackend('kenney','Kenney samples'), best:sampleBackend('best','Best-of samples') };
function applyTrim(){ if(sfx.trim) sfx.trim.gain.value=SB[sfx.bk].trim||1; }
function mixUI(){ const r=$('sndmixrow'); if(r) r.hidden=sfx.bk!=='mix'; }
function sbStatus(){ mixUI(); const el=$('sndbkstat'); if(!el) return; const b=SB[sfx.bk]; el.textContent=b.note||''; }
export function setSoundBackend(id,persist){ if(!SB[id]) id='classic';   sfx.bk=id; state.soundBk=id; if(persist) save(); applyTrim(); if(sfx.ctx) SB[id].activate(); if($('sndbk')) $('sndbk').value=id; sbStatus(); return id; }
function auditionSound(){ const ctx=audioInit(); if(!ctx) return; setVolume(); const go=()=>{ SB[sfx.bk].activate(); const hits=[[3,'table',0],[6,'table',.22],[11,'dice',.4],[8,'table',.55],[14,'table',.7],[5,'dice',.78],[9,'dice',.86],[4,'table',1.05],[2.5,'table',1.3]];
    hits.forEach(([sp,k,d],i)=>setTimeout(()=>playImpactNow(sp,k,new THREE.Vector3((i/(hits.length-1)*2-1)*1.6,TABLE_Y,0)),d*1000)); setTimeout(()=>SB[sfx.bk].chime(2),1700); setTimeout(()=>SB[sfx.bk].fumble(),3100); };
  if(ctx.state==='running') go(); else ctx.resume().then(go).catch(()=>{}); }
export const wrapAudioInit=w=>{ audioInit=w; };   // the lag monitor (main.js) replaces audioInit with a timed wrapper; the module's own callers must reach it too
export function initSound(env){ ({state,camera,TABLE_Y,$,save,live}=env);
{ const q=new URLSearchParams(location.search).get('sound'); if(q&&SB[q]) state.soundBk=q; if(!SB[state.soundBk]) state.soundBk='classic'; sfx.bk=state.soundBk;
  const sel=$('sndbk'); if(sel){ sel.innerHTML=Object.entries(SB).map(([k,v])=>'<option value="'+k+'">'+v.label+'</option>').join(''); sel.value=sfx.bk; sel.onchange=e=>{ setSoundBackend(e.target.value,true); }; }
  const aud=$('sndaud'); if(aud) aud.onclick=auditionSound;
  const sf=$('sndsurf'); if(sf){ sf.innerHTML=SURFACES.map(k=>'<option value="'+k+'">'+k+'</option>').join(''); if(!MAT_HARD[state.surfaceMat]) state.surfaceMat='felt'; sf.value=state.surfaceMat; sf.onchange=()=>{ state.surfaceMat=sf.value; save(); }; }
  const sw=$('sndwidth'); if(sw){ sw.value=state.spatialWidth; sw.oninput=()=>{ state.spatialWidth=+sw.value; save(); }; }
  const rg=$('sndring'); if(rg){ rg.value=state.ringLevel; rg.oninput=()=>{ state.ringLevel=+rg.value; save(); }; }
  const mx=$('sndmix'), md=$('sndmixmode'); if(mx){ mx.value=state.soundMix; mx.oninput=()=>{ state.soundMix=+mx.value; save(); }; } if(md){ md.value=state.soundMixMode; md.onchange=()=>{ state.soundMixMode=md.value; save(); }; } mixUI(); }
}
