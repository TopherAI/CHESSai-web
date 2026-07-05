// api/ask.ts
// CHESSai-web — server-side proxy to the ai-gateway's POST /ask endpoint.
//
// "Nothing bypasses the gateway": src/gemini.js used to call @google/genai
// directly from the browser. The browser can't hold the gateway's API key
// safely (anything in a VITE_* env var ships in the client bundle), so this
// function holds it server-side and the browser calls this same-origin
// route instead. Same pattern as GodAI's api/gateway-dispatch.ts.
//
// GATEWAY_API_KEY falls back to the same "topher-dev-key" literal
// GatewayKeychain.swift seeds on iOS if the Keychain is empty — that
// fallback is already the proven-working credential for client_id "topher"
// in production (TOOL-app). Set a real GATEWAY_API_KEY env var in Vercel
// to use a stronger key without a code change.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const GATEWAY_URL = "https://web-production-027b8.up.railway.app";
const CLIENT_ID = "topher";
const DEV_FALLBACK_KEY = "topher-dev-key";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as { content?: unknown } | null;
  const content = body?.content;
  if (typeof content !== "string" || content.length === 0) {
    return res.status(400).json({ error: "Missing content" });
  }

  const apiKey = process.env.GATEWAY_API_KEY || DEV_FALLBACK_KEY;

  try {
    const gatewayRes = await fetch(`${GATEWAY_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ content, client_id: CLIENT_ID }),
    });
    const data = await gatewayRes.json();
    return res.status(gatewayRes.status).json(data);
  } catch (err) {
    console.error("[api/ask] gateway request failed:", err);
    return res.status(502).json({ error: "Gateway unreachable" });
  }
}
