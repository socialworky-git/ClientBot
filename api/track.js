import { db, configured, researchConsent } from "../lib/db.js";
import { identify, readBody } from "../lib/auth.js";

const TOOLS = new Set(["batting-practice", "clientbot"]);
const ANON_TOOLS = new Set(["batting-practice"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EVENTS = 60;
const MAX_JSON = 12000;

function small(v) {
  if (v === undefined || v === null) return null;
  const s = JSON.stringify(v);
  return s.length > MAX_JSON ? null : v;
}
function str(v, max) {
  return typeof v === "string" ? v.slice(0, max) : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  if (!configured()) { res.status(503).json({ error: "History storage is not configured.", code: "NOT_CONFIGURED" }); return; }

  const body = readBody(req);
  if (!body || !body.session) { res.status(400).json({ error: "Malformed request body." }); return; }

  const who = await identify(req);
  if (who.error) { res.status(401).json({ error: who.error }); return; }
  const userId = who.userId;

  const s = body.session;
  if (!UUID.test(s.id || "") || !TOOLS.has(s.tool)) { res.status(400).json({ error: "Bad session." }); return; }
  const anonId = userId ? null : str(s.anon_id, 64);
  if (!userId && (!ANON_TOOLS.has(s.tool) || !anonId)) { res.status(401).json({ error: "Sign in to save this tool's history.", code: "AUTH_REQUIRED" }); return; }

  const sql = await db();

  // Verbatim text is kept only for signed-in users with research consent on.
  let keepText = false;
  if (userId) {
    const c = await researchConsent(sql, userId);
    keepText = !!(c && c.granted);
  }

  await sql.query(
    `INSERT INTO sessions (id, user_id, anon_id, tool, scenario, language, meta, started_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, now()))
     ON CONFLICT (id) DO NOTHING`,
    [s.id, userId, anonId, s.tool, str(s.scenario, 120), str(s.language, 40), small(s.meta),
     typeof s.started_at === "string" ? s.started_at : null]
  );

  const owned = await sql.query(
    `SELECT 1 FROM sessions WHERE id = $1 AND user_id IS NOT DISTINCT FROM $2 AND anon_id IS NOT DISTINCT FROM $3`,
    [s.id, userId, anonId]
  );
  if (!owned.length) { res.status(403).json({ error: "Not your session." }); return; }

  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  for (const ev of events) {
    if (!ev || !Number.isInteger(ev.seq) || typeof ev.type !== "string") continue;
    await sql.query(
      `INSERT INTO events (session_id, seq, type, data, text, at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))
       ON CONFLICT (session_id, seq) DO NOTHING`,
      [s.id, ev.seq, ev.type.slice(0, 40), small(ev.data), keepText ? small(ev.text) : null,
       typeof ev.at === "string" ? ev.at : null]
    );
  }

  if (body.end) {
    await sql.query(
      `UPDATE sessions SET ended_at = COALESCE(ended_at, now()), completed = completed OR $2, summary = COALESCE($3, summary)
       WHERE id = $1`,
      [s.id, body.end.completed === true, small(body.end.summary)]
    );
  }

  res.status(200).json({ ok: true, stored: events.length, text: keepText });
}
