// src/gatewayClient.ts
// CHESSai-web — routes AI coaching through the ai-gateway (via the
// same-origin /api/ask serverless proxy) instead of calling a model SDK
// directly from the browser. Mirrors CHESSai iOS's GatewayClient.swift
// POST /ask pattern, proven live there.

export type AskResponse = {
  response: string;
  lane: string;
  hil_pending: boolean;
  hil_reason?: string;
  request_id: string;
};

export async function askGateway(content: string): Promise<AskResponse> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    throw new Error(`Gateway request failed: ${res.status}`);
  }
  return res.json();
}
