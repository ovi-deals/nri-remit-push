import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";

// ─── Provider spread model ────────────────────────────────────────────────
// Real providers don't expose their exact margin via public API, so we apply
// a realistic spread below the live mid-market rate, calibrated from publicly
// known typical margins (Wise ~0.4-0.5%, Remitly/XE/OFX/Instarem ~0.7-1.9%).
// Fees are given in the SOURCE currency's smallest sensible unit (e.g. "4.25"
// means 4.25 of whatever currency is passed in) — these are illustrative,
// not live per-provider quotes. Replace with each provider's own quote API
// once you have partner access.
const PROVIDER_CONFIG = [
  { id: "wise", name: "Wise", spreadPct: 0.004, fee: 4.25, feeType: "fixed" as const, speed: "Instant", cookieDays: "No expiry" },
  { id: "remitly", name: "Remitly", spreadPct: 0.009, fee: 0, feeType: "none" as const, speed: "1–3 hrs", cookieDays: "30 days" },
  { id: "xe", name: "XE Money", spreadPct: 0.013, fee: 2.99, feeType: "fixed" as const, speed: "Same day", cookieDays: "30 days" },
  { id: "ofx", name: "OFX", spreadPct: 0.016, fee: 0, feeType: "none" as const, speed: "1–2 days", cookieDays: "45 days" },
  { id: "instarem", name: "Instarem", spreadPct: 0.019, fee: 0, feeType: "none" as const, speed: "1 day", cookieDays: "30 days" },
];

const SUPPORTED_SOURCE_CURRENCIES = ["AUD", "USD", "GBP", "CAD", "AED", "SGD"];

export const dynamic = "force-dynamic"; // never statically cache — rates must be fresh
export const revalidate = 0;

async function fetchMidMarketRate(sourceCurrency: string): Promise<{ rate: number; source: string; fetchedAt: string }> {
  // Primary: open.er-api.com — free, no key, no signup
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${sourceCurrency}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.result === "success" && data?.rates?.INR) {
        return { rate: data.rates.INR, source: "open.er-api.com", fetchedAt: data.time_last_update_utc };
      }
    }
  } catch {
    // fall through to backup
  }

  // Backup: Frankfurter (ECB-backed, also free/no-key) — note: doesn't cover AED
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${sourceCurrency}&to=INR`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.INR) {
        return { rate: data.rates.INR, source: "frankfurter.app (ECB)", fetchedAt: data.date };
      }
    }
  } catch {
    // fall through to hardcoded fallback
  }

  // Last resort: rough static fallbacks per currency so the UI never breaks.
  // These are approximate mid-2026 levels, not live data — only used when
  // both real sources are unreachable.
  const FALLBACK_RATES: Record<string, number> = {
    AUD: 67.0, USD: 88.5, GBP: 112.0, CAD: 63.5, AED: 24.1, SGD: 65.0,
  };
  return {
    rate: FALLBACK_RATES[sourceCurrency] ?? 80.0,
    source: "fallback (live fetch failed)",
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const amount = parseFloat(searchParams.get("amount") || "1000");
  const rawCurrency = (searchParams.get("currency") || "AUD").toUpperCase();
  const sourceCurrency = SUPPORTED_SOURCE_CURRENCIES.includes(rawCurrency) ? rawCurrency : "AUD";

  const { rate: midMarket, source, fetchedAt } = await fetchMidMarketRate(sourceCurrency);

  // Best-effort: log this rate and read back a real 30-day average,
  // tracked per currency pair so AUD and USD histories don't mix.
  // Never let Supabase issues break the rates response — rates must always work.
  const pair = `${sourceCurrency}_INR`;
  let avg30d = midMarket; // sane fallback: if we have no history yet, "average" = today's rate
  try {
    const supabase = await createClient();
    // Fire-and-forget insert (don't block the response on it)
    supabase.from("rate_snapshots").insert({ pair, rate: midMarket, source }).then(() => {});

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: snapshots } = await supabase
      .from("rate_snapshots")
      .select("rate")
      .eq("pair", pair)
      .gte("captured_at", thirtyDaysAgo);

    if (snapshots && snapshots.length >= 5) {
      avg30d = parseFloat((snapshots.reduce((s, r) => s + r.rate, 0) / snapshots.length).toFixed(2));
    }
  } catch {
    // Supabase not configured or unreachable — fall back to today's rate as the "average"
  }

  const providers = PROVIDER_CONFIG.map((p) => {
    const effectiveRate = parseFloat((midMarket * (1 - p.spreadPct)).toFixed(2));
    const feeInSourceCurrency = p.feeType === "fixed" ? p.fee : 0;
    const sendable = Math.max(0, amount - feeInSourceCurrency);
    const theyGet = Math.round(sendable * effectiveRate);
    return {
      ...p,
      rate: effectiveRate,
      youSend: amount,
      theyGet,
    };
  }).sort((a, b) => b.theyGet - a.theyGet)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  return Response.json({
    midMarketRate: midMarket,
    avg30d,
    sourceCurrency,
    source,
    fetchedAt,
    amount,
    providers,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
