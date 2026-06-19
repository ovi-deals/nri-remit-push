import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { fetchMidMarketRate, computeProviderRates, SUPPORTED_SOURCE_CURRENCIES } from "@/lib/rates";

export const dynamic = "force-dynamic"; // never statically cache — rates must be fresh
export const revalidate = 0;

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

  const providers = computeProviderRates(midMarket, amount);

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
