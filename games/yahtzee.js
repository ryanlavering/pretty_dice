// Yahtzee rules (PD-142.5): pure scorers and the rule object. See docs/design/games-engine.md.
const count = (d, n) => d.filter(v => v === n).length;
const sum = d => d.reduce((a, b) => a + b, 0);
const counts = d => { const c = [0, 0, 0, 0, 0, 0, 0]; d.forEach(v => c[v]++); return c; };
const hasRun = (d, len) => { const s = new Set(d); for (let a = 1; a + len - 1 <= 6; a++) { let ok = true; for (let k = 0; k < len; k++) if (!s.has(a + k)) ok = false; if (ok) return true; } return false; };
export const isYahtzee = d => d.length === 5 && d.every(v => v === d[0]);

const UP = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
export const UP_IDS = UP;
const UPL = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes'];

// `joker` is true when the forced-Joker rule makes fixed-score categories score in full.
export const SCORERS = {
  threeKind: (d) => counts(d).some(c => c >= 3) ? sum(d) : 0,
  fourKind: (d) => counts(d).some(c => c >= 4) ? sum(d) : 0,
  fullHouse: (d, joker) => { const c = counts(d).filter(x => x); return joker || (c.length === 2 && c.includes(3)) ? 25 : 0; },
  smallStraight: (d, joker) => joker || hasRun(d, 4) ? 30 : 0,
  largeStraight: (d, joker) => joker || hasRun(d, 5) ? 40 : 0,
  yahtzee: (d) => isYahtzee(d) ? 50 : 0,
  chance: (d) => sum(d),
};
UP.forEach((id, i) => { SCORERS[id] = d => count(d, i + 1) * (i + 1); });

export const CATEGORIES = [
  ...UP.map((id, i) => ({ id, label: UPL[i], section: 'upper' })),
  { id: 'threeKind', label: 'Three of a Kind', section: 'lower' },
  { id: 'fourKind', label: 'Four of a Kind', section: 'lower' },
  { id: 'fullHouse', label: 'Full House', section: 'lower' },
  { id: 'smallStraight', label: 'Small Straight', section: 'lower' },
  { id: 'largeStraight', label: 'Large Straight', section: 'lower' },
  { id: 'yahtzee', label: 'Yahtzee', section: 'lower' },
  { id: 'chance', label: 'Chance', section: 'lower' },
];

// Categories the player may pick for these dice, honouring the forced Joker rule.
// Returns { ids: [open categories allowed], joker: bool }.
export function allowed(card, dice, options) {
  const open = CATEGORIES.filter(c => card[c.id] == null).map(c => c.id);
  if (!options.joker || !isYahtzee(dice) || card.yahtzee == null) return { ids: open, joker: false };
  const upperId = UP[dice[0] - 1];
  if (card[upperId] == null) return { ids: [upperId], joker: true };
  const lower = open.filter(id => !UP.includes(id));
  return { ids: lower.length ? lower : open, joker: true };
}

export const points = (id, dice, joker) => SCORERS[id](dice, joker);
export const upperSubtotal = card => UP.reduce((a, id) => a + (card[id] || 0), 0);
export const upperBonus = card => upperSubtotal(card) >= 63 ? 35 : 0;
export const total = card => CATEGORIES.reduce((a, c) => a + (card[c.id] || 0), 0) + upperBonus(card) + 100 * (card.yahtzeeBonus || 0);

export const info = { id: 'yahtzee', name: 'Yahtzee', minPlayers: 1, maxPlayers: 6, dice: { count: 5, sides: 6 },
  options: [{ id: 'joker', label: 'Joker rules', type: 'bool', default: true }] };
