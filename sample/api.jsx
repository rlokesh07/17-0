// api.jsx — DATA SEAM (mock).
// ───────────────────────────────────────────────────────────────────────────
// The front-end only ever calls fetchShortlist(teamId, year) and expects:
//   Promise<{ ok: boolean, players: Array<{
//     id, name, pos, group, ovr, stat, headshot, jersey, teamId, year
//   }>}>   where group ∈ 'QB' | 'RB' | 'WR' | 'TE' | 'DEF'.
//
// This mock returns deterministic, believable rosters per (team, year) so the UI
// is fully playable offline. >>> Replace the body of fetchShortlist with your real
// API call (same return shape) and nothing else needs to change. <<<
// ───────────────────────────────────────────────────────────────────────────

// seeded PRNG so a given team+year always yields the same shortlist
function _mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _FIRST = ['Marcus','Eli','Cole','Trey','Dax','Zion','Caleb','Jaylen','Bo','Theo','Roman','Atlas','Khalil','Dorian','Ivo','Samson','Beck','Tariq','Owen','Iman','Rashad','Quentin','Dre','Devon','Amari','Pax','Quill','Rico','Nate','Jad','Gus','Wyatt','Sol','Niko','Cody','Bull','Ren','Lonnie','Vince','Cy'];
const _LAST = ['Holloway','Vane','Brandt','Ferreira','Lockwood','Marchetti','Ng','Frost','Castellano','Krause','Diaz','Bjorn','Bramble','Webb','Salgado','Oduya','Larsson','Nseir','Brackett','Faraji','Pell','Lao','Vialli','Saint','Booth','Holloman','Adeyemi','Falk','Ostrander','Pierre','Tillman','Penn','Achterberg','Trent','Mraz','Kazan','Tachibana','Gore','Apodaca','Mortimer'];
const _DEF_POS = ['EDGE','LB','DT','CB','S'];

function _name(r) {
  return `${_FIRST[Math.floor(r() * _FIRST.length)]} ${_LAST[Math.floor(r() * _LAST.length)]}`;
}
// skew toward middling with occasional elites and busts → the roulette matters
function _ovr(r) {
  const x = r();
  if (x > 0.88) return 90 + Math.floor(r() * 9);   // elite
  if (x > 0.62) return 80 + Math.floor(r() * 9);   // great
  if (x > 0.30) return 70 + Math.floor(r() * 9);   // solid
  if (x > 0.12) return 60 + Math.floor(r() * 9);   // avg
  return 48 + Math.floor(r() * 11);                // liability
}
function _statFor(group, ovr, pos) {
  const k = (ovr - 55) / 44; // 0..1
  const ri = (lo, hi) => Math.round(lo + (hi - lo) * k);
  if (group === 'QB')  return `${ri(2600, 5100)} YDS · ${ri(12, 50)} TD`;
  if (group === 'RB')  return `${ri(550, 2050)} YDS · ${ri(3, 20)} TD`;
  if (group === 'WR')  return `${ri(420, 1850)} YDS · ${ri(2, 22)} TD`;
  if (group === 'TE')  return `${ri(280, 1350)} YDS · ${ri(1, 16)} TD`;
  // DEF — flavor by position
  if (pos === 'EDGE' || pos === 'DT') return `${ri(3, 22)} SACKS`;
  if (pos === 'CB' || pos === 'S')    return `${ri(1, 11)} INT · ${ri(40, 110)} TKL`;
  return `${ri(60, 175)} TACKLES`;
}

// the roster template the mock fills for every team-season
const _TEMPLATE = [
  { group: 'QB',  pos: 'QB' },
  { group: 'RB',  pos: 'RB' },
  { group: 'WR',  pos: 'WR' },
  { group: 'WR',  pos: 'WR' },
  { group: 'TE',  pos: 'TE' },
  { group: 'DEF' },
  { group: 'DEF' },
  { group: 'DEF' },
];

async function fetchShortlist(teamId, year) {
  // simulate network latency so the loading state is exercised
  await new Promise((res) => setTimeout(res, 420 + Math.random() * 260));

  const r = _mulberry32(teamId * 100000 + year);
  const players = _TEMPLATE.map((slot, i) => {
    const pos = slot.group === 'DEF' ? _DEF_POS[Math.floor(r() * _DEF_POS.length)] : slot.pos;
    const ovr = _ovr(r);
    return {
      id: `${teamId}-${year}-${i}`,
      name: _name(r),
      pos,
      group: slot.group,
      ovr,
      stat: _statFor(slot.group, ovr, pos),
      headshot: null,           // real API supplies a URL; UI has a clean fallback
      jersey: 1 + Math.floor(r() * 98),
      teamId, year,
    };
  });

  return { ok: true, players };
}

Object.assign(window, { fetchShortlist });
