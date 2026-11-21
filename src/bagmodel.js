// Dice bag file model (4.1 factoring step S8): names and ids, the empty bag, parseBag (any bag or single-design file -> a bag; pure, touches no app state), and the canonical design form used to compare and key designs. See docs/design/dice-bag-design.md.
import { SHAPES } from './polyhedra.js';
import { SUBSTRATES } from './substrates.js';

export const LOG_MAX=200;   // roll log entries kept in the bag
export const slug=(t,fallback)=>String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||fallback;
/* Names are unique within a bag (designs, and sets, each among themselves): a clash gets the next number, 'Test copy' -> 'Test copy 2'. Compared ignoring case. */
export function uniqueName(others,name){ name=String(name||'').trim().slice(0,80); const used=new Set(others.map(x=>String(x).trim().toLowerCase())); if(!used.has(name.toLowerCase())) return name;
  const m=name.match(/^(.*?)(?: (\d+))?$/), base=m[1]||name; let n=m[2]?+m[2]+1:2, c; do{ c=`${base.slice(0,76)} ${n++}`; }while(used.has(c.toLowerCase())); return c; }
export function uniqueId(base,taken){ let id=base, n=2; while(taken.has(id)) id=`${base}-${n++}`; return id; }
export function emptyBag(name='My bag'){ return {format:'pretty-dice-bag', version:1, name, designs:[], sets:[], characters:[], jail:[], pending:{}, draft:null, active:{design:null,set:null,draft:false}, log:[]}; }
export const designOK=d=>d&&d.format==='pretty-dice'&&d.version===1&&SHAPES[d.shape]&&SUBSTRATES[d.substrate];
/* Parse any bag or single-design file into a bag. Pure: touches no app state. Returns {bag, dropped:[reasons]}. */
export function parseBag(obj){
  if(!obj||typeof obj!=='object') throw new Error('Not a pretty-dice file');
  const dropped=[], out=emptyBag();
  if(obj.format==='pretty-dice'){
    if(!designOK(obj)) throw new Error('Not a valid pretty-dice design file');
    const name=(typeof obj.name==='string'&&obj.name.trim())?obj.name.trim().slice(0,80):'Design 1';
    out.name=name; out.designs.push({id:slug(name,'design-1'), name, preview_shape:obj.shape, design:structuredClone(obj)});
    out.active.design=out.designs[0].id; return {bag:out, dropped};
  }
  if(obj.format!=='pretty-dice-bag') throw new Error('Not a pretty-dice design or bag file');
  if(obj.version!==1) throw new Error('Unsupported bag version '+obj.version);
  if(typeof obj.name==='string'&&obj.name.trim()) out.name=obj.name.trim().slice(0,80);
  const ids=new Set();
  for(const [i,e] of (Array.isArray(obj.designs)?obj.designs:[]).entries()){
    if(!e||!designOK(e.design)){ dropped.push(`design ${i+1} (${e&&e.name||'unnamed'}): not a valid design`); continue; }
    const name=(typeof e.name==='string'&&e.name.trim())?e.name.trim().slice(0,80):`Design ${i+1}`, id=uniqueId(slug(e.id||name,`design-${i+1}`),ids); ids.add(id);
    out.designs.push({id, name, preview_shape:SHAPES[e.preview_shape]?e.preview_shape:e.design.shape, design:structuredClone(e.design), ...(e.id&&e.id!==id?{was:e.id}:{})});
  }
  if(!out.designs.length) throw new Error('The bag has no valid designs');
  const remap=new Map(out.designs.filter(d=>d.was).map(d=>[d.was,d.id])); out.designs.forEach(d=>delete d.was);
  const ref=id=>ids.has(id)?id:remap.get(id);
  const sets=new Set();
  for(const st of (Array.isArray(obj.sets)?obj.sets:[])){ if(!st||typeof st.id!=='string'||!Array.isArray(st.terms)){ dropped.push('a set without an id or terms'); continue; }
    const copy=structuredClone(st); copy.terms=copy.terms.map(t=>{ if(t&&t.design&&!ref(t.design)){ dropped.push(`set ${st.name||st.id}: design "${t.design}" is missing, using the active design`); const {design,...r}=t; return r; } return t&&t.design?{...t,design:ref(t.design)}:t; });
    if(copy.design!==undefined){ if(typeof copy.design==='string'&&ref(copy.design)) copy.design=ref(copy.design); else { if(copy.design) dropped.push(`set ${st.name||st.id}: design "${copy.design}" is missing, the set keeps your current look`); delete copy.design; } }   // PD-202 part 2: the set's look link
    sets.add(copy.id); out.sets.push(copy); }
  out.characters=(Array.isArray(obj.characters)?obj.characters:[]).filter(c=>c&&typeof c.id==='string').map(c=>structuredClone(c));
  out.jail=(Array.isArray(obj.jail)?obj.jail:[]).filter(j=>j&&ref(j.design)).map(j=>({...structuredClone(j),design:ref(j.design)}));
  for(const [k,v] of Object.entries(obj.pending&&typeof obj.pending==='object'?obj.pending:{})){ if(ref(k)&&designOK(v)) out.pending[ref(k)]=structuredClone(v); else dropped.push(`pending edits for "${k}": design missing or invalid`); }
  if(obj.draft!=null){ if(designOK(obj.draft)) out.draft=structuredClone(obj.draft); else dropped.push('the random draft was not a valid design'); }
  const a=obj.active||{}; out.active={design:ref(a.design)||out.designs[0].id, set:sets.has(a.set)?a.set:null, draft:!!(a.draft&&out.draft)};
  out.log=(Array.isArray(obj.log)?obj.log:[]).slice(-LOG_MAX); out.roller=typeof obj.roller==='string'?obj.roller.slice(0,24):'';
  { const I=obj.init&&Array.isArray(obj.init.rows)?obj.init:null; if(I){ out.init={rows:I.rows.filter(r=>r&&typeof r.name==='string'&&Number.isFinite(+r.total)).slice(0,60).map(r=>({name:r.name.slice(0,30),total:+r.total})),turn:Math.max(0,Math.floor(+I.turn)||0),round:Math.max(1,Math.floor(+I.round)||1)}; } }
  return {bag:out, dropped};
}
export const sortKeys=v=>Array.isArray(v)?v.map(sortKeys):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sortKeys(v[k])])):v;
export const canonD=d=>{ const {shape,notation,...r}=d; return JSON.stringify(sortKeys(r)); };
export const hashStr=t=>{ let h=5381; for(let i=0;i<t.length;i++) h=((h<<5)+h+t.charCodeAt(i))|0; return (h>>>0).toString(36); };
export const thumbKey=d=>hashStr(canonD(d));   // design pictures are always a d20, so the key ignores the preview shape
