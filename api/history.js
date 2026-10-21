import { db, configured, researchConsent } from "../lib/db.js";
import { identify, readBody } from "../lib/auth.js";

export default async function handler(req, res) {
  if (!configured()) { res.status(503).json({ error: "History storage is not configured.", code: "NOT_CONFIGURED" }); return; }
  const who = await identify(req);
  if (who.error || !who.userId) { res.status(401).json({ error: who.error || "Sign in required.", code: "AUTH_REQUIRED" }); return; }
  const sql = await db();

  if (req.method === "POST") {
    const body = readBody(req);
    if (!body || typeof body.delete !== "string") { res.status(400).json({ error: "Malformed request body." }); return; }
    const gone = await sql.query(
      `DELETE FROM sessions WHERE id = $1 AND user_id = $2 RETURNING id`, [body.delete, who.userId]
    );
    res.status(200).json({ ok: true, deleted: gone.length });
    return;
  }
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }

  const sessions = await sql.query(
    `SELECT s.id, s.tool, s.scenario, s.language, s.meta, s.started_at, s.ended_at, s.completed, s.summary,
            (SELECT count(*) FROM events e WHERE e.session_id = s.id AND e.type = 'coach')::int AS coach_requests
     FROM sessions s WHERE s.user_id = $1 ORDER BY s.started_at DESC LIMIT 200`,
    [who.userId]
  );
  const consent = await researchConsent(sql, who.userId);
  res.status(200).json({ sessions, consent });
}
