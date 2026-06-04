// api.jsx — fetchShortlist from data/spinner-index.json (nflverse-backed build).

let _indexCache = null;
let _indexPromise = null;
let _validDraftPicks = null;

async function loadSpinnerIndex() {
  if (_indexCache) return _indexCache;
  if (!_indexPromise) {
    _indexPromise = fetch("data/spinner-index.json")
      .then((res) => {
        if (!res.ok) throw new Error(`spinner-index HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        _indexCache = data;
        if (data.years?.length) {
          window.MIN_YEAR = data.statStartYear ?? data.years[0];
          window.MAX_YEAR = data.endYear ?? data.years[data.years.length - 1];
          window.YEARS = data.years.map(Number);
        }
        _validDraftPicks = buildValidDraftPicks(data);
        return data;
      });
  }
  return _indexPromise;
}

const NAME_BY_TEAM_ID = () =>
  Object.fromEntries(TEAMS.map((t) => [t.id, t.name]));

const DEF_POS = new Set([
  "DE", "DT", "DL", "NT", "LB", "OLB", "ILB", "MLB", "CB", "DB", "S", "FS", "SS", "SAF",
]);

function slotHintToGroup(slotHint, position) {
  const hint = (slotHint || "").trim();
  if (hint === "QB") return "QB";
  if (hint === "RB") return "RB";
  if (hint.startsWith("WR")) return "WR";
  if (hint === "TE") return "TE";
  if (hint === "OL") return "OL";
  if (hint.startsWith("Defensive")) return "DEF";
  if (hint === "K") return "K";
  const p = (position || "").toUpperCase();
  if (p === "QB") return "QB";
  if (p === "RB" || p === "HB" || p === "FB") return "RB";
  if (p === "WR" || p.startsWith("WR")) return "WR";
  if (p === "TE") return "TE";
  if (p === "OL") return "OL";
  if (DEF_POS.has(p) || p.startsWith("DEF")) return "DEF";
  if (p === "K") return "K";
  return null;
}

function hasDraftablePlayers(lineup) {
  if (!lineup?.length) return false;
  return lineup.some((p) =>
    slotHintToGroup(p.slotHint, p.position || p.displayRole)
  );
}

function buildValidDraftPicks(idx) {
  const yearList = (idx.years || []).map(Number);
  const picks = [];
  for (let yi = 0; yi < yearList.length; yi++) {
    const year = yearList[yi];
    const byTeam = idx.players?.[String(year)] || {};
    for (let ti = 0; ti < TEAMS.length; ti++) {
      const team = TEAMS[ti];
      if (hasDraftablePlayers(byTeam[team.name])) {
        picks.push({ teamIndex: ti, yearIndex: yi, team, year });
      }
    }
  }
  return picks;
}

function getValidDraftPicks() {
  return _validDraftPicks || [];
}

function formatStatLine(stats) {
  if (!stats?.length) return "No box-score row";
  return stats
    .slice(0, 4)
    .map((s) => {
      const v =
        typeof s.value === "number" && Math.abs(s.value) >= 1000
          ? s.value.toLocaleString()
          : s.value;
      return `${v} ${s.label}`;
    })
    .join(" · ");
}

async function fetchShortlist(teamId, year) {
  await new Promise((res) => setTimeout(res, 180));

  const idx = await loadSpinnerIndex();
  const teamName = NAME_BY_TEAM_ID()[teamId];
  const yearKey = String(year);
  const raw = idx.players?.[yearKey]?.[teamName] || [];

  const players = raw
    .map((p) => {
      const pos = p.position || p.displayRole || "?";
      const group = slotHintToGroup(p.slotHint, pos);
      if (!group) return null;
      return {
        id: p.id,
        name: p.name,
        pos: p.displayRole || pos,
        group,
        slotHint: p.slotHint || null,
        aggregate: !!p.aggregate,
        score: Number(p.ovr ?? p.percentile) || 50,
        ovr: Number(p.ovr ?? p.percentile) || 50,
        production: Number(p.score) || null,
        percentile: p.percentile ?? null,
        stat: formatStatLine(p.stats),
        headshot: p.headshot || null,
        jersey: null,
        teamId,
        year,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.ovr - a.ovr);

  return { ok: true, players };
}

Object.assign(window, {
  fetchShortlist,
  loadSpinnerIndex,
  getValidDraftPicks,
});
