const { applyCors, getShare } = require("../_lib/shares");

module.exports = async (req, res) => {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = req.query?.id;
  const payload = await getShare(id);
  if (!payload) {
    return res.status(404).json({ error: "Share not found" });
  }
  return res.status(200).json(payload);
};
