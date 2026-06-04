// stats.jsx — record completed seasons and fetch global win distribution.
//
// Set window.STATS_API_BASE before load to point at a remote stats server, e.g.
//   window.STATS_API_BASE = "https://your-domain.com";
// When empty, uses same-origin /api/stats (serve_app.py).

function statsApiBase() {
  const base = (window.STATS_API_BASE || "").replace(/\/$/, "");
  return base;
}

function statsUrl(path) {
  return `${statsApiBase()}${path}`;
}

async function fetchGlobalStats() {
  try {
    const res = await fetch(statsUrl("/api/stats"), { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function recordSeasonResult(season) {
  if (!season || season.recordId == null || season.wins == null) return null;
  const sentKey = `stats-recorded-${season.recordId}`;
  if (window.localStorage.getItem(sentKey)) {
    return fetchGlobalStats();
  }

  try {
    const res = await fetch(statsUrl("/api/stats/record"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wins: season.wins }),
    });
    if (!res.ok) return fetchGlobalStats();
    window.localStorage.setItem(sentKey, "1");
    return await res.json();
  } catch {
    return null;
  }
}

Object.assign(window, {
  statsApiBase,
  fetchGlobalStats,
  recordSeasonResult,
});
