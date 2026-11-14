// Liar's Dice (PD-142.17): hidden information and bidding. See docs/design/games-hidden-info.md.
// Every read goes through a viewer: nothing returned for a viewer may depend on dice that viewer cannot see.
import { range } from './util.js';

export const info = { id: 'liarsdice', name: "Liar's Dice", minPlayers: 2, maxPlayers: 6, dice: { count: 5, sides: 6 }, hidden: true,
  options: [{ id: 'dice', label: 'Dice each', type: 'int', min: 3, max: 6, default: 5 },
            { id: 'wild', label: 'Ones are wild (bid 2-6 only)', type: 'bool', default: true }] };

const active = s => range(s.players.length).filter(p => s.counts[p] > 0);
const nextActive = (s, p) => { for (let k = 1; k <= s.players.length; k++) { const q = (p + k) % s.players.length; if (s.counts[q] > 0) return q; } return p; };
const total = s => s.counts.reduce((a, b) => a + b, 0);
const matches = (hand, face, wild) => hand.filter(v => v === face || (wild && face !== 1 && v === 1)).length;
const full = viewer => viewer === undefined || viewer === 'all';
const sees = (s, viewer, p) => full(viewer) || viewer === p || s.phase === 'reveal' || s.phase === 'over';
const shown = (s, viewer, p) => s.hands[p] && sees(s, viewer, p) ? s.hands[p].slice() : null;

function binomAtLeast(n, p, k) {   // P(X >= k), X ~ Binomial(n, p)
  if (k <= 0) return 1; if (k > n) return 0;
  let sum = 0, c = 1;
  for (let i = 0; i <= n; i++) { if (i >= k) sum += c * p ** i * (1 - p) ** (n - i); c = c * (n - i) / (i + 1); }
  return sum;
}
const chance = (s, own, q, f) => {   // chance that "at least q dice show f" is true, given the viewer's own dice
  const pFace = s.options.wild && f !== 1 ? 1 / 3 : 1 / 6;
  return binomAtLeast(total(s) - own.length, pFace, q - matches(own, f, s.options.wild));
};
const minBid = (s) => s.bid ? (s.bid.face >= 6 ? { quantity: s.bid.quantity + 1, face: s.options.wild ? 2 : 1 } : { quantity: s.bid.quantity, face: s.bid.face + 1 }) : { quantity: 1, face: s.options.wild ? 2 : 1 };

function newRound(s) {
  s.round++; s.phase = 'roll'; s.bid = null; s.reveal = null;
  s.hands = s.players.map(() => null);
  s.current = active(s)[0];
}

export const engine = {
  init(s) {
    const b = { ...s, over: false, phase: 'roll', round: 0, counts: s.players.map(() => s.options.dice), hands: [], bid: null, current: 0, starter: 0, out: [], reveal: null };
    newRound(b); return b;
  },
  status(s, viewer) {
    const phase = s.over ? 'over' : s.phase, cur = s.current;
    const cups = s.players.map((name, p) => ({ player: p, name, count: s.counts[p], dice: shown(s, viewer, p) }));
    return { phase, player: cur, handoff: phase === 'roll' || phase === 'bid' ? cur : null, viewer: viewer === undefined ? 'all' : viewer, round: s.round, rounds: null,
      rollsUsed: 0, rollsLeft: null, canRoll: phase === 'roll', canHold: false, canScore: false, canBank: false, held: [],
      dice: null, bid: s.bid ? { ...s.bid } : null, cups, totalDice: total(s), wild: s.options.wild,
      canBid: phase === 'bid', canChallenge: phase === 'bid' && !!s.bid, canNext: phase === 'reveal',
      reveal: (phase === 'reveal' || phase === 'over') && s.reveal ? JSON.parse(JSON.stringify(s.reveal)) : null,
      message: phase === 'over' ? `${s.players[active(s)[0]]} wins` : phase === 'reveal' ? 'Reveal' : phase === 'roll' ? `${s.players[cur]}: roll your dice` : s.bid ? `${s.players[cur]}: raise or challenge` : `${s.players[cur]}: make the first bid` };
  },
  rollSpec(s) { return s.phase === 'roll' && !s.over ? { slots: range(s.counts[s.current]), sides: range(s.counts[s.current]).map(() => 6), private: true, player: s.current } : { slots: [], sides: [] }; },
  act(s, a, ev) {
    if (s.over) return 'The game is over';
    if (a.type === 'roll') {
      if (s.phase !== 'roll') return 'Not the time to roll';
      const p = s.current, n = s.counts[p];
      if (!Array.isArray(a.values) || a.values.length !== n || a.values.some(x => !Number.isInteger(x) || x < 1 || x > 6)) return `Expected ${n} values from 1 to 6`;
      s.hands[p] = a.values.slice(); ev.push({ type: 'rolled', player: p, private: true });
      const rest = active(s).filter(q => !s.hands[q]);
      if (rest.length) s.current = rest[0]; else { s.phase = 'bid'; s.current = s.starter; ev.push({ type: 'round', round: s.round, starter: s.starter }); }
      return;
    }
    if (a.type === 'bid') {
      if (s.phase !== 'bid') return 'Not the time to bid';
      const { quantity: q, face: f } = a;
      if (!Number.isInteger(q) || !Number.isInteger(f) || f < 1 || f > 6) return 'Bid a quantity and a face from 1 to 6';
      if (s.options.wild && f === 1) return 'Ones are wild: bid 2-6';
      if (q < 1 || q > total(s)) return `Quantity too high: ${total(s)} dice in play`;
      if (s.bid && !(q > s.bid.quantity || (q === s.bid.quantity && f > s.bid.face))) return 'Bid must raise the quantity or the face';
      s.bid = { player: s.current, quantity: q, face: f }; ev.push({ type: 'bid', player: s.current, quantity: q, face: f });
      s.current = nextActive(s, s.current); return;
    }
    if (a.type === 'challenge') {
      if (s.phase !== 'bid') return 'Not the time to challenge';
      if (!s.bid) return 'There is no bid to challenge';
      const challenger = s.current, bidder = s.bid.player;
      const count = active(s).reduce((n, p) => n + matches(s.hands[p], s.bid.face, s.options.wild), 0), bidTrue = count >= s.bid.quantity;
      const loser = bidTrue ? challenger : bidder;
      s.counts[loser]--; s.phase = 'reveal';
      s.reveal = { count, quantity: s.bid.quantity, face: s.bid.face, bidTrue, challenger, bidder, loser, winner: bidTrue ? bidder : challenger, hands: s.hands.map(h => h && h.slice()) };
      ev.push({ type: 'challenge', player: challenger, target: bidder }, { type: 'reveal', ...JSON.parse(JSON.stringify(s.reveal)) }, { type: 'lostDie', player: loser, left: s.counts[loser] });
      if (s.counts[loser] === 0) { s.out.push(loser); ev.push({ type: 'eliminated', player: loser }); }
      s.starter = s.counts[loser] > 0 ? loser : nextActive(s, loser);
      if (active(s).length === 1) { s.over = true; s.phase = 'over'; ev.push({ type: 'gameOver' }); }
      return;
    }
    if (a.type === 'next') {
      if (s.phase !== 'reveal') return 'Nothing to continue';
      newRound(s); ev.push({ type: 'turn', player: s.current }); return;
    }
    return 'Unknown action ' + a.type;
  },
  // Legal bids for the viewer when it is their turn, with the chance each is true given the viewer's own dice.
  suggest(s, viewer) {
    if (s.over || s.phase !== 'bid') return [];
    const who = full(viewer) ? s.current : viewer, own = s.hands[who];
    if (!own) return [];
    const rows = [], top = s.bid ? s.bid.quantity + 2 : total(s), lo = minBid(s);
    if (s.bid) rows.push({ kind: 'challenge', label: 'Challenge', quantity: null, face: null, chance: 1 - chance(s, own, s.bid.quantity, s.bid.face) });
    for (let q = lo.quantity; q <= Math.min(top, total(s)); q++) for (let f = s.options.wild ? 2 : 1; f <= 6; f++) {
      if (s.bid && q === s.bid.quantity && f <= s.bid.face) continue;
      rows.push({ kind: 'raise', label: `${q} x ${f}`, quantity: q, face: f, chance: chance(s, own, q, f) });
    }
    return rows;
  },
  redact(s, viewer) {
    const r = JSON.parse(JSON.stringify(s)); r.redacted = true;
    r.hands = r.hands.map((h, p) => (h && sees(s, viewer, p)) ? h : null);
    if (!(s.phase === 'reveal' || s.phase === 'over') && r.reveal) r.reveal = null;
    return r;
  },
  scorecard: (s, p) => ({ sections: [], total: s.counts[p] }),
  result(s) {
    if (!s.over) return null;
    const order = [active(s)[0], ...s.out.slice().reverse()];
    const ranking = order.map((player, i) => ({ player, name: s.players[player], total: s.counts[player], rank: i + 1 }));
    return { ranking, winners: [order[0]] };
  },
};
