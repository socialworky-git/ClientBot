// api/chat.js
// Runs on Vercel as a serverless function at the path /api/chat.
// It holds your Anthropic API key (set as an environment variable, never in
// the web page) and relays messages to the model. An optional access code
// keeps the open internet from running up your bill.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Optional gate. If you set ACCESS_CODE in Vercel, callers must send a
  // matching code. If you leave ACCESS_CODE unset, the gate is off.
  const requiredCode = process.env.ACCESS_CODE;
  if (requiredCode) {
    const provided = req.headers["x-access-code"];
    if (provided !== requiredCode) {
      res.status(401).json({ error: "Invalid or missing access code." });
      return;
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY." });
    return;
  }

  try {
    // Vercel parses JSON bodies automatically, but handle a raw string too.
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { system, messages, model, max_tokens } = body || {};

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-6",
        max_tokens: max_tokens || 1024,
        system,
        messages,
      }),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(500).json({ error: "Upstream request failed", detail: String(e) });
  }
}
