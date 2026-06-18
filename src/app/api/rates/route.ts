import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";

// ─── Provider spread model ────────────────────────────────────────────────
// Real providers don't expose their exact margin via public API, so we apply
// a realistic spread below the live mid-market rate, calibrated from publicly
// known typical margins (Wise ~0.5%, Remitly/XE/OFX/Instarem ~0.7-1.3%).
// Replace with each provider's own quote API once you have partner access.
const PROVIDER_CONFIG = [
  { id: "wise", name: "Wise", spreadPct: 0.004, fee: 4.25, feeType: "fixed" as const, speed: "Instant", cookieDays: "No expiry", cpa: "£10–50" },
  { id: "remitly", name: "Remitly", spreadPct: 0.009, fee: 0, feeType: "none" as const, speed: "1–3 hrs", cookieDays: "30 days", cpa: "$5–20" },
  { id: "xe", name: "XE Money", spreadPct: 0.013, fee: 2.99, feeType: "fixed" as const, speed: "Same day", cookieDays: "30 days", cpa: "$10–30" },
  { id: "ofx", name: "OFX", spreadPct: 0.016, fee: 0, feeType: "none" as const, speed: "1–2 days", cookieDays: "45 days", cpa: "Negotiated" },
  { id: "instarem", name: "Instarem", spreadPct: 0.019, fee: 0, feeType: "none" as const, speed: "1 day", cookieDays: "30 days", cpa: "$8–15" },
];

export const dynamic = "force-dynamic"; // never statically cache — rates must be fresh
export const revalidate = 0;

async function fetchMidMarketRate(): Promise<{ rate: number; source: string; fetchedAt: string }> {
  // Primary: open.er-api.com — free, no key, no signup
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/AUD", {
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

  // Backup: Frankfurter (ECB-backed, also free/no-key)
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=AUD&to=INR", {
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

  // Last resort: a sane static fallback so the UI never breaks
  return { rate: 55.0, source: "fallback (live fetch failed)", fetchedAt: new Date().toISOString() };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const amount = parseFloat(searchParams.get("amount") || "1000");

  const { rate: midMarket, source, fetchedAt } = await fetchMidMarketRate();

  // Best-effort: log this rate and read back a real 30-day average.
  // Never let Supabase issues break the rates response — rates must always work.
  let avg30d = midMarket; // sane fallback: if we have no history yet, "average" = today's rate
  try {
    const supabase = await createClient();
    // Fire-and-forget insert (don't block the response on it)
    supabase.from("rate_snapshots").insert({ pair: "AUD_INR", rate: midMarket, source }).then(() => {});

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: snapshots } = await supabase
      .from("rate_snapshots")
      .select("rate")
      .eq("pair", "AUD_INR")
      .gte("captured_at", thirtyDaysAgo);

    if (snapshots && snapshots.length >= 5) {
      avg30d = parseFloat((snapshots.reduce((s, r) => s + r.rate, 0) / snapshots.length).toFixed(2));
    }
  } catch {
    // Supabase not configured or unreachable — fall back to today's rate as the "average"
  }

  const providers = PROVIDER_CONFIG.map((p) => {
    const effectiveRate = parseFloat((midMarket * (1 - p.spreadPct)).toFixed(2));
    const feeInAud = p.feeType === "fixed" ? p.fee : 0;
    const sendable = Math.max(0, amount - feeInAud);
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
    source,
    fetchedAt,
    amount,
    providers,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
