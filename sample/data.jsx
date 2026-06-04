// data.jsx — squad template, schedule, ratings + season simulation.
// (Player data comes from api.jsx → fetchShortlist.)

// ── Your squad: 9 star slots ──────────────────────────────────
const SLOTS = [
  { key: 'QB',  group: 'QB',  label: 'QB',  side: 'OFF' },
  { key: 'RB',  group: 'RB',  label: 'RB',  side: 'OFF' },
  { key: 'WR1', group: 'WR',  label: 'WR',  side: 'OFF' },
  { key: 'WR2', group: 'WR',  label: 'WR',  side: 'OFF' },
  { key: 'WR3', group: 'WR',  label: 'WR',  side: 'OFF' },
  { key: 'TE',  group: 'TE',  label: 'TE',  side: 'OFF' },
  { key: 'DP1', group: 'DEF', label: 'DEF', side: 'DEF' },
  { key: 'DP2', group: 'DEF', label: 'DEF', side: 'DEF' },
  { key: 'DP3', group: 'DEF', label: 'DEF', side: 'DEF' },
];
// which slot keys a picked player's group can occupy (in fill order)
const GROUP_SLOTS = {
  QB: ['QB'], RB: ['RB'], WR: ['WR1', 'WR2', 'WR3'], TE: ['TE'], DEF: ['DP1', 'DP2', 'DP3'],
};
// first open slot for a group, or null if that group is full
function openSlotForGroup(squad, group) {
  return (GROUP_SLOTS[group] || []).find(k => !squad[k]) || null;
}

// ── 17-game schedule (fictional opponents) ────────────────────
const SCHEDULE = [
  { wk: 1,  abbr: 'OAK', city: 'Oakhaven',  off: 72, def: 70 },
  { wk: 2,  abbr: 'STC', city: 'St. Cloud', off: 68, def: 74 },
  { wk: 3,  abbr: 'RDG', city: 'Ridgeport', off: 80, def: 78 },
  { wk: 4,  abbr: 'CTN', city: 'Canton',    off: 65, def: 67 },
  { wk: 5,  abbr: 'MES', city: 'Mesa',      off: 84, def: 79 },
  { wk: 6,  abbr: 'BRL', city: 'Burlington',off: 71, def: 73 },
  { wk: 7,  abbr: 'KEY', city: 'Key West',  off: 77, def: 70 },
  { wk: 8,  abbr: 'DUL', city: 'Duluth',    off: 69, def: 81 },
  { wk: 9,  abbr: 'SAV', city: 'Savannah',  off: 88, def: 85 },
  { wk: 10, abbr: 'TUL', city: 'Tulsa',     off: 73, def: 66 },
  { wk: 11, abbr: 'PRO', city: 'Provo',     off: 79, def: 76 },
  { wk: 12, abbr: 'ALB', city: 'Albany',    off: 66, def: 72 },
  { wk: 13, abbr: 'RNO', city: 'Reno',      off: 82, def: 80 },
  { wk: 14, abbr: 'MOB', city: 'Mobile',    off: 70, def: 68 },
  { wk: 15, abbr: 'SPK', city: 'Spokane',   off: 86, def: 83 },
  { wk: 16, abbr: 'ERI', city: 'Erie',      off: 74, def: 71 },
  { wk: 17, abbr: 'GLD', city: 'Galveston', off: 91, def: 89 },
];

// ── ratings ───────────────────────────────────────────────────
function tierOf(ovr) {
  if (ovr >= 90) return { key: 'elite', label: 'ELITE' };
  if (ovr >= 82) return { key: 'great', label: 'GREAT' };
  if (ovr >= 73) return { key: 'good',  label: 'SOLID' };
  if (ovr >= 64) return { key: 'avg',   label: 'AVG' };
  return { key: 'bad', label: 'LIABILITY' };
}
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function teamRatings(squad) {
  const ovrOf = (k) => (squad[k] ? squad[k].ovr : 0);
  const wr = mean(['WR1', 'WR2', 'WR3'].map(ovrOf).filter(Boolean));
  const off = ovrOf('QB') * 0.34 + wr * 0.30 + ovrOf('RB') * 0.20 + ovrOf('TE') * 0.16;
  const def = mean(['DP1', 'DP2', 'DP3'].map(ovrOf).filter(Boolean));
  return { off: Math.round(off), def: Math.round(def), ovr: Math.round((off + def) / 2) };
}

function percentile(rtg) {
  const z = (rtg - 75) / 11;
  return Math.round(Math.max(1, Math.min(99, (1 / (1 + Math.exp(-1.7 * z))) * 100)));
}
function winProb(teamOvr, oppOff, oppDef) {
  const diff = teamOvr - (oppOff + oppDef) / 2;
  return 1 / (1 + Math.exp(-diff / 7));
}
function gauss(std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
}
function simGame(rt, opp, opts = {}) {
  const baseline = 21.5, adj = opts.oppAdj || 0, std = opts.variance || 7;
  let us = baseline + (rt.off - (opp.def + adj)) * 0.42 + gauss(std);
  let them = baseline + ((opp.off + adj) - rt.def) * 0.42 + gauss(std);
  us = Math.max(3, Math.round(us));
  them = Math.max(3, Math.round(them));
  if (us === them) { Math.random() < 0.5 ? us += 3 : them += 3; }
  return { us, them, win: us > them };
}
function simSeason(squad, opts = {}) {
  const rt = teamRatings(squad);
  const adj = opts.oppAdj || 0;
  const games = SCHEDULE.map(opp => {
    const r = simGame(rt, opp, opts);
    return { ...opp, ...r, wp: winProb(rt.ovr, opp.off + adj, opp.def + adj) };
  });
  const wins = games.filter(g => g.win).length;
  const pf = games.reduce((s, g) => s + g.us, 0);
  const pa = games.reduce((s, g) => s + g.them, 0);
  return { rt, games, wins, losses: 17 - wins, pf, pa, diff: pf - pa, perfect: wins === 17 };
}
function perfectOdds(squad, opts = {}) {
  const rt = teamRatings(squad);
  const adj = opts.oppAdj || 0;
  let p = 1;
  for (const opp of SCHEDULE) p *= winProb(rt.ovr, opp.off + adj, opp.def + adj);
  return p;
}

Object.assign(window, {
  SLOTS, GROUP_SLOTS, openSlotForGroup, SCHEDULE,
  tierOf, teamRatings, percentile, winProb, simGame, simSeason, perfectOdds,
});
