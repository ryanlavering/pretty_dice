// Custom faces on a dice term (PD-167, docs/design/custom-set-grammar.md slice 1): the face block {pack#n!flags}, its printing, and the seeded deal. Pure ES module, no DOM.
// Model: term.faces = {kind:'deal', packs:[id], seed?:int, dice:'different'|'same', order:'shuffled'|'ordered'}. A face with no explicit value counts as its index (1..n).
import { GLYPH_BY_ID, PACK_LIST, hash32, poolFor } from './story.js';

export const FACE_SIDES=[6,8,12,20];   // dice with a glyph layout (d4 corner numbers, d10 0-9 and d% stay numbers)
export const MAX_SEED=999999;
const PACK_IDS=new Set(PACK_LIST.map(p=>p.id));

/* The body of a face block (already lower-cased, spaces removed) -> {faces} or {error}. */
export function parseFaceBlock(body){
  const m=/^([a-z0-9]+(?:&[a-z0-9]+)*)(?:#(\d+))?((?:![a-z]+)*)$/.exec(body);
  if(!m) return {error:`Can't read the face block "{${body}}"; write {pack#1}, e.g. 5d12{noto#1}`};
  const packs=m[1].split('&'); for(const p of packs) if(!PACK_IDS.has(p)) return {error:`No glyph pack "${p}"`};
  let dice='different', order='shuffled';
  for(const f of m[3].split('!').filter(Boolean)){ if(f==='same') dice='same'; else if(f==='ordered') order='ordered'; else return {error:`Unknown face flag "!${f}" (use !same or !ordered)`}; }
  if(m[2]!==undefined&&order==='ordered') return {error:`An ordered deal has no seed; drop #${m[2]} or drop !ordered`};
  const seed=m[2]===undefined?1:+m[2]; if(seed>MAX_SEED) return {error:`Seed ${seed} is too large (max ${MAX_SEED})`};
  const uniq=[...new Set(packs)], list=order==='shuffled'?uniq.sort():uniq;   // shuffled: pack order never matters; ordered: as written
  return {faces:{kind:'deal',packs:list,...(order==='shuffled'?{seed}:{}),dice,order}};
}
/* The normal form: {pack#n}, then !same, then !ordered (flags only when not the default). */
export const fmtFaces=f=>'{'+f.packs.join('&')+(f.order==='shuffled'?'#'+f.seed:'')+(f.dice==='same'?'!same':'')+(f.order==='ordered'?'!ordered':'')+'}';
const dealKey=f=>[f.packs.join('&'),f.seed,f.dice,f.order].join('|');
export const faceName=g=>g?g.name.replace(/[-_]+/g,' '):'';

const ORDERS=new Map();   // deal identity -> glyph pool in dealing order. Stable shuffle: sorted by hash32(seed|glyph id), so a pack that gains a glyph does not reshuffle the rest
function poolOrder(f){
  const k=dealKey(f); let o=ORDERS.get(k); if(o) return o;
  if(f.order==='ordered') o=f.packs.flatMap(p=>poolFor([p]));
  else o=poolFor(f.packs).map(g=>[hash32(`pd-deal1|${f.seed}|${g.id}`),g]).sort((a,b)=>a[0]-b[0]||(a[1].id<b[1].id?-1:1)).map(x=>x[1]);
  if(ORDERS.size>64) ORDERS.clear(); ORDERS.set(k,o); return o;
}
/* terms -> per term (null without faces) an array per physical die of glyph objects, one per face. Terms with the same deal identity share one pool and, in 'different' mode, take consecutive runs in term order, so adding a die at the end keeps the earlier dice. Throws Error when the pool is too small. */
export function dealTerms(terms){
  const used=new Map();
  return terms.map(t=>{ const f=t.faces; if(!f) return null; const order=poolOrder(f), k=dealKey(f); let at=used.get(k)||0;
    const dice=Array.from({length:t.count},()=>{
      const start=f.dice==='same'?0:at; if(start+t.sides>order.length) throw new Error('pool too small');
      if(f.dice!=='same') at+=t.sides; return order.slice(start,start+t.sides); });
    used.set(k,at); return dice; });
}
/* null when the set can be dealt, else the owner-facing message ("Set needs 60 faces; noto holds 40") */
export function dealError(terms){
  try{ dealTerms(terms); return null; }catch{
    const need=new Map(); for(const t of terms){ if(!t.faces) continue; const k=dealKey(t.faces), n=t.faces.dice==='same'?t.sides:t.count*t.sides; need.set(k,t.faces.dice==='same'?Math.max(need.get(k)||0,n):(need.get(k)||0)+n); }
    const bad=terms.find(t=>t.faces&&need.get(dealKey(t.faces))>poolOrder(t.faces).length);
    return `Set needs ${need.get(dealKey(bad.faces))} faces; ${bad.faces.packs.join('&')} holds ${poolOrder(bad.faces).length}${bad.faces.dice==='same'?'':' (use fewer dice or add packs)'}`; }
}
