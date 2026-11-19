// Story dice (spike, PD-160): a stable, seeded glyph deal for a set of dice, and a plausible-at-surface-level sentence generator. Pure ES module, no DOM.
// The trick: two overlaid random picks from small pools (which glyph is on which face; which word and which pattern a glyph gets) read as "good enough for infinity".
import { STORY_GLYPHS } from './story-glyph-data.js';

export const GLYPHS=STORY_GLYPHS, GLYPH_BY_ID=new Map(GLYPHS.map(g=>[g.id,g]));
export const MAX_DICE=9, MIN_DICE=3;

/* ---- seeding ---- */
export function hash32(str){ let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
export function rng(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
const shuffled=(arr,r)=>{ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const pick=(arr,r)=>arr[Math.floor(r()*arr.length)];

/* The set fingerprint: the dice (face count and design id, in order) plus an optional salt (the set name). Same set -> same glyphs on the same faces, on every device. */
export const fingerprint=(dice,salt='')=>'story1|'+salt+'|'+dice.map(d=>`${d.faces}${d.design?'@'+d.design:''}`).join(',');

/* Deal glyphs to faces: shuffle the whole pool with the fingerprint's seed, then hand out consecutive runs, so every face of every die has its own glyph.
   dice: [{faces}] -> [[glyphId x faces] per die]. Throws if the set needs more faces than the pool holds. */
export function dealGlyphs(dice,fp=fingerprint(dice),pool=GLYPHS){
  if(dice.length<MIN_DICE||dice.length>MAX_DICE) throw new Error(`Story dice need ${MIN_DICE}-${MAX_DICE} dice`);
  const need=dice.reduce((s,d)=>s+d.faces,0); if(need>pool.length) throw new Error(`Set has ${need} faces; the glyph pool holds ${pool.length}`);
  const order=shuffled(pool.map(g=>g.id),rng(hash32(fp))); let at=0;
  return dice.map(d=>{ const run=order.slice(at,at+d.faces); at+=d.faces; return run; });
}

/* ---- sentence generator ---- */
const PREP=['near','beside','above','under','behind','with','beyond','inside'], OPEN=['One day,','Once upon a time,','Long ago,','Late one night,','Far from here,'], MID=['and','but','so','then','until','or maybe'], END=['In the end,','At last,','Before long,'];
const vowel=w=>/^[aeiou]/i.test(w)&&!/^(uni|use|one)/i.test(w), art=w=>(/^[A-Z]{2,}/.test(w)?'a':vowel(w)?'an':'a')+' '+w;   // UFO -> "a UFO" is fine for the spike (unreadable acronyms are rare)
const cap=s=>s[0].toUpperCase()+s.slice(1);

const trans=g=>g.v.filter(v=>!v.endsWith('!')), intrans=g=>g.v.filter(v=>v.endsWith('!')).map(v=>v.slice(0,-1)), pw=(g,k,r)=>pick(g[k],r);
// A clause pattern takes n glyphs and a pick function; each returns text without the final full stop.
const P={
  1:[ (g,r)=>`${art(pw(g[0],'a',r))} ${pw(g[0],'n',r)} ${pick(intrans(g[0]),r)} ${pw(g[0],'d',r)}`,
      (g,r)=>`the ${pw(g[0],'n',r)} ${pick(intrans(g[0]),r)}` ],
  2:[ (g,r)=>`the ${pw(g[0],'a',r)} ${pw(g[0],'n',r)} ${pick(trans(g[0]),r)} the ${pw(g[1],'n',r)}`,
      (g,r)=>`${art(pw(g[0],'n',r))} ${pick(intrans(g[0]),r)} ${pick(PREP,r)} the ${pw(g[1],'a',r)} ${pw(g[1],'n',r)}`,
      (g,r)=>`the ${pw(g[0],'n',r)} and the ${pw(g[1],'n',r)} ${pick(intrans(g[r()<.5?0:1]),r)} ${pw(g[1],'d',r)}`,
      (g,r)=>`the ${pw(g[1],'a',r)} ${pw(g[1],'n',r)} ${pw(g[0],'d',r)} ${pick(trans(g[1]),r)} the ${pw(g[0],'n',r)}` ],
  3:[ (g,r)=>`the ${pw(g[0],'a',r)} ${pw(g[0],'n',r)} ${pick(trans(g[0]),r)} the ${pw(g[1],'a',r)} ${pw(g[1],'n',r)} ${pick(PREP,r)} the ${pw(g[2],'n',r)}`,
      (g,r)=>`the ${pw(g[0],'n',r)}, the ${pw(g[1],'n',r)} and the ${pw(g[2],'n',r)} ${pick(intrans(g[r()<.5?0:(r()<.5?1:2)]),r)} ${pw(g[2],'d',r)}`,
      (g,r)=>`the ${pw(g[2],'a',r)} ${pw(g[2],'n',r)} ${pick(intrans(g[2]),r)}, so the ${pw(g[0],'n',r)} ${pick(trans(g[0]),r)} the ${pw(g[1],'n',r)}`,
      (g,r)=>`${art(pw(g[0],'a',r))} ${pw(g[0],'n',r)} ${pw(g[1],'d',r)} ${pick(trans(g[0]),r)} ${art(pw(g[1],'n',r))} ${pick(PREP,r)} the ${pw(g[2],'a',r)} ${pw(g[2],'n',r)}` ] };

/* Split n glyphs into clauses of 1-3 in a seeded way: mostly 2s and 3s, never a lone glyph unless n is 1. */
export function chunkSizes(n,r){ const out=[]; while(n>0){ if(n<=3){ out.push(n); break; } const s=n===4?2:n===5?(r()<.5?2:3):(r()<.5?2:3); out.push(s); n-=s; } return out; }

/* sentenceFor(ids, salt): the arranged glyph ids (in ring order) -> {text, clauses}. The same arrangement and salt always give the same text; a new salt re-words it. */
export function sentenceFor(ids,salt=0){
  const gl=ids.map(id=>{ const g=GLYPH_BY_ID.get(id); if(!g) throw new Error('unknown glyph '+id); return g; }); if(!gl.length) return {text:'',clauses:[]};
  const r=rng(hash32(ids.join(',')+'#'+salt)), sizes=chunkSizes(gl.length,r), clauses=[]; let at=0;
  for(const s of sizes){ const g=gl.slice(at,at+s); at+=s; clauses.push({glyphs:g.map(x=>x.id), text:pick(P[s],r)(g,r)}); }
  const parts=clauses.map((c,i)=>{ let t=c.text; if(i===0) t=pick(OPEN,r)+' '+t; else if(i===clauses.length-1&&clauses.length>2&&r()<.6) t=pick(END,r)+' '+t; else if(r()<.5) t=pick(MID,r)+' '+t; return t; });
  // joins: a clause after a connector like "and"/"but" continues the sentence with a comma, otherwise it starts a new one
  let text=''; parts.forEach((t,i)=>{ const joined=/^(and|but|so|then|until|or maybe) /.test(t); if(i===0) text=cap(t); else if(joined) text+=', '+t; else text+='. '+cap(t); }); text+='.';
  return {text, clauses};
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
