const { kv } = require("@vercel/kv");
const crypto = require("crypto");

const SHARE_TTL_SEC = 60 * 60 * 24 * 90; // 90 days

function shareKey(id) {
  return `share:${id}`;
}

function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function newShareId() {
  return crypto.randomBytes(6).toString("base64url");
}

function validateSquad(squad) {
  if (!squad || typeof squad !== "object" || Array.isArray(squad)) {
    throw new Error("squad is required");
  }
  const keys = Object.keys(squad);
  if (keys.length < 1 || keys.length > 11) {
    throw new Error("squad must have 1–11 players");
  }
  for (const [slot, p] of Object.entries(squad)) {
    if (!p || typeof p !== "object") throw new Error(`invalid player for ${slot}`);
    if (!p.name || typeof p.name !== "string") throw new Error(`name required for ${slot}`);
    if (p.ovr == null || Number.isNaN(Number(p.ovr))) throw new Error(`ovr required for ${slot}`);
  }
}

function validateGames(games) {
  if (games == null) return [];
  if (!Array.isArray(games)) throw new Error("games must be an array");
  return games.slice(0, 17).map((g) => ({
    wk: Number(g.wk),
    abbr: String(g.abbr || ""),
    win: Boolean(g.win),
  }));
}

async function createShare(body) {
  if (!kvConfigured()) {
    throw new Error("Share storage is not configured");
  }
  const wins = Number(body?.wins);
  const losses = Number(body?.losses);
  if (!Number.isInteger(wins) || wins < 0 || wins > 17) {
    throw new Error("wins must be an integer from 0 to 17");
  }
  if (!Number.isInteger(losses) || losses < 0 || losses > 17 || wins + losses !== 17) {
    throw new Error("losses must complete a 17-game season with wins");
  }
  validateSquad(body.squad);

  const id = newShareId();
  const payload = {
    id,
    wins,
    losses,
    perfect: Boolean(body.perfect),
    message: typeof body.message === "string" ? body.message.slice(0, 120) : null,
    squad: body.squad,
    games: validateGames(body.games),
    createdAt: new Date().toISOString(),
  };

  await kv.set(shareKey(id), payload, { ex: SHARE_TTL_SEC });
  return { id, createdAt: payload.createdAt };
}

async function getShare(id) {
  if (!id || typeof id !== "string" || !/^[A-Za-z0-9_-]{6,24}$/.test(id)) {
    return null;
  }
  if (!kvConfigured()) return null;
  const payload = await kv.get(shareKey(id));
  return payload || null;
}

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = {
  applyCors,
  createShare,
  getShare,
};
