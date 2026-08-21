// api/chat.js  (OpenAI version)
// Runs on Vercel as a serverless function at /api/chat. It holds your OpenAI
// API key (set as an environment variable, never in the web page) and relays
// messages to the model. It normalizes the reply into the shape the page reads,
// so index.html does not need to change beyond the two model-name lines.

// Kept comfortably under vercel.json's functions.maxDuration (60s) so a slow
// or hung upstream call always ends in a clean JSON error instead of Vercel
// silently killing the function and leaving the page's "Working..." spinner
// stuck with nothing to catch.
const UPSTREAM_TIMEOUT_MS = 45000;
const FUNCTION_BUDGET_MS = 55000;

async function callOpenAI(payload, apiKey) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + apiKey },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const data = await upstream.json();
    return { upstream, data };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  const started = Date.now();

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
    return;
  }

  // Optional access-code gate. Set ACCESS_CODE in Vercel to require a code.
  const requiredCode = process.env.ACCESS_CODE;
  if (requiredCode) {
    const provided = req.headers["x-access-code"];
    if (provided !== requiredCode) {
      res.status(401).json({ error: "Invalid or missing access code.", code: "AUTH_REQUIRED" });
      return;
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing OPENAI_API_KEY.", code: "CONFIG_ERROR" });
    return;
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (e) {
    res.status(400).json({ error: "Malformed request body.", code: "BAD_REQUEST" });
    return;
  }

  const { system, messages, model, max_tokens } = body || {};
  const useModel = model || "gpt-4.1-mini";

  // OpenAI takes the system prompt as the first message in the list.
  const oaMessages = [];
  if (system) oaMessages.push({ role: "system", content: system });
  (messages || []).forEach((m) => oaMessages.push({ role: m.role, content: m.content }));

  // The GPT-5 family uses max_completion_tokens and a fixed temperature.
  // The GPT-4.1 family uses the classic max_tokens and accepts temperature.
  const isGpt5 = /^gpt-5/i.test(useModel);
  const payload = { model: useModel, messages: oaMessages };
  if (isGpt5) {
    payload.max_completion_tokens = max_tokens || 1024;
  } else {
    payload.max_tokens = max_tokens || 1024;
    payload.temperature = 0.7;
  }

  let result;
  try {
    result = await callOpenAI(payload, apiKey);
  } catch (e) {
    const timedOut = e.name === "AbortError";
    const elapsed = Date.now() - started;
    // Only retry a fast/transient failure (e.g. a network blip) - after a full
    // timeout there's no budget left in this function for a second full wait.
    if (!timedOut && elapsed < FUNCTION_BUDGET_MS - UPSTREAM_TIMEOUT_MS) {
      try {
        result = await callOpenAI(payload, apiKey);
      } catch (e2) {
        res.status(504).json({ error: "Upstream request failed.", code: "UPSTREAM_ERROR", detail: String(e2) });
        return;
      }
    } else {
      res.status(504).json({
        error: timedOut ? "The model did not respond within 45 seconds." : "Upstream request failed.",
        code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR",
        detail: String(e),
      });
      return;
    }
  }

  const { upstream, data } = result;
  if (!upstream.ok) {
    const retryable = upstream.status === 429 || upstream.status >= 500;
    res.status(upstream.status).json({
      error: (data.error && data.error.message) || "OpenAI error",
      code: retryable ? "UPSTREAM_RETRYABLE" : "UPSTREAM_REJECTED",
    });
    return;
  }

  // Normalize to the page's expected shape: { content: [{ type:"text", text }] }
  const text =
    (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
  res.status(200).json({ content: [{ type: "text", text }] });
}
