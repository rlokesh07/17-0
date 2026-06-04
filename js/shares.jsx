// shares.jsx — create and load /share/:id pages (squad + season result).

function apiBase() {
  return (window.STATS_API_BASE || "").replace(/\/$/, "");
}

function apiUrl(path) {
  return `${apiBase()}${path}`;
}

function sharePageUrl(id) {
  if (typeof window === "undefined" || !id) return "";
  const base = `${window.location.origin}${apiBase()}`;
  return `${base}/share/${id}`;
}

function getShareIdFromPath() {
  if (typeof window === "undefined") return null;
  const m = window.location.pathname.match(/^\/share\/([^/]+)\/?$/);
  return m ? m[1] : null;
}

function serializeSquad(squad) {
  const out = {};
  for (const slot of SLOTS) {
    const p = squad[slot.key];
    if (!p) continue;
    out[slot.key] = {
      id: p.id,
      name: p.name,
      pos: p.pos,
      group: p.group,
      ovr: Number(p.ovr) || 50,
      headshot: p.headshot || null,
      teamId: p.teamId,
      fromTeamId: p.fromTeam?.id ?? p.fromTeamId ?? p.teamId,
      fromYear: p.fromYear,
      slotHint: p.slotHint || null,
    };
  }
  return out;
}

function hydrateSquad(data) {
  const squad = {};
  for (const slot of SLOTS) {
    const p = data?.[slot.key];
    if (!p) continue;
    const fromTeam = TEAM_BY_ID[p.fromTeamId] || null;
    squad[slot.key] = {
      ...p,
      fromTeam,
      teamId: p.teamId || p.fromTeamId,
    };
  }
  return squad;
}

function seasonShareBody(season) {
  return {
    wins: season.wins,
    losses: season.losses,
    perfect: !!season.perfect,
    message: season.message || null,
    squad: serializeSquad(season.squad),
    games: (season.games || []).map((g) => ({
      wk: g.wk,
      abbr: g.abbr,
      win: g.win,
    })),
  };
}

async function createSeasonShare(season) {
  if (!season?.squad) return null;
  const cacheKey = `share-created-${season.recordId}`;
  const cachedId = window.localStorage.getItem(cacheKey);
  if (cachedId) {
    return { id: cachedId, url: sharePageUrl(cachedId) };
  }

  try {
    const res = await fetch(apiUrl("/api/share"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(seasonShareBody(season)),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.id) {
      window.localStorage.setItem(cacheKey, data.id);
      return { id: data.id, url: sharePageUrl(data.id) };
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchSeasonShare(shareId) {
  if (!shareId) return null;
  try {
    const res = await fetch(apiUrl(`/api/share/${encodeURIComponent(shareId)}`), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const squad = hydrateSquad(data.squad);
    return {
      ...data,
      squad,
      rt: teamRatings(squad),
    };
  } catch {
    return null;
  }
}

Object.assign(window, {
  sharePageUrl,
  getShareIdFromPath,
  serializeSquad,
  hydrateSquad,
  createSeasonShare,
  fetchSeasonShare,
});
