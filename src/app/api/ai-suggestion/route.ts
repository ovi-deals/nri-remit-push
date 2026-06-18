import { NextRequest } from "next/server";

// In production, set NEXT_PUBLIC_AI_PROXY_URL to your deployed Cloudflare Worker
// e.g. https://nri-remit-ai-proxy.yourname.workers.dev
const AI_PROXY_URL = process.env.AI_PROXY_URL || process.env.NEXT_PUBLIC_AI_PROXY_URL;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, context } = body;

    if (!prompt || typeof prompt !== "string" || prompt.length > 2000) {
      return Response.json({ error: "Invalid prompt" }, { status: 400 });
    }

    // Production path: forward to the Cloudflare Worker, which holds the real API key
    if (AI_PROXY_URL) {
      const res = await fetch(AI_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context }),
      });
      const data = await res.json();
      if (!res.ok) {
        return Response.json({ error: data.error || "AI service error" }, { status: res.status });
      }
      return Response.json({ message: data.message });
    }

    // Local dev fallback: call Claude directly using a server-side env var
    // (only used when AI_PROXY_URL isn't set — e.g. local `next dev`)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({
        error: "No AI proxy configured",
        message: "Set AI_PROXY_URL (Cloudflare Worker) or ANTHROPIC_API_KEY (local dev) in your environment.",
      }, { status: 503 });
    }

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: `You are an AI financial assistant for NRI Remit, helping Indians in Australia send money to India.
Respond in 2-4 short sentences. Be direct and practical. Never give investment advice or guarantee rate movements.
Never claim to be a licensed financial advisor. End with one clear action the user can take right now.${context ? `\n\nContext: ${JSON.stringify(context)}` : ""}`,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      return Response.json({ error: "AI service error", detail: errText }, { status: 502 });
    }

    const data = await claudeRes.json();
    return Response.json({ message: data.content?.[0]?.text || "" });

  } catch (err) {
    return Response.json({ error: "Internal error", detail: String(err) }, { status: 500 });
  }
}
