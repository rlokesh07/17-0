const { kv } = require("@vercel/kv");

const TOTAL_KEY = "season-stats:total";

function winsKey(wins) {
  return `season-stats:wins:${wins}`;
}

function emptyByWins() {
  const byWins = {};
  for (let wins = 5; wins <= 17; wins += 1) {
    byWins[wins] = 0;
  }
  return byWins;
}

function formatResponse(totalSeasons, byWins) {
  const total = Number(totalSeasons) || 0;
  const distribution = [];
  for (let wins = 17; wins >= 5; wins -= 1) {
    const count = Number(byWins[wins]) || 0;
    distribution.push({
      wins,
      losses: 17 - wins,
      count,
      pct: total ? Math.round((count / total) * 1000) / 10 : 0,
    });
  }
  return {
    totalSeasons: total,
    updatedAt: new Date().toISOString(),
    distribution,
  };
}

function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function getStats() {
  if (!kvConfigured()) {
    return formatResponse(0, emptyByWins());
  }

  const total = (await kv.get(TOTAL_KEY)) || 0;
  const byWins = emptyByWins();
  await Promise.all(
    Object.keys(byWins).map(async (wins) => {
      byWins[wins] = (await kv.get(winsKey(wins))) || 0;
    })
  );
  return formatResponse(total, byWins);
}

async function recordWin(wins) {
  if (!Number.isInteger(wins) || wins < 5 || wins > 17) {
    throw new Error("wins must be an integer from 5 to 17");
  }
  if (!kvConfigured()) {
    throw new Error("Stats storage is not configured");
  }

  await kv.incr(TOTAL_KEY);
  await kv.incr(winsKey(wins));
  return getStats();
}

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = {
  applyCors,
  getStats,
  recordWin,
};
