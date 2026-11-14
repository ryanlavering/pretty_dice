// Craps (PD-142.7, .32): play-money table. Two dice, one shooter at a time, every player can bet. See docs/design/games-engine.md.
// Line bets: pass, dontPass (come-out only), passOdds, dontPassOdds. Come bets: come, dontCome (point stage), comeOdds, dontComeOdds (on a come bet that has a number).
// Number bets: place 4/5/6/8/9/10, hardway 4/6/8/10, bigSix, bigEight (all off on the come-out roll, stay up after winning).
// One-roll bets: field, anySeven, anyCraps, two, three, eleven, twelve, horn. Every stake is a multiple of its unit (see unitFor) so payouts are always whole chips. 12 is barred on don't pass / don't come (push).
import { rank } from './util.js';

export const CHIPS = [1, 5, 25, 100];   // denominations for the UI's chip stacks
export const info = { id: 'craps', name: 'Craps', minPlayers: 1, maxPlayers: 6, dice: { count: 2, sides: 6 }, chips: CHIPS,
  options: [{ id: 'bankroll', label: 'Starting bankroll', type: 'int', min: 50, max: 10000, default: 500 },
            { id: 'minBet', label: 'Minimum bet', type: 'int', min: 1, max: 100, default: 5 },
            { id: 'oddsMax', label: 'Max odds multiple', type: 'int', min: 1, max: 10, default: 3 }] };

export const POINTS = [4, 5, 6, 8, 9, 10];
export const HARDWAYS = [4, 6, 8, 10];
const PLACE = { 4: [9, 5], 5: [7, 5], 6: [7, 6], 8: [7, 6], 9: [7, 5], 10: [9, 5] };    // pays [num, den] : 1
const TRUE = { 4: [2, 1], 10: [2, 1], 5: [3, 2], 9: [3, 2], 6: [6, 5], 8: [6, 5] };       // odds pay on the point
const LAY = { 4: [1, 2], 10: [1, 2], 5: [2, 3], 9: [2, 3], 6: [5, 6], 8: [5, 6] };
const HARD = { 4: 7, 10: 7, 6: 9, 8: 9 };
const FIELD_WIN = { 2: 2, 3: 1, 4: 1, 9: 1, 10: 1, 11: 1, 12: 2 };
const PROP_PAYS = { anySeven: [[7], 4], anyCraps: [[2, 3, 12], 7], two: [[2], 30], three: [[3], 15], eleven: [[11], 15], twelve: [[12], 30] };
const mul = (amt, [n, d]) => Math.floor(amt * n / d);
const gcd = (a, b) => b ? gcd(b, a % b) : a;
// Pay ratio [n, d] (n:d to 1) for the bets whose payout is not a whole multiple of the stake, else null.
const ratioFor = (kind, number) => kind === 'place' ? PLACE[number] : kind === 'passOdds' || kind === 'comeOdds' ? TRUE[number] : kind === 'dontPassOdds' || kind === 'dontComeOdds' ? LAY[number] : null;
// The bet unit: stakes must be multiples of it so every payout is a whole number of chips (place 6/8 pays 7:6 -> 6; place 4/5/9/10 -> 5; true odds 5/9 -> 2, 6/8 -> 5; lay odds 4/10 -> 2, 5/9 -> 3, 6/8 -> 6; horn -> 4).
export function unitFor(kind, number) {
  if (kind === 'horn') return 4;
  const r = ratioFor(kind, number); return r ? r[1] / gcd(r[0], r[1]) : 1;
}
export const snapDown = (amount, unit) => Math.floor(amount / unit) * unit;
const snapUp = (amount, unit) => Math.ceil(amount / unit) * unit;
const payText = (kind, number) => { const r = ratioFor(kind, number); if (r) return `${r[0]}:${r[1]}`; if (kind === 'hardway') return `${HARD[number]}:1`; if (PROP_PAYS[kind]) return `${PROP_PAYS[kind][1]}:1`; if (kind === 'horn') return '30:1 / 15:1'; return kind === 'field' ? '1:1 (2 and 12 pay 2:1)' : '1:1'; };

export const HELP = {
  pass: 'Wins on 7 or 11 on the come-out roll, loses on 2, 3 or 12. Any other number becomes the point: you win if it rolls again before a 7. Pays 1:1.',
  dontPass: "The opposite of the pass line: wins on 2 or 3, loses on 7 or 11, 12 is a tie. Once there is a point you win if a 7 comes before it. Pays 1:1.",
  passOdds: 'An extra bet behind the pass line once a point is set. Pays true odds with no house edge: 2:1 on 4 or 10, 3:2 on 5 or 9, 6:5 on 6 or 8, so stakes are multiples of 1, 2 or 5. Up to the odds limit; add or reduce by the unit.',
  dontPassOdds: "An extra bet behind don't pass (laying odds). Wins when a 7 comes first: pays 1:2 against 4 or 10, 2:3 against 5 or 9, 5:6 against 6 or 8, so stakes are multiples of 2, 3 or 6. Add or reduce by the unit.",
  come: "Like a pass line bet that starts on any roll once a point is set. The next roll is its come-out: 7 or 11 wins, 2, 3 or 12 loses, any other number becomes this bet's own point. Then it wins if that number rolls before a 7. Pays 1:1.",
  dontCome: "The opposite of a come bet: the next roll wins on 2 or 3, loses on 7 or 11, 12 is a tie; any other number is its point and you win if a 7 rolls first. Pays 1:1.",
  comeOdds: "Extra bet behind a come bet that has a number. Pays true odds (2:1 on 4 or 10, 3:2 on 5 or 9, 6:5 on 6 or 8), so stakes are multiples of 1, 2 or 5. Off on a come-out roll: it is returned instead of won or lost.",
  dontComeOdds: "Extra bet behind a don't come bet that has a number. Wins when a 7 comes first: pays 1:2 against 4 or 10, 2:3 against 5 or 9, 5:6 against 6 or 8. Stakes are multiples of 2, 3 or 6. Off on a come-out roll.",
  field: 'One-roll bet. Wins on 2, 3, 4, 9, 10, 11, 12 (2 and 12 pay double), loses on 5, 6, 7, 8. Pays 1:1.',
  place: 'Bet that the number rolls before a 7. Stays up after winning. Pays 9:5 on 4 or 10, 7:5 on 5 or 9, 7:6 on 6 or 8, so stakes are in multiples of 5 (6 on the 6 and 8) and every win is whole chips. Add to it or take part of it down by that unit any time. Off on the come-out roll.',
  hardway: 'Bet that the number rolls as a pair (2-2, 3-3, 4-4 or 5-5) before it rolls the easy way or a 7. Pays 7:1 on 4 or 10, 9:1 on 6 or 8. Stays up after winning. Off on the come-out roll.',
  bigSix: 'Wins when a 6 rolls before a 7. Pays 1:1 and stays up. Place 6 pays better (7:6 is worse than... see note: Big 6 is the worse bet). Off on the come-out roll.',
  bigEight: 'Wins when an 8 rolls before a 7. Pays 1:1 and stays up. Place 8 pays 7:6, which is the better bet. Off on the come-out roll.',
  anySeven: 'One roll: wins if the roll is a 7. Pays 4:1. A high house edge.',
  anyCraps: 'One roll: wins on 2, 3 or 12. Pays 7:1.',
  two: 'One roll: wins on 2 (snake eyes). Pays 30:1.',
  three: 'One roll: wins on 3. Pays 15:1.',
  eleven: 'One roll: wins on 11. Pays 15:1.',
  twelve: 'One roll: wins on 12 (boxcars). Pays 30:1.',
  horn: 'One roll, split in four equal parts on 2, 3, 11 and 12 (the amount must be a multiple of 4: 8, 12, 16, ...). Wins if any of those rolls: the one that hits pays 30:1 (2 or 12) or 15:1 (3 or 11) while the other three parts lose.',
};
HELP.bigSix = 'Wins when a 6 rolls before a 7. Pays 1:1 and stays up. Place 6 pays 7:6, which is the better bet. Off on the come-out roll.';
export const LABELS = { pass: 'Pass line', dontPass: "Don't pass", passOdds: 'Pass odds', dontPassOdds: "Don't pass odds (lay)", come: 'Come', dontCome: "Don't come",
  comeOdds: 'Come odds', dontComeOdds: "Don't come odds (lay)", field: 'Field', place: 'Place', hardway: 'Hard', bigSix: 'Big 6', bigEight: 'Big 8',
  anySeven: 'Any seven', anyCraps: 'Any craps', two: 'Two (snake eyes)', three: 'Three', eleven: 'Eleven', twelve: 'Twelve (boxcars)', horn: 'Horn' };
const ODDS_PARENT = { passOdds: 'pass', dontPassOdds: 'dontPass', comeOdds: 'come', dontComeOdds: 'dontCome' };

const stage = s => s.point ? 'point' : 'comeOut';
const mine = (s, p, kind) => s.bets.find(b => b.player === p && b.kind === kind);

export const engine = {
  init: s => ({ ...s, over: false, rolling: false, point: null, shooter: 0, bankrolls: s.players.map(() => s.options.bankroll), bets: [], nextId: 1, last: null, rolls: 0 }),
  status(s) {
    return { phase: s.over ? 'over' : 'roll', player: s.shooter, round: 0, rounds: null, rollsUsed: s.rolls, rollsLeft: null,
      canRoll: !s.over && !s.rolling, canHold: false, canScore: false, canBank: false, canBet: !s.over && !s.rolling, rolling: !!s.rolling, held: [false, false], dice: s.last ? s.last.slice() : null,
      stage: stage(s), point: s.point, bankrolls: s.bankrolls.slice(), chips: CHIPS.slice(),
      bets: s.bets.map(b => { const unit = unitFor(b.kind, b.number), idle = !s.over && !s.rolling; return { ...b, unit, canRemove: idle && !removeError(s, b), canReduce: idle && !reduceError(s, b, unit) }; }),
      message: s.over ? 'Table closed' : s.rolling ? 'Dice are rolling' : s.point ? `Point is ${s.point}` : 'Come-out roll' };
  },
  rollSpec: s => s.over ? { slots: [], sides: [] } : { slots: [0, 1], sides: [6, 6] },
  act(s, a, ev) {
    if (s.over) return 'The table is closed';
    if (a.type === 'rollStart') { if (s.rolling) return 'Dice are already rolling'; s.rolling = true; ev.push({ type: 'rollStart', player: s.shooter }); return; }
    if (a.type === 'rollCancel') { if (!s.rolling) return 'Dice are not rolling'; s.rolling = false; ev.push({ type: 'rollCancel' }); return; }
    if (a.type === 'roll') {
      if (!Array.isArray(a.values) || a.values.length !== 2 || a.values.some(x => !Number.isInteger(x) || x < 1 || x > 6)) return 'Expected two values from 1 to 6';
      s.rolling = false; return resolve(s, a.values, ev);
    }
    if (s.rolling) return 'No bets while the dice are rolling';
    if (a.type === 'bet') return placeBet(s, a, ev);
    if (a.type === 'removeBet') return removeBet(s, a, ev);
    if (a.type === 'end') {
      s.bets.forEach(b => { s.bankrolls[b.player] += b.amount; }); s.bets = []; s.over = true; ev.push({ type: 'gameOver' }); return;
    }
    return 'Unknown action ' + a.type;
  },
  // Bets the given player (default shooter) could place or add to right now, each with its unit and the amounts allowed.
  suggest(s, player) {
    if (s.over) return [];
    const p = player ?? s.shooter, out = [], st = stage(s), bank = s.bankrolls[p];
    const row = (kind, extra = {}, base = true, note = '', { num = extra.number, limit = null } = {}) => {
      const unit = unitFor(kind, num), ex = existing(s, p, { kind, number: num, on: extra.on }), minAmount = ex ? unit : minFor(s, kind, num);
      const room = limit == null ? bank : Math.min(bank, limit - (ex ? ex.amount : 0)), maxAmount = snapDown(Math.max(0, room), unit);
      const available = base && !s.rolling && maxAmount >= minAmount;
      out.push({ kind, label: LABELS[kind] + (extra.number ? ' ' + extra.number : ''), minBet: s.options.minBet, unit, minAmount, maxAmount: available ? maxAmount : 0, pays: payText(kind, num),
        available, note, help: HELP[kind], add: !!ex, id: ex ? ex.id : null, current: ex ? ex.amount : 0, ...extra });
    };
    const line = k => mine(s, p, k);
    row('pass', {}, st === 'comeOut', st === 'comeOut' ? '' : 'Come-out only');
    row('dontPass', {}, st === 'comeOut', st === 'comeOut' ? '' : 'Come-out only');
    row('come', {}, st === 'point', st === 'point' ? '' : 'Needs a point');
    row('dontCome', {}, st === 'point', st === 'point' ? '' : 'Needs a point');
    row('passOdds', {}, st === 'point' && !!line('pass'), 'Needs a pass line bet and a point', { num: s.point, limit: line('pass') ? line('pass').amount * s.options.oddsMax : 0 });
    row('dontPassOdds', {}, st === 'point' && !!line('dontPass'), "Needs a don't pass bet and a point", { num: s.point, limit: line('dontPass') ? line('dontPass').amount * s.options.oddsMax : 0 });
    for (const kind of ['comeOdds', 'dontComeOdds']) {
      const bets = s.bets.filter(b => b.player === p && b.kind === ODDS_PARENT[kind] && b.number != null);
      if (!bets.length) row(kind, {}, false, 'Needs a ' + LABELS[ODDS_PARENT[kind]].toLowerCase() + ' bet that has a number');
      bets.forEach(b => row(kind, { on: b.id, number: b.number }, true, '', { limit: b.amount * s.options.oddsMax }));
    }
    row('field');
    POINTS.forEach(number => row('place', { number }));
    HARDWAYS.forEach(number => row('hardway', { number }));
    row('bigSix', {}, true, '', { num: 6 }); row('bigEight', {}, true, '', { num: 8 });
    for (const kind of ['anySeven', 'anyCraps', 'two', 'three', 'eleven', 'twelve', 'horn']) row(kind);
    return out;
  },
  scorecard: (s, p) => ({ sections: [], total: s.bankrolls[p], bets: s.bets.filter(b => b.player === p) }),
  result: s => s.over ? rank(s.players, s.bankrolls) : null,
};

const REDUCIBLE = ['place', 'hardway', 'bigSix', 'bigEight', 'passOdds', 'dontPassOdds', 'comeOdds', 'dontComeOdds'];
// The least a new bet can be: the table minimum rounded up to a unit multiple; odds sit behind a line bet that already met the minimum, so one unit will do.
const minFor = (s, kind, number) => ODDS_PARENT[kind] ? unitFor(kind, number) : snapUp(s.options.minBet, unitFor(kind, number));
// The bet a new bet of this kind would be added to (press), if there is one.
function existing(s, p, a) {
  const k = a.kind;
  if (k === 'comeOdds' || k === 'dontComeOdds') return s.bets.find(b => b.kind === k && b.on === a.on);
  if (k === 'place' || k === 'hardway') return s.bets.find(b => b.player === p && b.kind === k && b.number === a.number);
  if (k === 'come' || k === 'dontCome' || k === 'field' || k === 'horn' || PROP_PAYS[k]) return null;
  return mine(s, p, k);
}
function removeError(s, b) {   // can this bet come down whole right now?
  if (b.kind === 'pass' || b.kind === 'come' || b.kind === 'field' || PROP_PAYS[b.kind] || b.kind === 'horn') return `${LABELS[b.kind]} bets cannot be taken down`;
  if (b.kind === 'dontPass' && !s.point) return "Don't pass can only be taken down once a point is set";
  return null;
}
function reduceError(s, b, unit) {   // can this bet be reduced by one unit? (line bets cannot be reduced, only taken down whole)
  if (!REDUCIBLE.includes(b.kind)) return `${LABELS[b.kind]} bets can only be taken down whole`;
  const floor = ODDS_PARENT[b.kind] ? unit : minFor(s, b.kind, b.number);
  return b.amount - unit >= floor ? null : 'Nothing to take off but the whole bet';
}
const unitError = (label, kind, number, unit, from) => {
  const eg = [0, 1, 2].map(k => snapUp(from, unit) + k * unit).join(', ');
  const r = ratioFor(kind, number), why = r ? `pays ${r[0]}:${r[1]}` : kind === 'horn' ? 'is split four ways' : 'has a unit';
  return `${label} ${why}, so bet in multiples of ${unit} (${eg}, ...)`;
};

function placeBet(s, a, ev) {
  const p = a.player ?? s.shooter, kind = a.kind, amt = a.amount, st = stage(s);
  if (!Number.isInteger(p) || p < 0 || p >= s.players.length) return 'Unknown player';
  if (!LABELS[kind]) return 'Unknown bet';
  if (!Number.isInteger(amt) || amt < 1) return 'Bet a whole number of chips';
  let number = a.number, line = null, on = null, limit = Infinity;
  if (kind === 'pass' || kind === 'dontPass') {
    if (st !== 'comeOut') return `${LABELS[kind]} is a come-out bet`;
  } else if (kind === 'come' || kind === 'dontCome') {
    if (st !== 'point') return `${LABELS[kind]} bets need a point`;
  } else if (kind === 'passOdds' || kind === 'dontPassOdds') {
    line = mine(s, p, ODDS_PARENT[kind]);
    if (st !== 'point') return 'Odds need a point';
    if (!line) return `${LABELS[kind]} needs a ${kind === 'passOdds' ? 'pass line' : "don't pass"} bet`;
    number = s.point; limit = line.amount * s.options.oddsMax;
    if (existing(s, p, { kind }) && existing(s, p, { kind }).number !== number) return 'Odds belong to the current point';
  } else if (kind === 'comeOdds' || kind === 'dontComeOdds') {
    line = s.bets.find(b => b.id === a.on && b.player === p && b.kind === ODDS_PARENT[kind]);
    if (!line) return `${LABELS[kind]} goes behind one of your ${LABELS[ODDS_PARENT[kind]].toLowerCase()} bets (pass its id as "on")`;
    if (line.number == null) return `That ${LABELS[line.kind].toLowerCase()} bet has no number yet`;
    number = line.number; on = line.id; limit = line.amount * s.options.oddsMax;
  } else if (kind === 'place' || kind === 'hardway') {
    if (!(kind === 'place' ? POINTS : HARDWAYS).includes(number)) return kind === 'place' ? 'Place 4, 5, 6, 8, 9 or 10' : 'Hardways are 4, 6, 8 or 10';
  } else if (kind === 'bigSix' || kind === 'bigEight') number = kind === 'bigSix' ? 6 : 8;
  const ex = existing(s, p, { kind, number, on: on ?? undefined }), unit = unitFor(kind, number), label = LABELS[kind] + (kind === 'place' || kind === 'hardway' || kind === 'comeOdds' || kind === 'dontComeOdds' ? ' ' + number : '');
  const total = (ex ? ex.amount : 0) + amt;
  if (limit !== Infinity && total > limit) return `Odds are limited to ${s.options.oddsMax}x the line bet (${limit})`;
  if (amt > s.bankrolls[p]) return 'Not enough in the bankroll';
  if (amt % unit) return unitError(label, kind, number, unit, ex ? unit : minFor(s, kind, number));
  if (!ex && amt < minFor(s, kind, number)) return `Minimum bet is ${minFor(s, kind, number)}`;
  s.bankrolls[p] -= amt;
  if (ex) { ex.amount = total; ev.push({ type: 'betPlaced', player: p, id: ex.id, kind, number: ex.number ?? null, on: ex.on ?? null, amount: amt, total, added: true }); return; }
  const bet = { id: s.nextId++, player: p, kind, amount: amt };
  if (number != null && kind !== 'come' && kind !== 'dontCome') bet.number = number;
  if (on != null) bet.on = on;
  s.bets.push(bet);
  ev.push({ type: 'betPlaced', player: p, id: bet.id, kind, number: bet.number ?? null, on: bet.on ?? null, amount: amt, total: amt, added: false });
}

function removeBet(s, a, ev) {
  const b = s.bets.find(x => x.id === a.id);
  if (!b) return 'No such bet';
  const unit = unitFor(b.kind, b.number);
  if (a.amount !== undefined && a.amount !== b.amount) {   // take part of it down (place, hardway, big 6/8 and odds only)
    const amt = a.amount;
    if (!Number.isInteger(amt) || amt < 1) return 'Take down a whole number of chips';
    if (amt > b.amount) return `Only ${b.amount} is on that bet`;
    if (!REDUCIBLE.includes(b.kind)) return `${LABELS[b.kind]} bets can only be taken down whole`;
    if (amt % unit) return unitError(LABELS[b.kind] + (b.number ? ' ' + b.number : ''), b.kind, b.number, unit, unit);
    const floor = ODDS_PARENT[b.kind] ? unit : minFor(s, b.kind, b.number);
    if (b.amount - amt < floor) return `The least left on this bet is ${floor}: take it all down instead`;
    b.amount -= amt; s.bankrolls[b.player] += amt;
    ev.push({ type: 'betRemoved', player: b.player, id: b.id, kind: b.kind, amount: amt, partial: true, remaining: b.amount }); return;
  }
  const e = removeError(s, b); if (e) return e;
  const gone = s.bets.filter(x => x === b || ((b.kind === 'dontPass' || b.kind === 'dontCome') && x.on === b.id) || (b.kind === 'dontPass' && x.player === b.player && x.kind === 'dontPassOdds'));
  gone.forEach(x => { s.bankrolls[x.player] += x.amount; ev.push({ type: 'betRemoved', player: x.player, id: x.id, kind: x.kind, amount: x.amount, partial: false, remaining: 0 }); });
  s.bets = s.bets.filter(x => !gone.includes(x));
}

// What one roll does to one bet: null = nothing, else { r: 'win'|'lose'|'push', pay, stays, move }. `point` is the point before this roll.
const W = (pay, stays) => ({ r: 'win', pay, stays }), L = { r: 'lose' }, P = { r: 'push' };
function judge(b, t, dice, point) {
  const a = b.amount, n = b.number, hit = c => c.includes(t);
  if (PROP_PAYS[b.kind]) return hit(PROP_PAYS[b.kind][0]) ? W(a * PROP_PAYS[b.kind][1]) : L;
  switch (b.kind) {
    case 'field': return FIELD_WIN[t] ? W(a * FIELD_WIN[t]) : L;
    case 'horn': { const u = a / 4; return t === 2 || t === 12 ? W(27 * u) : t === 3 || t === 11 ? W(12 * u) : L; }
    case 'pass': return !point ? (hit([7, 11]) ? W(a) : hit([2, 3, 12]) ? L : null) : t === point ? W(a) : t === 7 ? L : null;
    case 'dontPass': return !point ? (hit([7, 11]) ? L : hit([2, 3]) ? W(a) : t === 12 ? P : null) : t === point ? L : t === 7 ? W(a) : null;
    case 'passOdds': return t === n ? W(mul(a, TRUE[n])) : t === 7 ? L : null;
    case 'dontPassOdds': return t === n ? L : t === 7 ? W(mul(a, LAY[n])) : null;
    case 'come': if (n == null) return hit([7, 11]) ? W(a) : hit([2, 3, 12]) ? L : { move: t }; return t === n ? W(a) : t === 7 ? L : null;
    case 'dontCome': if (n == null) return hit([7, 11]) ? L : hit([2, 3]) ? W(a) : t === 12 ? P : { move: t }; return t === n ? L : t === 7 ? W(a) : null;
    case 'comeOdds': return t !== n && t !== 7 ? null : !point ? P : t === n ? W(mul(a, TRUE[n])) : L;   // odds are off on a come-out roll
    case 'dontComeOdds': return t !== n && t !== 7 ? null : !point ? P : t === n ? L : W(mul(a, LAY[n]));
    case 'place': return !point ? null : t === n ? W(mul(a, PLACE[n]), true) : t === 7 ? L : null;
    case 'hardway': return !point ? null : t === 7 ? L : t === n ? (dice[0] === dice[1] ? W(a * HARD[n], true) : L) : null;
    case 'bigSix': case 'bigEight': return !point ? null : t === n ? W(a, true) : t === 7 ? L : null;
  }
  return null;
}

function resolve(s, dice, ev) {
  const t = dice[0] + dice[1], point = s.point, keep = [];
  s.rolls++; s.last = dice.slice(); ev.push({ type: 'rolled', player: s.shooter, dice: dice.slice(), total: t });
  for (const b of s.bets) {
    const j = judge(b, t, dice, point);
    if (!j) { keep.push(b); continue; }
    if (j.move) { b.number = j.move; keep.push(b); ev.push({ type: 'comeMove', player: b.player, id: b.id, kind: b.kind, number: b.number }); continue; }
    // win: stake + payout back (payout only if the bet stays up); push: stake back; lose: nothing
    if (j.r === 'win') s.bankrolls[b.player] += (j.stays ? 0 : b.amount) + j.pay; else if (j.r === 'push') s.bankrolls[b.player] += b.amount;
    ev.push({ type: 'payout', player: b.player, id: b.id, kind: b.kind, number: b.number ?? null, result: j.r, amount: j.r === 'win' ? j.pay : j.r === 'lose' ? -b.amount : 0 });
    if (j.stays && j.r === 'win') keep.push(b);
  }
  s.bets = keep;
  let sevenOut = false;
  if (!point && POINTS.includes(t)) { s.point = t; ev.push({ type: 'point', number: t }); }
  else if (point && t === point) { s.point = null; ev.push({ type: 'pointMade', number: t }); }
  else if (point && t === 7) { s.point = null; sevenOut = true; }
  if (sevenOut) { ev.push({ type: 'sevenOut', player: s.shooter }); if (s.players.length > 1) { s.shooter = (s.shooter + 1) % s.players.length; ev.push({ type: 'shooter', player: s.shooter }); } }
}
