const { applyCors, createShare } = require("../_lib/shares");

module.exports = async (req, res) => {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, createdAt } = await createShare(req.body || {});
    return res.status(201).json({ id, createdAt });
  } catch (error) {
    const msg = String(error.message || error);
    const status = msg.includes("not configured") ? 503 : 400;
    return res.status(status).json({ error: msg });
  }
};
