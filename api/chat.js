// api/chat.js  (OpenAI version)
// Runs on Vercel as a serverless function at /api/chat. It holds your OpenAI
// API key (set as an environment variable, never in the web page) and relays
// messages to the model. It normalizes the reply into the shape the page reads,
// so index.html does not need to change beyond the two model-name lines.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Optional access-code gate. Set ACCESS_CODE in Vercel to require a code.
  const requiredCode = process.env.ACCESS_CODE;
  if (requiredCode) {
    const provided = req.headers["x-access-code"];
    if (provided !== requiredCode) {
      res.status(401).json({ error: "Invalid or missing access code." });
      return;
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing OPENAI_API_KEY." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
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

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + apiKey },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: (data.error && data.error.message) || "OpenAI error" });
      return;
    }

    // Normalize to the page's expected shape: { content: [{ type:"text", text }] }
    const text =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    res.status(200).json({ content: [{ type: "text", text }] });
  } catch (e) {
    res.status(500).json({ error: "Upstream request failed", detail: String(e) });
  }
}
