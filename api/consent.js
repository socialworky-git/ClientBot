import { db, configured, researchConsent } from "../lib/db.js";
import { identify, readBody } from "../lib/auth.js";

// Bump when the disclosure wording on /account/ changes, so every consent row
// records exactly which text the person agreed to.
export const RESEARCH_CONSENT_VERSION = "2026-10-v1";

const PROFILE_FIELDS = {
  role: ["student", "clinician", "trainer", "educator", "other"],
  mint_member: ["yes", "no"],
};

function cleanProfile(p) {
  if (!p || typeof p !== "object") return null;
  const out = {};
  for (const k of Object.keys(PROFILE_FIELDS)) {
    if (PROFILE_FIELDS[k].includes(p[k])) out[k] = p[k];
  }
  if (typeof p.country === "string" && p.country.trim()) out.country = p.country.trim().slice(0, 60);
  if (Number.isFinite(+p.years_mi) && p.years_mi !== "" && p.years_mi !== null) out.years_mi = Math.max(0, Math.min(60, Math.round(+p.years_mi)));
  return Object.keys(out).length ? out : null;
}

export default async function handler(req, res) {
  if (!configured()) { res.status(503).json({ error: "History storage is not configured.", code: "NOT_CONFIGURED" }); return; }
  const who = await identify(req);
  if (who.error || !who.userId) { res.status(401).json({ error: who.error || "Sign in required.", code: "AUTH_REQUIRED" }); return; }
  const sql = await db();

  if (req.method === "GET") {
    const consent = await researchConsent(sql, who.userId);
    res.status(200).json({ consent, version: RESEARCH_CONSENT_VERSION });
    return;
  }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const body = readBody(req);
  if (!body || typeof body.granted !== "boolean") { res.status(400).json({ error: "Malformed request body." }); return; }
  const granted = body.granted;
  const profile = granted ? cleanProfile(body.profile) : null;
  await sql.query(
    `INSERT INTO consents (user_id, kind, version, granted, profile) VALUES ($1, 'research', $2, $3, $4)`,
    [who.userId, RESEARCH_CONSENT_VERSION, granted, profile]
  );
  const consent = await researchConsent(sql, who.userId);
  res.status(200).json({ ok: true, consent, version: RESEARCH_CONSENT_VERSION });
}
