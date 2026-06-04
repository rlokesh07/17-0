const { applyCors, getStats, recordWin } = require("../_lib/stats");

module.exports = async (req, res) => {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const wins = Number(req.body?.wins);
    const payload = await recordWin(wins);
    return res.status(200).json(payload);
  } catch (error) {
    if (String(error.message).includes("not configured")) {
      return res.status(200).json(await getStats());
    }
    return res.status(400).json({ error: String(error.message || error) });
  }
};
