// Quick roll box history (PD-198): the formulas and set names the player rolled from the dock box, most recent first, no repeats, at most 20.
// Pure model plus a tiny storage adapter: no DOM, no app state. Kept in its own key (prettydice.rollhist.v1), so neither the settings store nor the bag file (Save bag / Copy JSON) ever sees it.
export const HIST_KEY='prettydice.rollhist.v1';
export const HIST_MAX=20;

export function createRollHistory({ key=HIST_KEY, max=HIST_MAX, storage=null }={}){
  let list=[];
  try{ const raw=JSON.parse(storage&&storage.getItem(key)||'[]'); if(Array.isArray(raw)) list=raw.filter(s=>typeof s==='string'&&s.trim()).map(s=>s.trim()).slice(0,max); }catch{}
  let idx=-1, draft='';   // idx -1 = not browsing; draft = what was in the box when Up was first pressed
  const save=()=>{ try{ storage&&storage.setItem(key,JSON.stringify(list)); }catch{} };
  return {
    entries:()=>list.slice(),
    browsing:()=>idx>=0,
    /* record a successful roll's text; a repeat moves to the front (compared exactly, after trimming) */
    push(text){ const t=String(text||'').trim(); if(!t) return false; list=[t,...list.filter(x=>x!==t)].slice(0,max); idx=-1; draft=''; save(); return true; },
    /* Up: the next older entry for the box text `current`, or null when there is nothing older */
    older(current){ if(!list.length||idx>=list.length-1) return null; if(idx<0) draft=current; idx++; return list[idx]; },
    /* Down: one step newer; past the newest it gives the draft back; null when not browsing */
    newer(){ if(idx<0) return null; idx--; return idx<0?draft:list[idx]; },
    /* the player typed or picked something: browsing starts over */
    stop(){ idx=-1; draft=''; },
    clear(){ list=[]; idx=-1; draft=''; save(); },
  };
}
