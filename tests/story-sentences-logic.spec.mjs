// Story sentence quality (sentence generator review, 2026-11-20): pure node checks over 300 seeded random arrangements, every pack and mixes, 5 to 9 glyphs.
// Determinism, a/an and "some" agreement, clean spacing and punctuation, proportionate length, ring order changes the text. See docs/design/sentence-generator-review.md.
import { test, expect } from '@playwright/test';
import * as S from '../src/story.js';

const packs = S.PACK_LIST.map(p => p.id), combos = [...packs.map(p => [p]), ['noto', 'memes'], ['gameicons', 'hiero'], ['noto', 'fontawesome', 'symbols'], packs];
const r = S.rng(20261120), cases = [];
for (let k = 0; k < 300; k++) {
  const pool = S.poolFor(combos[k % combos.length]), n = 5 + Math.floor(r() * 5), ids = [];
  while (ids.length < n) { const g = pool[Math.floor(r() * pool.length)].id; if (!ids.includes(g)) ids.push(g); }
  cases.push({ ids, salt: Math.floor(r() * 5) });
}
const nouns = new Set(S.GLYPHS.flatMap(g => g.n)), plural = w => /s$/.test(w) && !/(ss|us|is)$/.test(w);
// shared text hygiene for the plain sentence and the bot ad-lib
function clean(t, where) {
  expect(t, where).toMatch(/^[A-Z][^]*[.]$/);
  expect(t, where).not.toMatch(/ {2}|^\s|\s$| [,.]|,,|\.\.|, *\.|undefined|\bnull\b|NaN|!/);
  expect(t, where).not.toMatch(/\. [a-z]/);                                   // every sentence starts with a capital
  expect(t, where).not.toMatch(/\b(\w+) \1\b/i);                              // no doubled word ("the the", "so so")
  for (const m of t.matchAll(/\b(a|an) ([\w'-]+)/g)) {                         // a/an: by sound for words, by letter name for capitals (an L, a UFO)
    const [, art, w] = m, caps = /^[A-Z0-9]+$/.test(w), vowelSound = caps ? /^([AEFHILMNORSX]|8|11|18)/.test(w) : /^(hour|honest|honou?r|heir)/i.test(w) || (/^[aeiou]/i.test(w) && !/^(uni|use|usu|one|eu)/i.test(w));
    expect(art, `${where}: "${m[0]}"`).toBe(vowelSound ? 'an' : 'a');
    if (nouns.has(w)) expect(plural(w), `${where}: "${m[0]}" is plural`).toBe(false);
  }
}

test('sentences over 300 random arrangements: deterministic, clean, agreed, proportionate @quick', () => {
  const lens = {};
  for (const { ids, salt } of cases) {
    const s = S.sentenceFor(ids, salt), where = ids.join(',') + '#' + salt;
    expect(S.sentenceFor([...ids], salt), where).toEqual(s);                   // same arrangement and salt, same story
    clean(s.text, where);
    expect(s.clauses.flatMap(c => c.glyphs), where).toEqual(ids);
    expect(s.text.length, where).toBeGreaterThanOrEqual(60); expect(s.text.length, where).toBeLessThanOrEqual(260);
    (lens[ids.length] ||= []).push(s.text.length);
  }
  const avg = n => lens[n].reduce((a, b) => a + b, 0) / lens[n].length;
  expect(avg(9)).toBeGreaterThan(avg(5) * 1.4); expect(avg(9)).toBeLessThan(avg(5) * 2.6);   // longer stories for more dice, but not runaway
});

test('the bot ad-lib over 300 random arrangements: deterministic, clean, one closing line @quick', () => {
  for (const { ids, salt } of cases) {
    const a = S.adLibFor(ids, salt), where = ids.join(',') + '#' + salt;
    expect(S.adLibFor([...ids], salt), where).toEqual(a);
    clean(a.text, where);
    expect(a.text, where).toMatch(/(The end\. Roll credits|why we have rules|Nobody was ever the same|all week|To be continued, probably|always check the dice|No refunds)\.$/);
    expect(a.text, where).not.toMatch(/, (obviously|as one does|for no reason|dramatically), (and|meanwhile|but|so|suddenly)/);   // asides no longer pile into the next connector
  }
});

test('ring order reshapes the story; the first glyph is the hero of a long story @quick', () => {
  let differ = 0, hero = 0, long = 0;
  for (const { ids, salt } of cases) {
    const rev = [...ids].reverse(); if (S.sentenceFor(rev, salt).text !== S.sentenceFor(ids, salt).text) differ++;
    if (ids.length >= 8) { const t = S.sentenceFor(ids, salt).text, last = t.slice(t.lastIndexOf('. ') + 2); if (!/(do it all again|never forgave|never spoke of|became so|Nobody ever believed)/.test(last)) continue;
      long++; if (S.GLYPH_BY_ID.get(ids[0]).n.some(n => (' ' + last.toLowerCase().replace(/[.,]/g, ' ') + ' ').includes(' the ' + n.toLowerCase() + ' '))) hero++; }
  }
  expect(differ).toBe(cases.length);
  expect(long).toBeGreaterThan(20); expect(hero).toBe(long);                  // the closing line (when it fits a phone) calls back to the first die
});

test('word choice: no adjective or adverb twice in one story, nouns keep their name @quick', () => {
  let repeats = 0;
  for (const { ids, salt } of cases) {
    const t = S.sentenceFor(ids, salt).text.toLowerCase(), gl = ids.map(id => S.GLYPH_BY_ID.get(id));
    const words = new Set([...gl.flatMap(g => g.a), ...gl.flatMap(g => g.d)].filter(w => !/ /.test(w)));
    for (const w of words) if ((t.match(new RegExp('\\b' + w + '\\b', 'g')) || []).length > 1) repeats++;
  }
  expect(repeats).toBeLessThanOrEqual(cases.length * 0.05);   // only when a glyph's own bank runs dry (or a noun shares the word)
});

// Soft dark verbs: with the secret gate off, no violent or disease verb shares a clause with a person noun; with it on, nothing changes.
const DARK = 'stabbed killed abducted infected haunted struck burned bit stung crushed smashed zapped slapped blasted trapped plundered invaded threatened swallowed captured ruined doomed exploded expired'.split(' ');
const PEOPLE = ['king', 'guard', 'queen', 'knight', 'wizard', 'witch', 'fairy', 'elf', 'genie', 'mermaid', 'zombie', 'vampire', 'troll', 'pirate', 'ninja', 'soldier', 'clown', 'fool', 'spy', 'astronaut', 'runner', 'baby', 'man', 'woman', 'child', 'god', 'alien', 'visitor', 'suspect', 'minotaur', 'centaur', 'ghost', 'spirit', 'cutie', 'cool kid', 'forest folk', 'bridge guard'];
const darkRe = new RegExp('\\b(' + DARK.join('|') + ')\\b', 'i'), peopleRe = new RegExp('\\b(' + PEOPLE.join('|') + ')\\b(?! (flag|hat))', 'i');
const personGlyphs = S.GLYPHS.filter(g => g.n.some(n => PEOPLE.includes(n))), darkGlyphs = S.GLYPHS.filter(g => g.v.some(v => DARK.includes(v.replace(/!$/, ''))));
const mixed = [], rm = S.rng(77);
for (let k = 0; k < 400; k++) {
  const ids = [], pick = a => a[Math.floor(rm() * a.length)].id;
  ids.push(pick(personGlyphs), pick(darkGlyphs), pick(personGlyphs), pick(darkGlyphs));
  while (ids.length < 5 + k % 5) ids.push(S.GLYPHS[Math.floor(rm() * S.GLYPHS.length)].id);
  if (new Set(ids).size === ids.length) mixed.push({ ids, salt: k % 4 });
}
const darkWithPerson = () => { let n = 0; for (const { ids, salt } of mixed) for (const c of S.sentenceFor(ids, salt).clauses) if (peopleRe.test(c.text) && darkRe.test(c.text)) n++; return n; };

test('soft verbs: a person never shares a clause with a dark verb unless the secret gate is on @quick', () => {
  expect(mixed.length).toBeGreaterThan(200);
  try {
    S.setStorySecret(false);
    expect(darkWithPerson()).toBe(0);
    S.setStorySecret(true);
    expect(darkWithPerson()).toBeGreaterThan(5);                                    // secret on: the original, unsoftened stories
  } finally { S.setStorySecret(false); }
});

test('soft verbs: the gate only changes stories that have a person and a dark verb; ad-lib follows it too @quick', () => {
  const sample = cases.slice(0, 60); let off = [], on = [];
  try { S.setStorySecret(false); off = sample.map(c => S.sentenceFor(c.ids, c.salt).text); S.setStorySecret(true); on = sample.map(c => S.sentenceFor(c.ids, c.salt).text); } finally { S.setStorySecret(false); }
  sample.forEach((c, i) => { if (off[i] !== on[i]) expect(c.ids.some(id => personGlyphs.some(g => g.id === id)), c.ids.join()).toBe(true); });
  for (const { ids, salt } of mixed.slice(0, 80)) { const t = S.adLibFor(ids, salt); for (const c of t.clauses) if (peopleRe.test(c.text)) expect(c.text).not.toMatch(darkRe); }
});
