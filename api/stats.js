const { applyCors, getStats } = require("./_lib/stats");

module.exports = async (req, res) => {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(200).json(await getStats());
};
