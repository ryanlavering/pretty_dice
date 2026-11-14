// Computer opponents (PD-142.24). botMove(state, opts) returns ONE action for the bot to take, or null when it is not a bot's turn / nothing to do.
// `{type:'roll'}` without values means "throw the dice" (the app throws, or runBots simulates), then act with the values.
// Deterministic: the same state and `seed` always give the same move (randomness, used for bluffing and tie-breaks, comes from a PRNG seeded by both).
import * as Y from './yahtzee.js';
import { unitFor, snapDown } from './craps.js';

export function hashSeed(state, seed = 0) {   // FNV-1a over the state text, mixed with the seed
  const str = JSON.stringify(state); let h = 2166136261 ^ seed;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const mulberry32 = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

const PAR = { ones: 2.1, twos: 5.3, threes: 8.6, fours: 12.1, fives: 15.7, sixes: 19.2, threeKind: 21.7, fourKind: 13.1, fullHouse: 22.6, smallStraight: 29.5, largeStraight: 32.7, yahtzee: 16.9, chance: 22 };
const FACE = { ones: 1, twos: 2, threes: 3, fours: 4, fives: 5, sixes: 6 };

// ---- Yahtzee: greedy against par, one-step lookahead over every set of dice to keep ----
function yahtzeeBestScore(s, dice, cache) {
  const key = cache && dice.slice().sort().join('');
  if (cache && cache.has(key)) return cache.get(key);
  const card = s.cards[s.turn.player], ok = Y.allowed(card, dice, s.options);
  let best = null;
  for (const id of ok.ids) {
    const pts = Y.points(id, dice, ok.joker);
    const v = pts - PAR[id] + (FACE[id] ? (pts - 3 * FACE[id]) * 0.5 : 0) + (id === 'yahtzee' && pts ? 20 : 0);
    if (!best || v > best.v) best = { id, v };
  }
  if (cache) cache.set(key, best);
  return best;
}
function yahtzeeMove(s) {
  const t = s.turn;
  if (t.rollsUsed === 0) return { type: 'roll' };
  const cache = new Map(), now = yahtzeeBestScore(s, t.dice, cache);
  if (t.rollsUsed >= 3) return { type: 'score', category: now.id };
  let bestMask = 0, bestEv = -Infinity;
  for (let mask = 0; mask < 32; mask++) {   // bit i set = keep slot i
    const free = [0, 1, 2, 3, 4].filter(i => !(mask >> i & 1)), n = free.length, total = 6 ** n;
    let sum = 0;
    for (let k = 0; k < total; k++) {
      const d = t.dice.slice(); let r = k;
      for (const sl of free) { d[sl] = r % 6 + 1; r = (r - (r % 6)) / 6; }
      sum += yahtzeeBestScore(s, d, cache).v;
    }
    const ev = sum / total;
    if (ev > bestEv + 1e-9) { bestEv = ev; bestMask = mask; }
  }
  if (now.v >= bestEv - 0.01) return { type: 'score', category: now.id };
  for (let i = 0; i < 5; i++) { const want = !!(bestMask >> i & 1); if (t.held[i] !== want) return { type: 'hold', slot: i, held: want }; }
  return { type: 'roll' };
}

// ---- Farkle: take the most points, bank at a threshold that falls with the dice left ----
const BANK_AT = { 0: 2500, 1: 300, 2: 350, 3: 400, 4: 600, 5: 1000, 6: 2500 };
function farkleMove(s, api) {
  const st = api.status(s);
  if (st.canScore) {
    const rows = api.suggest(s);
    const pick = rows.reduce((a, b) => (b.points > a.points || (b.points === a.points && b.slots.length < a.slots.length)) ? b : a);
    return { type: 'score', dice: pick.slots };
  }
  if (st.canBank) {
    const left = 6 - s.turn.aside.length, me = s.turn.player, mine = s.scores[me] + s.turn.total;
    const rivals = Math.max(...s.scores.filter((_, i) => i !== me), 0);
    if (st.finalRound) return mine > rivals ? { type: 'bank' } : { type: 'roll' };
    if (mine >= s.options.target || s.turn.total >= BANK_AT[left]) return { type: 'bank' };
  }
  return { type: 'roll' };
}

// ---- Pig: hold at 20 (or when that wins) ----
function pigMove(s) {
  const t = s.turn;
  if (t.total > 0 && (t.total >= 20 || s.scores[t.player] + t.total >= s.options.target)) return { type: 'bank' };
  return { type: 'roll' };
}

// ---- Craps: pass line plus full odds, then roll (a bot seat with no bankroll just watches) ----
function crapsBotSeats(s, seat) { return seat !== undefined ? [seat] : (s.bots || []); }
function crapsMove(s, opts) {
  if (s.rolling) return null;
  for (const p of crapsBotSeats(s, opts.seat)) {
    const bank = s.bankrolls[p], min = s.options.minBet, mine = k => s.bets.find(b => b.player === p && b.kind === k);
    if (!s.point && !mine('pass') && bank >= min) return { type: 'bet', kind: 'pass', amount: Math.min(2 * min, bank), player: p };
    if (s.point && mine('pass') && !mine('passOdds')) {
      const unit = unitFor('passOdds', s.point), amount = snapDown(Math.min(mine('pass').amount * s.options.oddsMax, bank), unit);
      if (amount >= unit) return { type: 'bet', kind: 'passOdds', amount, player: p };
    }
  }
  return (s.bots || []).includes(s.shooter) ? { type: 'roll' } : null;
}

// ---- Shut the Box: close the tile set that holds the highest tile (fewer tiles on a tie) ----
function shutboxMove(s, api) {
  const st = api.status(s);
  if (st.canRoll) return { type: 'roll' };
  const rows = api.suggest(s);
  const pick = rows.reduce((a, b) => (Math.max(...b.tiles) > Math.max(...a.tiles) || (Math.max(...b.tiles) === Math.max(...a.tiles) && b.tiles.length < a.tiles.length)) ? b : a);
  return { type: 'score', tiles: pick.tiles };
}

// ---- Ship, Captain and Crew: keep a decent cargo, otherwise roll on ----
function shipMove(s, api) {
  const st = api.status(s);
  if (st.canBank && st.cargo >= 9) return { type: 'bank' };
  return { type: 'roll' };
}

// ---- Liar's Dice: only ever looks at its own cup (status/suggest with its own seat as the viewer) ----
function liarsMove(s, api, seat, rng) {
  const st = api.status(s, seat);
  if (st.phase === 'roll') return { type: 'roll' };
  if (st.phase !== 'bid') return null;
  const rows = api.suggest(s, seat), raises = rows.filter(r => r.kind === 'raise'), ch = rows.find(r => r.kind === 'challenge');
  if (ch && ch.chance >= 0.6) return { type: 'challenge' };
  const bluff = rng() < 0.12, floor = bluff ? 0.25 : 0.5;
  const good = raises.filter(r => r.chance >= floor);
  if (!ch) {   // opening bid: the most ambitious one that is still likely
    const likely = raises.filter(r => r.chance >= 0.6);
    const pick = (likely.length ? likely : raises).reduce((a, b) => (b.quantity > a.quantity || (b.quantity === a.quantity && b.chance > a.chance)) ? b : a);
    return { type: 'bid', quantity: pick.quantity, face: pick.face };
  }
  if (good.length) { const pick = good[0]; return { type: 'bid', quantity: pick.quantity, face: pick.face }; }   // the smallest sensible raise
  if (ch.chance >= 0.2 || !raises.length) return { type: 'challenge' };
  return { type: 'bid', quantity: raises[0].quantity, face: raises[0].face };
}

export function botMove(s, opts = {}, api) {
  if (!s.bots || !s.bots.length) return null;
  const status = api.status(s);
  if (status.phase === 'over') return null;
  const rng = mulberry32(hashSeed(s, opts.seed || 0));
  if (s.game === 'craps') return crapsMove(s, opts);
  if (s.game === 'liarsdice' && status.phase === 'reveal') return s.counts.every((n, p) => n === 0 || s.bots.includes(p)) ? { type: 'next' } : null;   // nobody human left to press Next
  const seat = opts.seat ?? status.player;
  if (!s.bots.includes(seat) || (opts.seat === undefined && status.player !== seat)) return null;
  switch (s.game) {
    case 'yahtzee': return yahtzeeMove(s);
    case 'farkle': return farkleMove(s, api);
    case 'pig': return pigMove(s);
    case 'shutbox': return shutboxMove(s, api);
    case 'shipcaptain': return shipMove(s, api);
    case 'bunco': return { type: 'roll' };
    case 'liarsdice': return liarsMove(s, api, seat, rng);
  }
  return null;
}
