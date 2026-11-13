// Craps (PD-142.7): play-money table. Two dice, one shooter at a time, every player can bet. See docs/design/games-engine.md.
// Bets: pass, dontPass (come-out only), passOdds, dontPassOdds (point stage, behind the line bet), field (one roll), place 4/5/6/8/9/10.
// Payouts are rounded down to whole units. Place bets are off on the come-out roll. 12 is barred on don't pass (push).
import { rank } from './util.js';

export const info = { id: 'craps', name: 'Craps', minPlayers: 1, maxPlayers: 6, dice: { count: 2, sides: 6 },
  options: [{ id: 'bankroll', label: 'Starting bankroll', type: 'int', min: 50, max: 10000, default: 500 },
            { id: 'minBet', label: 'Minimum bet', type: 'int', min: 1, max: 100, default: 5 },
            { id: 'oddsMax', label: 'Max odds multiple', type: 'int', min: 1, max: 10, default: 3 }] };

export const POINTS = [4, 5, 6, 8, 9, 10];
const PLACE = { 4: [9, 5], 5: [7, 5], 6: [7, 6], 8: [7, 6], 9: [7, 5], 10: [9, 5] };    // pays [num, den] : 1
const TRUE = { 4: [2, 1], 10: [2, 1], 5: [3, 2], 9: [3, 2], 6: [6, 5], 8: [6, 5] };       // odds pay on the point
const LAY = { 4: [1, 2], 10: [1, 2], 5: [2, 3], 9: [2, 3], 6: [5, 6], 8: [5, 6] };
const FIELD_WIN = { 2: 2, 3: 1, 4: 1, 9: 1, 10: 1, 11: 1, 12: 2 };
const mul = (amt, [n, d]) => Math.floor(amt * n / d);
export const HELP = {
  pass: 'Wins on 7 or 11 on the come-out roll, loses on 2, 3 or 12. Any other number becomes the point: you win if it rolls again before a 7. Pays 1:1.',
  dontPass: "The opposite of the pass line: wins on 2 or 3, loses on 7 or 11, 12 is a tie. Once there is a point you win if a 7 comes before it. Pays 1:1.",
  passOdds: 'An extra bet behind the pass line once a point is set. Pays true odds with no house edge: 2:1 on 4 or 10, 3:2 on 5 or 9, 6:5 on 6 or 8.',
  dontPassOdds: "An extra bet behind don't pass (laying odds). Wins when a 7 comes first: pays 1:2 against 4 or 10, 2:3 against 5 or 9, 5:6 against 6 or 8.",
  field: 'One-roll bet. Wins on 2, 3, 4, 9, 10, 11, 12 (2 and 12 pay double), loses on 5, 6, 7, 8. Pays 1:1.',
  place: 'Bet that the number rolls before a 7. Stays up after winning. Pays 9:5 on 4 or 10, 7:5 on 5 or 9, 7:6 on 6 or 8. Off on the come-out roll.' };
export const LABELS = { pass: 'Pass line', dontPass: "Don't pass", passOdds: 'Pass odds', dontPassOdds: "Don't pass odds (lay)", field: 'Field', place: 'Place' };

const stage = s => s.point ? 'point' : 'comeOut';
const mine = (s, p, kind) => s.bets.find(b => b.player === p && b.kind === kind);

export const engine = {
  init: s => ({ ...s, over: false, point: null, shooter: 0, bankrolls: s.players.map(() => s.options.bankroll), bets: [], nextId: 1, last: null, rolls: 0 }),
  status(s) {
    return { phase: s.over ? 'over' : 'roll', player: s.shooter, round: 0, rounds: null, rollsUsed: s.rolls, rollsLeft: null,
      canRoll: !s.over, canHold: false, canScore: false, canBank: false, held: [false, false], dice: s.last ? s.last.slice() : null,
      stage: stage(s), point: s.point, bankrolls: s.bankrolls.slice(), bets: JSON.parse(JSON.stringify(s.bets)),
      message: s.over ? 'Table closed' : s.point ? `Point is ${s.point}` : 'Come-out roll' };
  },
  rollSpec: s => s.over ? { slots: [], sides: [] } : { slots: [0, 1], sides: [6, 6] },
  act(s, a, ev) {
    if (s.over) return 'The table is closed';
    if (a.type === 'bet') return placeBet(s, a, ev);
    if (a.type === 'removeBet') return removeBet(s, a, ev);
    if (a.type === 'roll') {
      if (!Array.isArray(a.values) || a.values.length !== 2 || a.values.some(x => !Number.isInteger(x) || x < 1 || x > 6)) return 'Expected two values from 1 to 6';
      return resolve(s, a.values, ev);
    }
    if (a.type === 'end') {
      s.bets.forEach(b => { s.bankrolls[b.player] += b.amount; }); s.bets = []; s.over = true; ev.push({ type: 'gameOver' }); return;
    }
    return 'Unknown action ' + a.type;
  },
  // Bets the given player (default shooter) could place right now.
  suggest(s) {
    if (s.over) return [];
    const p = s.shooter, out = [], min = s.options.minBet, st = stage(s);
    const row = (kind, extra = {}, available = true, note = '') => out.push({ kind, label: LABELS[kind] + (extra.number ? ' ' + extra.number : ''), minBet: min, available: available && s.bankrolls[p] >= min, note, help: HELP[kind], ...extra });
    row('pass', {}, st === 'comeOut' && !mine(s, p, 'pass'), st === 'comeOut' ? '' : 'Come-out only');
    row('dontPass', {}, st === 'comeOut' && !mine(s, p, 'dontPass'), st === 'comeOut' ? '' : 'Come-out only');
    row('passOdds', {}, st === 'point' && !!mine(s, p, 'pass') && !mine(s, p, 'passOdds'), 'Needs a pass line bet and a point');
    row('dontPassOdds', {}, st === 'point' && !!mine(s, p, 'dontPass') && !mine(s, p, 'dontPassOdds'), "Needs a don't pass bet and a point");
    row('field');
    POINTS.forEach(number => row('place', { number }, !s.bets.some(b => b.player === p && b.kind === 'place' && b.number === number)));
    return out;
  },
  scorecard: (s, p) => ({ sections: [], total: s.bankrolls[p], bets: s.bets.filter(b => b.player === p) }),
  result: s => s.over ? rank(s.players, s.bankrolls) : null,
};

function placeBet(s, a, ev) {
  const p = a.player ?? s.shooter, kind = a.kind, amt = a.amount, st = stage(s);
  if (!Number.isInteger(p) || p < 0 || p >= s.players.length) return 'Unknown player';
  if (!LABELS[kind]) return 'Unknown bet';
  if (!Number.isInteger(amt) || amt < s.options.minBet) return `Minimum bet is ${s.options.minBet}`;
  if (amt > s.bankrolls[p]) return 'Not enough in the bankroll';
  const bet = { id: s.nextId, player: p, kind, amount: amt };
  if (kind === 'pass' || kind === 'dontPass') {
    if (st !== 'comeOut') return `${LABELS[kind]} is a come-out bet`;
    if (mine(s, p, kind)) return `You already have a ${LABELS[kind]} bet`;
  } else if (kind === 'passOdds' || kind === 'dontPassOdds') {
    const line = mine(s, p, kind === 'passOdds' ? 'pass' : 'dontPass');
    if (st !== 'point') return 'Odds need a point';
    if (!line) return `${LABELS[kind]} needs a ${kind === 'passOdds' ? 'pass line' : "don't pass"} bet`;
    if (mine(s, p, kind)) return 'Odds already placed';
    if (amt > line.amount * s.options.oddsMax) return `Odds are limited to ${s.options.oddsMax}x the line bet (${line.amount * s.options.oddsMax})`;
    bet.number = s.point;
  } else if (kind === 'place') {
    if (!POINTS.includes(a.number)) return 'Place 4, 5, 6, 8, 9 or 10';
    if (s.bets.some(b => b.player === p && b.kind === 'place' && b.number === a.number)) return `Already placed on ${a.number}`;
    bet.number = a.number;
  }
  s.nextId++; s.bankrolls[p] -= amt; s.bets.push(bet); ev.push({ type: 'betPlaced', player: p, id: bet.id, kind, number: bet.number ?? null, amount: amt });
}

function removeBet(s, a, ev) {
  const b = s.bets.find(x => x.id === a.id);
  if (!b) return 'No such bet';
  if (b.kind === 'pass' || b.kind === 'field') return `${LABELS[b.kind]} bets cannot be taken down`;
  if (b.kind === 'dontPass' && !s.point) return "Don't pass can only be taken down once a point is set";
  const gone = s.bets.filter(x => x === b || (b.kind === 'dontPass' && x.player === b.player && x.kind === 'dontPassOdds'));
  gone.forEach(x => { s.bankrolls[x.player] += x.amount; ev.push({ type: 'betRemoved', player: x.player, id: x.id, kind: x.kind, amount: x.amount }); });
  s.bets = s.bets.filter(x => !gone.includes(x));
}

function resolve(s, dice, ev) {
  const t = dice[0] + dice[1], point = s.point, keep = [];
  s.rolls++; s.last = dice.slice(); ev.push({ type: 'rolled', player: s.shooter, dice: dice.slice(), total: t });
  const settle = (b, result, payout = 0, stays = false) => {   // win: stake + payout back (payout only if the bet stays up); push: stake back; lose: nothing
    if (result === 'win') s.bankrolls[b.player] += (stays ? 0 : b.amount) + payout; else if (result === 'push') s.bankrolls[b.player] += b.amount;
    ev.push({ type: 'payout', player: b.player, id: b.id, kind: b.kind, number: b.number ?? null, result, amount: result === 'win' ? payout : result === 'lose' ? -b.amount : 0 });
  };
  let sevenOut = false;
  for (const b of s.bets) {
    if (b.kind === 'field') { FIELD_WIN[t] ? settle(b, 'win', b.amount * FIELD_WIN[t]) : settle(b, 'lose'); continue; }
    if (!point) {   // come-out
      if (b.kind === 'pass') { if (t === 7 || t === 11) settle(b, 'win', b.amount); else if (t === 2 || t === 3 || t === 12) settle(b, 'lose'); else keep.push(b); }
      else if (b.kind === 'dontPass') { if (t === 7 || t === 11) settle(b, 'lose'); else if (t === 2 || t === 3) settle(b, 'win', b.amount); else if (t === 12) settle(b, 'push'); else keep.push(b); }
      else keep.push(b);   // place bets are off on the come-out
      continue;
    }
    if (t === point) {
      if (b.kind === 'pass') settle(b, 'win', b.amount);
      else if (b.kind === 'passOdds') settle(b, 'win', mul(b.amount, TRUE[b.number]));
      else if (b.kind === 'dontPass' || b.kind === 'dontPassOdds') settle(b, 'lose');
      else if (b.kind === 'place' && b.number === t) { settle(b, 'win', mul(b.amount, PLACE[t]), true); keep.push(b); }
      else keep.push(b);
    } else if (t === 7) {
      if (b.kind === 'pass' || b.kind === 'passOdds' || b.kind === 'place') settle(b, 'lose');
      else if (b.kind === 'dontPass') settle(b, 'win', b.amount);
      else if (b.kind === 'dontPassOdds') settle(b, 'win', mul(b.amount, LAY[b.number]));
      else keep.push(b);
    } else if (b.kind === 'place' && b.number === t) { settle(b, 'win', mul(b.amount, PLACE[t]), true); keep.push(b); }
    else keep.push(b);
  }
  s.bets = keep;
  if (!point && POINTS.includes(t)) { s.point = t; ev.push({ type: 'point', number: t }); }
  else if (point && t === point) { s.point = null; ev.push({ type: 'pointMade', number: t }); }
  else if (point && t === 7) { s.point = null; sevenOut = true; }
  if (sevenOut) { ev.push({ type: 'sevenOut', player: s.shooter }); if (s.players.length > 1) { s.shooter = (s.shooter + 1) % s.players.length; ev.push({ type: 'shooter', player: s.shooter }); } }
}
