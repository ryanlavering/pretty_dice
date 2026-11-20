// Story dice (spike, PD-160): a stable, seeded glyph deal for a set of dice, and a plausible-at-surface-level sentence generator. Pure ES module, no DOM.
// The trick: two overlaid random picks from small pools (which glyph is on which face; which word and which pattern a glyph gets) read as "good enough for infinity".
import { PACKS } from './story-packs.js';

/* Glyph packs (plug-in glyph sets, chosen a la carte at game setup). Every glyph id is 'pack:name' so packs never clash. A glyph has a path and a viewBox (vb); tier c/o/s is set only in the hand-written packs. */
export const PACK_LIST=PACKS.map(({glyphs,...m})=>({...m,count:glyphs.length}));
export const GLYPHS=PACKS.flatMap(p=>p.glyphs.map(g=>({...g,id:p.id+':'+g.id,pack:p.id,name:g.id})));   // one name per export const: build-static.py inlines only the first name of a multi-name declaration
export const GLYPH_BY_ID=new Map(GLYPHS.map(g=>[g.id,g]));
export const poolFor=(packIds)=>{ const want=new Set(packIds); return GLYPHS.filter(g=>want.has(g.pack)); };
export const DEFAULT_PACKS=['noto'];
export const MAX_DICE=9;
export const MIN_DICE=3;

/* ---- seeding ---- */
export function hash32(str){ let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
export function rng(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
const shuffled=(arr,r)=>{ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const pick=(arr,r)=>arr[Math.floor(r()*arr.length)];

/* The set fingerprint: the dice (face count and design id, in order) plus an optional salt (the set name). Same set -> same glyphs on the same faces, on every device. */
export const fingerprint=(dice,salt='',packIds=DEFAULT_PACKS)=>'story2|'+salt+'|'+[...packIds].sort().join('+')+'|'+dice.map(d=>`${d.faces}${d.design?'@'+d.design:''}`).join(',');

/* Deal glyphs to faces: shuffle the whole pool with the fingerprint's seed, then hand out consecutive runs, so every face of every die has its own glyph.
   dice: [{faces}] -> [[glyphId x faces] per die]. Throws if the set needs more faces than the pool holds. */
export function dealGlyphs(dice,fp=fingerprint(dice),pool=poolFor(DEFAULT_PACKS)){
  if(dice.length<MIN_DICE||dice.length>MAX_DICE) throw new Error(`Story dice need ${MIN_DICE}-${MAX_DICE} dice`);
  const need=dice.reduce((s,d)=>s+d.faces,0); if(need>pool.length) throw new Error(`Set has ${need} faces; the glyph pool holds ${pool.length}`);
  const order=shuffled(pool.map(g=>g.id),rng(hash32(fp))); let at=0;
  return dice.map(d=>{ const run=order.slice(at,at+d.faces); at+=d.faces; return run; });
}

/* ---- sentence generator ----
   Review 2026-11-20 (docs/design/sentence-generator-review.md): one word picker per story (a glyph keeps its noun, no adjective/adverb/verb/connective/pattern twice, no "the smirk smirked" echoes), number-aware articles (an hour, an L, some coins, some water),
   adverbs that are not -ly go after the verb, at most two clauses per sentence, new-sentence transitions, an occasional short beat (6-7 glyphs) and a closing line that calls back to the first glyph (8+ glyphs). */
const PREP=['near','beside','above','under','behind','beyond','past','around','with'],
  OPEN=['One day,','Once upon a time,','Long ago,','Late one night,','Far from here,','One stormy evening,','Just before breakfast,','At the edge of town,','Without warning,','Every Tuesday,'],
  JOIN=['and','but','so','then','until','while','or maybe'],   // continues the sentence after a comma
  NEXT=['Meanwhile,','Then','After that,','Just then,','Later,','Soon,'],   // starts a new sentence
  END=['In the end,','At last,','Before long,','Finally,'],
  BEAT=['Nobody saw that coming','It was that kind of day','Nobody asked why','This was not the plan'],
  CODA=[(h,l)=>`And that is how the ${h} became so ${l.a}`,(h,l)=>`The ${h} never spoke of the ${l.n} again`,(h,l)=>`The ${h} never forgave the ${l.n}`,h=>`Nobody ever believed the ${h}`,h=>`The ${h} would do it all again`];
const MAXLEN=200;   // PD-184: a 9-glyph story on a 390 px phone should wrap to four lines or fewer
const MASS=new Set('water steam energy dust daylight milk sand lava honey music justice rain bread cheese ice magic sass money popcorn love lightning treasure yarn DNA'.split(' '));
const many=w=>MASS.has(w)||/s$/.test(w)&&!/(ss|us|is)$/.test(w);   // plural or mass: "some", never "a"
const an=w=>{ const f=w.split(/[ -]/)[0]; if(/^[A-Z0-9]+$/.test(f)) return /^([AEFHILMNORSX]|8|11|18)/.test(f)?'an':'a';   // read as letters: an L, a UFO, a 404
  return /^(hour|honest|honou?r|heir)/i.test(f)||/^[aeiou]/i.test(f)&&!/^(uni|use|usu|one|eu)/i.test(f)?'an':'a'; };
const np=(n,adj,def)=>{ const w=adj?adj+' '+n:n; return (def?'the':many(n)?'some':an(w))+' '+w; };
const cap=s=>s[0].toUpperCase()+s.slice(1);
const trans=g=>g.v.filter(v=>!v.endsWith('!')), intrans=g=>g.v.filter(v=>v.endsWith('!')).map(v=>v.slice(0,-1));
const stem=w=>w.toLowerCase().slice(0,3), clash=(w,n)=>n.split(/[ -]/).some(x=>stem(x)===stem(w));
/* the story's word picker: fresh() prefers words not used yet in this story and not echoing the noun; N(g) fixes a glyph's noun for the whole story */
function words(r,lean=0){ const used=new Set(), roots=new Set(), nouns=new Map(), root=w=>w.toLowerCase().slice(0,4);   // roots: no "creaky door ... creaked" across the story either
  const fresh=(list,n)=>{ const fit=list.filter(w=>!(n&&clash(w,n))), ok=fit.filter(w=>!used.has(w)&&!roots.has(root(w))); const w=pick(ok.length?ok:fit.length?fit:list,r);   /* an echo is worse than a repeat */ used.add(w); for(const x of w.split(/[ -]/)) if(x.length>3) roots.add(root(x)); return w; };
  const N=g=>{ if(!nouns.has(g.id)){ const ok=g.n.filter(n=>!g.v.some(v=>clash(v,n))); nouns.set(g.id,fresh(ok.length?ok:g.n)); } return nouns.get(g.id); };   // "the smug face smirked", not "the smirk smirked"
  const w={r,fresh,N, A:g=>fresh(g.a,N(g)+' '+g.v.join(' ')), D:g=>fresh(g.d,N(g)), T:g=>fresh(trans(g),N(g)), I:g=>fresh(intrans(g),N(g)), P:()=>fresh(PREP),
    the:(g,adj)=>np(N(g),adj&&r()>=lean?w.A(g):'',true), a:(g,adj)=>np(N(g),adj&&r()>=lean?w.A(g):'',false),   // lean: share of adjectives dropped, so 8-9 glyph stories stay about four lines on a phone
    act:(adv,vp)=>/ly$/.test(adv)&&r()<.5?adv+' '+vp:vp+' '+adv,   // "-ly" adverbs may lead the verb; "sideways", "far away" always trail
    pat:list=>{ let i=Math.floor(r()*list.length); for(let k=0;k<list.length&&used.has(list[i]);k++) i=(i+1)%list.length; used.add(list[i]); return list[i]; } };
  return w; }
// A clause pattern takes n glyphs and the story's word picker; each returns text without the final full stop.
const P={
  1:[ (g,w)=>`${w.a(g[0],1)} ${w.act(w.D(g[0]),w.I(g[0]))}`,
      (g,w)=>`${w.the(g[0])} ${w.I(g[0])}` ],
  2:[ (g,w)=>`${w.the(g[0],1)} ${w.T(g[0])} ${w.the(g[1])}`,
      (g,w)=>`${w.a(g[0])} ${w.I(g[0])} ${w.P()} ${w.the(g[1],1)}`,
      (g,w)=>`${w.the(g[0])} and ${w.the(g[1])} ${w.act(w.D(g[1]),w.I(g[w.r()<.5?0:1]))}`,
      (g,w)=>`${w.the(g[1],1)} ${w.act(w.D(g[0]),w.T(g[1])+' '+w.the(g[0]))}`,
      (g,w)=>`${w.the(g[0],1)} ${w.T(g[0])} ${w.the(g[1])} and ${w.I(g[0])}` ],
  3:[ (g,w)=>`${w.the(g[0],1)} ${w.T(g[0])} ${w.the(g[1])} ${w.P()} ${w.the(g[2])}`,
      (g,w)=>`${w.the(g[0])} that ${w.T(g[0])} ${w.the(g[1])} ${w.I(g[0])} ${w.P()} ${w.the(g[2],1)}`,
      (g,w)=>`${w.the(g[2],1)} ${w.I(g[2])}, so ${w.the(g[0])} ${w.T(g[0])} ${w.the(g[1])}`,
      (g,w)=>`${w.a(g[0],1)} ${w.act(w.D(g[1]),w.T(g[0])+' '+w.a(g[1]))} ${w.P()} ${w.the(g[2])}`,
      (g,w)=>`while ${w.the(g[0])} ${w.I(g[0])}, ${w.the(g[1])} ${w.T(g[1])} ${w.the(g[2],1)}`,
      (g,w)=>`${w.the(g[0])} and ${w.the(g[1])} ${w.T(g[w.r()<.5?0:1])} ${w.the(g[2],1)}` ] };

/* Split n glyphs into clauses of 1-3 in a seeded way: mostly 2s and 3s, never a lone glyph unless n is 1. */
export function chunkSizes(n,r){ const out=[], long=n>=8; while(n>0){ if(n<=3){ out.push(n); break; } const s=n===4?2:(r()<(long?.8:.5)?3:2); out.push(s); n-=s; } return out; }   // 8-9 glyphs lean to threes: fewer, fuller clauses
const glyphsOf=ids=>ids.map(id=>{ const g=GLYPH_BY_ID.get(id); if(!g) throw new Error('unknown glyph '+id); return g; });

/* sentenceFor(ids, salt): the arranged glyph ids (in ring order) -> {text, clauses}. The same arrangement and salt always give the same text; a new salt re-words it.
   The first glyph is the hero: it opens the story and, from 8 glyphs, comes back in the closing line with the last glyph. */
export function sentenceFor(ids,salt=0){
  const gl=glyphsOf(ids); if(!gl.length) return {text:'',clauses:[]};
  const r=rng(hash32(ids.join(',')+'#'+salt)), w=words(r,gl.length>=8?.75:gl.length>=7?.4:0), sizes=chunkSizes(gl.length,r), clauses=[]; let at=0;
  for(const s of sizes){ const g=gl.slice(at,at+s); at+=s; clauses.push({glyphs:g.map(x=>x.id), text:w.pat(P[s])(g,w)}); }
  const out=[], beat=gl.length>=6&&gl.length<8&&clauses.length>2&&r()<.3?1+Math.floor(r()*(clauses.length-2)):-1; let open=0;   // out: sentences without the full stop; open: clauses in the last one
  clauses.forEach((c,i)=>{ const t=c.text, size=t.includes(', ')?2:1;
    if(i===0){ out.push(cap(w.fresh(OPEN)+' '+t)); open=size; }
    else if(i===clauses.length-1&&clauses.length>2&&gl.length<8&&r()<.6){ out.push(w.fresh(END)+' '+t); open=size; }
    else { const x=r(), js=JOIN.filter(j=>!new RegExp('\\b'+j+'\\b').test(out.at(-1)+' '+t));
      if(open+size<=2&&x<.5&&js.length){ out[out.length-1]+=', '+w.fresh(js)+' '+t; open+=size; }
      else { out.push(cap(x<(gl.length<8?.75:0)?w.fresh(NEXT)+' '+t:t)); open=size; } }
    if(i===beat&&out.join('. ').length<MAXLEN-90){ out.push(w.fresh(BEAT)); open=9; } });
  if(gl.length>=8){ const c=w.pat(CODA)(w.N(gl[0]),{n:w.N(gl.at(-1)),a:w.A(gl.at(-1))}); if(out.join('. ').length+c.length<=MAXLEN) out.push(c); }   // the closing line only when it still fits about four lines on a phone
  return {text:out.join('. ')+'.', clauses};
}

/* ---- the bot's ad-lib (Story dice with a bot player) ----
   Same clause patterns, but every word class is borrowed from a random die in the arrangement (so the cat gets the dagger's adjectives and the moon's verbs), with a breathless opener, connectors, asides and a flat ending. Same arrangement and salt, same ad-lib.
   Each clause after the first is its own sentence led by a connector ("Meanwhile, ...", "So naturally, ..."), so the asides never pile into comma soup. */
const LIB_OPEN=['Okay so,','Listen.','Breaking news:','You will not believe this, but','As the prophecy foretold,','Hold my nachos,','Legend says that','Allegedly,','Plot twist:','So there I was,','Fun fact:','True story:'], LIB_JOIN=['and then,','meanwhile,','but also,','so naturally,','suddenly,','and, plot twist,','which meant that','and for some reason,','next thing you know,','long story short,'],
  LIB_TAG=['obviously','as one does','for no reason','dramatically','which was extremely suspicious','and nobody asked','with alarming confidence','in a totally normal way','against all advice','twice','on a Tuesday','to thunderous applause'],
  LIB_END=['The end. Roll credits.','And that is why we have rules.','Nobody was ever the same.','Thank you, I will be here all week.','To be continued, probably.','Moral of the story: always check the dice.','No refunds.'];
export function adLibFor(ids,salt=0){
  const gl=glyphsOf(ids); if(!gl.length) return {text:'',clauses:[]};
  const r=rng(hash32('adlib:'+ids.join(',')+'#'+salt)), w=words(r), sizes=chunkSizes(gl.length,r), clauses=[]; let at=0;
  for(const sz of sizes){ const chim=gl.slice(at,at+sz).map(g=>({...g,a:pick(gl,r).a,d:pick(gl,r).d,v:pick(gl,r).v})); at+=sz;
    let t=w.pat(P[sz])(chim,w); if(r()<.55) t+=', '+w.fresh(LIB_TAG); clauses.push({glyphs:chim.map(x=>x.id),text:t}); }
  const open=w.fresh(LIB_OPEN), first=open.endsWith('.')?cap(clauses[0].text):clauses[0].text;
  const text=[cap(open+' '+first),...clauses.slice(1).map(c=>cap(w.fresh(LIB_JOIN)+' '+c.text))].join('. ')+'. '+pick(LIB_END,r);
  return {text,clauses};
}

/* Per-glyph hint (for the bot's hint display): up to 2 words of each kind. */
export const hintFor=id=>{ const g=GLYPH_BY_ID.get(id); return g?{nouns:g.n.slice(0,2), adjectives:g.a.slice(0,2), adverbs:g.d.slice(0,2), verbs:g.v.map(v=>v.replace(/!$/,'')).slice(0,3)}:null; };

/* ---- ring arrangement model (pure) ----
   Rings 1..n hold dice (by index) in order; unplaced dice sit in the swept pool. fill puts the next free ring's die; move/drag with autoswap exchanges two occupied rings. */
export const newArrangement=n=>({n, rings:Array(n).fill(null)});
export const poolOf=a=>[...Array(a.n).keys()].filter(i=>!a.rings.includes(i));
export function fillNext(a,die){ if(a.rings.includes(die)) return a; const k=a.rings.indexOf(null); if(k<0) return a; const rings=a.rings.slice(); rings[k]=die; return {...a,rings}; }
export function removeDie(a,die){ const rings=a.rings.map(x=>x===die?null:x); return {...a,rings}; }
/* dropDie(arrangement, die, ring, {autoswap}): a die from the pool or another ring lands on `ring`. With autoswap an occupied target swaps with the die's old ring (or sends its occupant back to the pool when the dragged die came from the pool). */
export function dropDie(a,die,ring,{autoswap=true}={}){
  const rings=a.rings.slice(), from=rings.indexOf(die), there=rings[ring]; if(there===die) return a;
  if(there!==null&&!autoswap) return a;
  if(from>=0) rings[from]=there; rings[ring]=die; return {...a,rings};
}
export const complete=a=>a.rings.every(x=>x!==null);
