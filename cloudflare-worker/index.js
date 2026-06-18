/**
 * nri-remit-ai-proxy — Cloudflare Worker
 *
 * Proxies requests to the Claude API so the API key never touches the browser.
 * Deploy: wrangler deploy
 * Set secret: wrangler secret put ANTHROPIC_API_KEY
 *
 * Matches the same pattern used in sgf-zoho-proxy and studyo-stripe workers.
 */

const ALLOWED_ORIGINS = [
  "https://nri-remit.vercel.app",
  "http://localhost:3000",
];

const SYSTEM_PROMPT = `You are an AI financial assistant for NRI Remit, an app helping Indians in Australia send money to India.

You give concise, practical advice about:
- The best time to transfer money based on AUD/INR rate trends
- Personalised reminders (festivals, recurring transfers, rate thresholds)
- General awareness of FEMA, TDS, and tax reporting obligations for NRIs (never specific tax/legal advice — always suggest consulting an accountant for their specific situation)
- Transfer pattern analysis based on the user's own history

Rules:
- Always respond in 2-4 short sentences. Be warm but direct, no fluff.
- Reference real AUD to INR context the user gives you — don't invent rates.
- NEVER give investment advice or guarantee future rate movements.
- NEVER claim to be a licensed financial advisor — you are not one.
- End with one clear, specific action the user can take right now.
- If asked about tax/legal specifics beyond general awareness, say to consult a registered tax agent or accountant.`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    const corsHeaders = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { prompt, context } = body;

      if (!prompt || typeof prompt !== "string" || prompt.length > 2000) {
        return new Response(JSON.stringify({ error: "Invalid prompt" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Simple rate limit via Cloudflare KV (optional — skip if KV not bound)
      if (env.RATE_LIMIT_KV) {
        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const key = `ratelimit:${ip}`;
        const count = parseInt((await env.RATE_LIMIT_KV.get(key)) || "0");
        if (count > 30) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: 60 });
      }

      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          system: SYSTEM_PROMPT + (context ? `\n\nUser context: ${JSON.stringify(context)}` : ""),
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!claudeRes.ok) {
        const errText = await claudeRes.text();
        return new Response(JSON.stringify({ error: "AI service error", detail: errText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await claudeRes.json();
      const text = data.content?.[0]?.text || "";

      return new Response(JSON.stringify({ message: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Internal error", detail: String(err) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
