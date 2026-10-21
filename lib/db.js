import { neon } from "@neondatabase/serverless";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sessions (
     id uuid PRIMARY KEY,
     user_id text,
     anon_id text,
     tool text NOT NULL,
     scenario text,
     language text,
     meta jsonb,
     started_at timestamptz NOT NULL DEFAULT now(),
     ended_at timestamptz,
     completed boolean NOT NULL DEFAULT false,
     summary jsonb
   )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id, started_at DESC)`,
  `CREATE INDEX IF NOT EXISTS sessions_tool_idx ON sessions (tool, started_at DESC)`,
  `CREATE TABLE IF NOT EXISTS events (
     id bigserial PRIMARY KEY,
     session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
     seq int NOT NULL,
     type text NOT NULL,
     data jsonb,
     text jsonb,
     at timestamptz NOT NULL DEFAULT now(),
     UNIQUE (session_id, seq)
   )`,
  `CREATE TABLE IF NOT EXISTS consents (
     id bigserial PRIMARY KEY,
     user_id text NOT NULL,
     kind text NOT NULL,
     version text NOT NULL,
     granted boolean NOT NULL,
     profile jsonb,
     at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS consents_user_idx ON consents (user_id, kind, at DESC)`,
];

let sqlClient = null;
let schemaReady = null;

export function configured() {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

export async function db() {
  if (!sqlClient) sqlClient = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL);
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const stmt of SCHEMA) await sqlClient.query(stmt);
    })().catch((e) => { schemaReady = null; throw e; });
  }
  await schemaReady;
  return sqlClient;
}

export async function researchConsent(sql, userId) {
  const rows = await sql.query(
    `SELECT granted, version, profile, at FROM consents
     WHERE user_id = $1 AND kind = 'research' ORDER BY at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}
