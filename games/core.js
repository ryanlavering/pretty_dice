// Turn/player model and the public API (PD-142.3). See docs/design/games-engine.md.
import * as Y from './yahtzee.js';
import * as Farkle from './farkle.js';
import * as Pig from './pig.js';
import * as Craps from './craps.js';
import * as ShutBox from './shutbox.js';
import * as ShipCaptain from './shipcaptain.js';
import * as Bunco from './bunco.js';
import * as Liars from './liarsdice.js';
import * as Bots from './bots.js';

const GAMES = { yahtzee: { info: Y.info, mod: yahtzeeEngine() }, farkle: { info: Farkle.info, mod: Farkle.engine }, pig: { info: Pig.info, mod: Pig.engine }, craps: { info: Craps.info, mod: Craps.engine },
  shutbox: { info: ShutBox.info, mod: ShutBox.engine }, shipcaptain: { info: ShipCaptain.info, mod: ShipCaptain.engine }, bunco: { info: Bunco.info, mod: Bunco.engine },
  liarsdice: { info: Liars.info, mod: Liars.engine } };

export const listGames = () => Object.values(GAMES).map(g => JSON.parse(JSON.stringify(g.info)));
const eng = s => { const g = GAMES[s.game]; if (!g) throw new Error('unknown game ' + s.game); return g.mod; };
const clone = s => JSON.parse(JSON.stringify(s));

export function newGame(id, { players = ['Player 1'], options = {}, bots = [] } = {}) {
  const g = GAMES[id]; if (!g) throw new Error('unknown game ' + id);
  const { minPlayers, maxPlayers } = g.info;
  if (players.length < minPlayers || players.length > maxPlayers) throw new Error(`${g.info.name} takes ${minPlayers}-${maxPlayers} players`);
  const opts = {}; g.info.options.forEach(o => { opts[o.id] = options[o.id] ?? o.default; });
  if (!Array.isArray(bots) || bots.some(b => !Number.isInteger(b) || b < 0 || b >= players.length)) throw new Error('bots must be seat indexes of players');
  const st = g.mod.init({ game: id, players: players.map(String), options: opts });
  if (bots.length) st.bots = [...new Set(bots)].sort((a, b) => a - b);
  return st;
}
export const status = (s, viewer) => { const v = eng(s).status(s, viewer), bots = s.bots || []; return { ...v, bots, botTurn: v.phase !== 'over' && bots.includes(v.player) }; };
export const rollSpec = s => eng(s).rollSpec(s);
export const suggest = (s, viewer) => eng(s).suggest(s, viewer);
// A copy of the state that is safe to show `viewer` (a player index, null for the public, or omitted for everything); hidden-information games blank other players' secrets.
export const redact = (s, viewer) => eng(s).redact ? eng(s).redact(s, viewer) : clone(s);
export const result = s => eng(s).result(s);
export const scorecard = (s, p) => eng(s).scorecard(s, p);
export function act(state, action) {
  if (state.redacted) return { ok: false, state, events: [], error: 'This is a redacted view; act on the full state' };
  const s = clone(state), ev = [];
  const err = eng(s).act(s, action || {}, ev);
  return err ? { ok: false, state, events: [], error: err } : { ok: true, state: s, events: ev };
}

function yahtzeeEngine() {
  const N = 5, ROLLS = 3;
  const cur = s => s.cards[s.turn.player];
  const view = s => {
    const t = s.turn, over = s.over, rolled = t.rollsUsed > 0;
    return { phase: over ? 'over' : rolled ? 'score' : 'roll', player: t.player, round: Math.min(t.round, 13), rounds: 13,
      rollsUsed: t.rollsUsed, rollsLeft: ROLLS - t.rollsUsed,
      canRoll: !over && t.rollsUsed < ROLLS && !(rolled && t.held.every(Boolean)), canHold: !over && rolled && t.rollsUsed < ROLLS,
      canScore: !over && rolled, held: t.held.slice(), dice: rolled ? t.dice.slice() : null,
      message: over ? 'Game over' : rolled ? `Roll ${t.rollsUsed} of ${ROLLS}` : `${s.players[t.player]}: roll` };
  };
  return {
    init: s => ({ ...s, over: false, cards: s.players.map(() => ({})), turn: { player: 0, round: 1, rollsUsed: 0, dice: Array(N).fill(0), held: Array(N).fill(false) } }),
    status: view,
    rollSpec: s => { const v = view(s); const slots = v.canRoll ? s.turn.held.map((h, i) => h ? -1 : i).filter(i => i >= 0) : []; return { slots, sides: slots.map(() => 6) }; },
    act(s, a, ev) {
      const v = view(s), t = s.turn;
      if (s.over) return 'The game is over';
      if (a.type === 'roll') {
        if (!v.canRoll) return 'No rolls left';
        const slots = t.held.map((h, i) => h ? -1 : i).filter(i => i >= 0);
        if (!Array.isArray(a.values) || a.values.length !== slots.length || a.values.some(x => !Number.isInteger(x) || x < 1 || x > 6)) return `Expected ${slots.length} values from 1 to 6`;
        slots.forEach((sl, k) => { t.dice[sl] = a.values[k]; }); t.rollsUsed++; ev.push({ type: 'rolled', player: t.player, dice: t.dice.slice() }); return;
      }
      if (a.type === 'hold') {
        if (!v.canHold) return 'Cannot hold now';
        if (!Number.isInteger(a.slot) || a.slot < 0 || a.slot >= N) return 'Bad slot';
        t.held[a.slot] = a.held === undefined ? !t.held[a.slot] : !!a.held; return;
      }
      if (a.type === 'score') {
        if (!v.canScore) return 'Roll first';
        const card = cur(s), ok = Y.allowed(card, t.dice, s.options);
        if (!ok.ids.includes(a.category)) return card[a.category] != null ? 'Category already used' : ok.joker ? 'Joker rule: pick the matching upper box' : 'Unknown category';
        const bonusYahtzee = Y.isYahtzee(t.dice) && card.yahtzee != null && card.yahtzee > 0;
        if (bonusYahtzee) { card.yahtzeeBonus = (card.yahtzeeBonus || 0) + 1; ev.push({ type: 'bonus', player: t.player, name: 'Yahtzee bonus', points: 100 }); }
        const pts = Y.points(a.category, t.dice, ok.joker);
        card[a.category] = pts; ev.push({ type: 'scored', player: t.player, category: a.category, points: pts });
        const before = Y.upperSubtotal(card) - pts;
        if (Y.UP_IDS.includes(a.category) && before < 63 && Y.upperSubtotal(card) >= 63) ev.push({ type: 'bonus', player: t.player, name: 'Upper bonus', points: 35 });
        const np = (t.player + 1) % s.players.length, nr = np === 0 ? t.round + 1 : t.round;
        if (nr > 13) { s.over = true; ev.push({ type: 'gameOver' }); return; }
        s.turn = { player: np, round: nr, rollsUsed: 0, dice: Array(N).fill(0), held: Array(N).fill(false) }; ev.push({ type: 'turn', player: np }); return;
      }
      return 'Unknown action ' + a.type;
    },
    suggest(s) {
      const t = s.turn, card = cur(s), rolled = t.rollsUsed > 0 && !s.over, ok = rolled ? Y.allowed(card, t.dice, s.options) : null;
      const rows = Y.CATEGORIES.map(c => {
        const taken = card[c.id] != null, can = !taken && (!ok || ok.ids.includes(c.id));
        return { category: c.id, label: c.label, points: taken ? card[c.id] : rolled && can ? Y.points(c.id, t.dice, ok.joker) : null, open: !taken, best: false };
      });
      const cand = rows.filter(r => r.open && r.points != null && (!ok || ok.ids.includes(r.category)));
      if (cand.length) cand.reduce((a, b) => b.points > a.points ? b : a).best = true;
      return rows;
    },
    scorecard(s, p) {
      const card = s.cards[p], row = c => ({ category: c.id, label: c.label, points: card[c.id] ?? null });
      return { sections: [
        { id: 'upper', label: 'Upper', rows: Y.CATEGORIES.filter(c => c.section === 'upper').map(row), subtotal: Y.upperSubtotal(card), bonus: Y.upperBonus(card) },
        { id: 'lower', label: 'Lower', rows: Y.CATEGORIES.filter(c => c.section === 'lower').map(row), subtotal: null, bonus: 100 * (card.yahtzeeBonus || 0) }], total: Y.total(card) };
    },
    result(s) {
      if (!s.over) return null;
      const rows = s.players.map((name, player) => ({ player, name, total: Y.total(s.cards[player]) })).sort((a, b) => b.total - a.total);
      rows.forEach((r, i) => { r.rank = i && r.total === rows[i - 1].total ? rows[i - 1].rank : i + 1; });
      return { ranking: rows, winners: rows.filter(r => r.rank === 1).map(r => r.player) };
    },
  };
}

// One action for a computer player (or null). `{type:'roll'}` has no values: the app throws the dice (see rollSpec), then calls act with the values.
// Pass `seat` to ask for a particular bot (Craps bot bettors); `seed` varies the (deterministic) choices.
export const botMove = (s, opts = {}) => Bots.botMove(s, opts, { status, suggest, rollSpec });
// Play bots until it is a human's turn (or the game ends), rolling seeded simulated dice; for tests and instant play. Returns { state, actions }.
export function runBots(state, { seed = 1, maxActions = 5000 } = {}) {
  const rng = Bots.mulberry32(seed >>> 0), actions = []; let s = state;
  for (let i = 0; i < maxActions; i++) {
    let a = botMove(s, { seed: i }); if (!a) break;
    if (a.type === 'roll' && !a.values) a = { type: 'roll', values: rollSpec(s).sides.map(n => 1 + Math.floor(rng() * n)) };
    const r = act(s, a); if (!r.ok) throw new Error(`bot made an illegal move ${JSON.stringify(a)}: ${r.error}`);
    s = r.state; actions.push(a);
  }
  return { state: s, actions };
}
