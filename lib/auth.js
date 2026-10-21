import { verifyToken } from "@clerk/backend";

// Returns { userId } for a valid Clerk session token, { userId: null } when no
// token was sent, or { error } when a token was sent but does not verify.
export async function identify(req) {
  const header = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return { userId: null };
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return { error: "Server is missing CLERK_SECRET_KEY." };
  const parties = (process.env.CLERK_AUTHORIZED_PARTIES || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  try {
    const payload = await verifyToken(m[1], {
      secretKey,
      ...(parties.length ? { authorizedParties: parties } : {}),
    });
    return { userId: payload.sub };
  } catch (e) {
    return { error: "Invalid session token." };
  }
}

export function readBody(req) {
  try {
    return typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return null;
  }
}
