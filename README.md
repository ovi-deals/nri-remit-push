# NRI Remit

Live AUD → INR rate comparator for NRIs in Australia, with AI-powered timing suggestions, rate/reminder alerts, and affiliate-link monetisation across Wise, Remitly, XE, OFX, and Instarem.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind
- Supabase (auth + Postgres, with RLS) for alerts, transfer history, and click analytics
- Cloudflare Worker as a proxy for the Claude API (keeps the API key off the client)
- Free, no-key rate sources: open.er-api.com (primary) → frankfurter.app (backup) → static fallback

## 1. Supabase setup

1. Create a project at supabase.com
2. Open SQL Editor → New Query → paste the contents of `supabase/schema.sql` → Run
3. In Authentication → URL Configuration, add `http://localhost:3000/auth/callback` and your production domain's equivalent as redirect URLs
4. Authentication → Providers → make sure Email is enabled (magic link / OTP is on by default)
5. Copy your Project URL and anon key into `.env.local` (see below)

## 2. Cloudflare Worker (AI proxy) setup

```bash
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
npx wrangler secret put ANTHROPIC_API_KEY   # paste your key when prompted
```

Update `ALLOWED_ORIGINS` in `cloudflare-worker/index.js` with your real Vercel domain before deploying, then note the deployed Worker URL (e.g. `https://nri-remit-ai-proxy.yourname.workers.dev`) — you'll need it below.

## 3. Environment variables

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Cloudflare Worker URL from step 2 — once set, the app proxies all AI calls through it
AI_PROXY_URL=https://nri-remit-ai-proxy.yourname.workers.dev

# Only needed for local dev if you haven't deployed the Worker yet
ANTHROPIC_API_KEY=sk-ant-...
```

Add the same variables in Vercel's Project Settings → Environment Variables before deploying.

## 4. Affiliate links — the one thing that's still a placeholder

Open `src/app/page.tsx` and find `AFFILIATE_LINKS` near the top. Each provider currently points to its public homepage. Once you're approved for each affiliate program, replace the URL with your tracked link:

```ts
const AFFILIATE_LINKS: Record<string, string> = {
  wise: "https://wise.com/invite/u/YOURNAME",        // Partnerize
  remitly: "https://remitly.com/...?ref=YOURID",       // Impact
  xe: "https://xe.com/...?ref=YOURID",                 // CJ Affiliate
  ofx: "https://ofx.com/...?ref=YOURID",               // Impact
  instarem: "https://instarem.com/...?ref=YOURID",     // PartnerStack
};
```

This is a one-line-per-provider change — nothing else in the app needs to know about it. Every click already gets logged to `affiliate_clicks` and (if signed in) `transfer_history` regardless of whether the link is a real affiliate link yet.

## 5. Run locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000. Note: if `localhost` doesn't resolve for you, try `http://127.0.0.1:3000` explicitly.

## 6. Deploy

Push to GitHub, then import the repo in Vercel. Add the environment variables from step 3. Vercel auto-detects Next.js — no extra config needed.

## How the rate model works

Real providers don't expose their internal margin via a public API, so `src/app/api/rates/route.ts` fetches one live AUD/INR **mid-market** rate, then applies a realistic spread per provider (`spreadPct` in `PROVIDER_CONFIG`) calibrated from each provider's publicly known typical margin. This is accurate enough to rank providers correctly and show realistic numbers, but isn't pulling each provider's actual live quote. Upgrading any single provider to use their real quote API (e.g. Wise's `/v1/quotes` endpoint once you have Platform access) is a self-contained change inside that one object in `PROVIDER_CONFIG`.

## What's not built yet

- Real per-provider quote APIs (currently a calibrated spread model — see above)
- Scheduled job to check rate alerts and send push/email notifications (the `alerts` table and UI exist; the cron/Edge Function that watches them and notifies users doesn't yet)
- Recurring transfer reminders are stored but nothing automatically reminds the user yet — needs a daily Supabase Edge Function or Vercel Cron
- 30-day average (`AVG_30D` in `page.tsx`) is currently a hardcoded constant — should be computed from the `rate_snapshots` table once it's been collecting data for a few weeks
