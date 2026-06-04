// data.jsx — squad template, schedule, ratings + season simulation.
// (Player data comes from api.jsx → fetchShortlist.)

const SLOTS = [
  { key: 'QB', group: 'QB', label: 'QB', side: 'OFF' },
  { key: 'RB', group: 'RB', label: 'RB', side: 'OFF' },
  { key: 'WR1', group: 'WR', label: 'WR', side: 'OFF' },
  { key: 'WR2', group: 'WR', label: 'WR', side: 'OFF' },
  { key: 'WR3', group: 'WR', label: 'WR', side: 'OFF' },
  { key: 'TE', group: 'TE', label: 'TE', side: 'OFF' },
  { key: 'OL', group: 'OL', label: 'OL', side: 'OFF' },
  { key: 'DP1', group: 'DEF', label: 'DEF', side: 'DEF' },
  { key: 'DP2', group: 'DEF', label: 'DEF', side: 'DEF' },
  { key: 'DP3', group: 'DEF', label: 'DEF', side: 'DEF' },
  { key: 'K', group: 'K', label: 'K', side: 'OFF' },
];

const SLOT_HINT_MAP = {
  'Defensive Player 1': 'DP1',
  'Defensive Player 2': 'DP2',
  'Defensive Player 3': 'DP3',
};

const GROUP_SLOTS = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR1', 'WR2', 'WR3'],
  TE: ['TE'],
  OL: ['OL'],
  DEF: ['DP1', 'DP2', 'DP3'],
  K: ['K'],
};

function openSlotForGroup(squad, group) {
  return (GROUP_SLOTS[group] || []).find((k) => !squad[k]) || null;
}

function pickSlotKey(squad, player) {
  const hint = player.slotHint;
  const mapped = (hint && SLOT_HINT_MAP[hint]) || hint;
  if (mapped && SLOTS.some((s) => s.key === mapped) && !squad[mapped]) return mapped;
  return openSlotForGroup(squad, player.group);
}

const SCHEDULE = [
  { wk: 1, abbr: 'OAK', off: 72, def: 70 },
  { wk: 2, abbr: 'STC', off: 68, def: 74 },
  { wk: 3, abbr: 'RDG', off: 80, def: 78 },
  { wk: 4, abbr: 'CTN', off: 65, def: 67 },
  { wk: 5, abbr: 'MES', off: 84, def: 79 },
  { wk: 6, abbr: 'BRL', off: 71, def: 73 },
  { wk: 7, abbr: 'KEY', off: 77, def: 70 },
  { wk: 8, abbr: 'DUL', off: 69, def: 81 },
  { wk: 9, abbr: 'SAV', off: 88, def: 85 },
  { wk: 10, abbr: 'TUL', off: 73, def: 66 },
  { wk: 11, abbr: 'PRO', off: 79, def: 76 },
  { wk: 12, abbr: 'ALB', off: 66, def: 72 },
  { wk: 13, abbr: 'RNO', off: 82, def: 80 },
  { wk: 14, abbr: 'MOB', off: 70, def: 68 },
  { wk: 15, abbr: 'SPK', off: 86, def: 83 },
  { wk: 16, abbr: 'ERI', off: 74, def: 71 },
  { wk: 17, abbr: 'GLD', off: 91, def: 89 },
];

function tierOf(ovr) {
  if (ovr >= 90) return { key: 'elite', label: 'ELITE' };
  if (ovr >= 82) return { key: 'great', label: 'GREAT' };
  if (ovr >= 73) return { key: 'good', label: 'SOLID' };
  if (ovr >= 64) return { key: 'avg', label: 'AVG' };
  return { key: 'bad', label: 'LIABILITY' };
}

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function teamRatings(squad) {
  const ovrOf = (k) => (squad[k] ? squad[k].ovr : 0);
  const wr = mean(['WR1', 'WR2', 'WR3'].map(ovrOf).filter(Boolean));
  const off =
    ovrOf('QB') * 0.28 +
    wr * 0.24 +
    ovrOf('RB') * 0.16 +
    ovrOf('TE') * 0.12 +
    ovrOf('OL') * 0.12 +
    ovrOf('K') * 0.08;
  const def = mean(['DP1', 'DP2', 'DP3'].map(ovrOf).filter(Boolean));
  return { off: Math.round(off), def: Math.round(def), ovr: Math.round((off + def) / 2) };
}

function rosterStrengthScore(squad) {
  return window.SeasonSim.rosterStrength(squad);
}

function percentile(rtg) {
  const z = (rtg - 75) / 11;
  return Math.round(Math.max(1, Math.min(99, (1 / (1 + Math.exp(-1.7 * z))) * 100)));
}

function simSeason(squad, opts = {}) {
  const _ = opts;
  const str = rosterStrengthScore(squad);
  const rt = teamRatings(squad);
  const sim = window.SeasonSim.simulateSeason(str);
  const avgOvr = window.SeasonSim.rosterAverageOvr(squad);
  const games = SCHEDULE.map((opp, i) => {
    const wk = sim.games[i] || { win: false, winProb: 50, tierLabel: 'standard week' };
    return {
      ...opp,
      win: wk.win,
      wp: wk.winProb / 100,
      tierLabel: wk.tierLabel,
    };
  });
  const message = window.SeasonSim.outcomeMessage(sim.wins, sim.losses);
  const strengthPercentile = window.SeasonSim.rosterStrengthPercentile(str);
  const recordId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `season-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    squad,
    rt,
    games,
    recordId,
    wins: sim.wins,
    losses: sim.losses,
    perfect: sim.wins === 17,
    rosterStrength: str,
    strengthNorm: sim.strengthNorm,
    strengthPercentile,
    averageOvr: avgOvr,
    message,
  };
}

function perfectOdds(squad, opts = {}) {
  const _ = opts;
  const str = rosterStrengthScore(squad);
  if (str <= 0) return 0;
  return window.SeasonSim.estimatePerfectSeasonOdds(str);
}

Object.assign(window, {
  SLOTS,
  SLOT_HINT_MAP,
  GROUP_SLOTS,
  openSlotForGroup,
  pickSlotKey,
  SCHEDULE,
  tierOf,
  teamRatings,
  rosterStrengthScore,
  percentile,
  simSeason,
  perfectOdds,
});
