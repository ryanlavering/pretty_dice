// Story Dice sets (PD-166): a Story set is an ordinary bag set with one term that has a face block, e.g. 5d12{noto#7}. This module is the pure side of the editor: the draft model, the term and formula it makes, the preview faces and sentence. No DOM, no app state.
import { FACE_SIDES, dealError, dealTerms, fmtFaces } from './faces.js';
import { MAX_DICE, MIN_DICE, sentenceFor } from './story.js';

export const STORY_SIDES=FACE_SIDES;
export const STORY_MIN=MIN_DICE;
export const STORY_MAX=MAX_DICE;
/* a bag set the Story editor can show: one term with glyph faces, no modifier, not a group */
export const isStorySet=st=>!!st&&Array.isArray(st.terms)&&st.terms.length===1&&!!st.terms[0].faces&&!st.mod&&!(st.group>1)&&FACE_SIDES.includes(st.terms[0].sides);
/* set -> editor draft */
export const draftOf=st=>{ const t=st.terms[0], f=t.faces; return {name:st.name,count:Math.max(STORY_MIN,Math.min(STORY_MAX,t.count)),sides:t.sides,packs:[...f.packs],seed:f.seed||1,dice:f.dice,order:f.order,...(t.design?{design:t.design}:{})}; };
export const newDraft=(name,seed)=>({name,count:5,sides:12,packs:['noto'],seed,dice:'different',order:'shuffled'});
export const draftFaces=d=>({kind:'deal',packs:d.order==='shuffled'?[...new Set(d.packs)].sort():[...new Set(d.packs)],...(d.order==='shuffled'?{seed:d.seed}:{}),dice:d.dice,order:d.order});
export const draftTerm=d=>({count:d.count,sides:d.sides,...(d.design?{design:d.design}:{}),faces:draftFaces(d)});
/* the face-block formula the set is saved as, the same text the grammar prints */
export const draftFormula=d=>`${d.count}d${d.sides}${d.design?'@'+d.design:''}${fmtFaces(draftFaces(d))}`;
export const draftError=d=>{ if(!d.packs.length) return 'Pick at least one glyph pack'; if(!(d.count>=STORY_MIN&&d.count<=STORY_MAX)) return `Use ${STORY_MIN} to ${STORY_MAX} dice`; return dealError([draftTerm(d)]); };
/* the game setup can only deal shuffled, different dice, so only those sets load into a game */
export const gameReady=d=>d.order==='shuffled'&&d.dice==='different'&&!draftError(d);
/* one-line summary for the list */
export const summaryOf=d=>`${d.packs.join(' + ')} · ${d.count} × d${d.sides} · ${d.order==='shuffled'?'seed '+d.seed:'in pack order'} · ${d.dice==='same'?'same dice':'different dice'}`;
/* {dice:[[glyph x sides] per die], sentence} for a valid draft, else null. The sentence reads the first face of each die. */
export function previewOf(d){ if(draftError(d)) return null; const dice=dealTerms([draftTerm(d)])[0]; return {dice,sentence:sentenceFor(dice.map(x=>x[0].id),0).text}; }
