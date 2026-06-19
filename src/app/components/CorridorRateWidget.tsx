"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Clock, ExternalLink, Star, Sparkles } from "lucide-react";
import type { Corridor } from "@/lib/corridors";
import { fetchAISuggestion, AIBullets } from "@/lib/ai-advisor";

interface ProviderRate {
  id: string; name: string; rate: number; youSend: number; theyGet: number;
  rank: number; fee: number; feeType: string; speed: string; cookieDays: string;
}
interface RatesApiResponse {
  midMarketRate: number; avg30d: number; sourceCurrency: string;
  source: string; fetchedAt: string; amount: number; providers: ProviderRate[];
}

const LOGO: Record<string, string> = { wise: "W", remitly: "R", xe: "X", ofx: "O", instarem: "I" };
const BG: Record<string, string> = { wise: "#E6F1FB", remitly: "#EEEDFE", xe: "#FAEEDA", ofx: "#EAF3DE", instarem: "#FAECE7" };
const FG: Record<string, string> = { wise: "#0C447C", remitly: "#3C3489", xe: "#633806", ofx: "#27500A", instarem: "#712B13" };

// Real provider favicons, fetched live from each company's own domain via
// favicon.im — a purpose-built public favicon API (checks each site's real
// favicon declarations first, falls back to Google's service internally as
// a last resort). No logo files are stored or copied in this repo.
const FAVICON_DOMAIN: Record<string, string> = {
  wise: "wise.com",
  remitly: "remitly.com",
  xe: "xe.com",
  ofx: "ofx.com",
  instarem: "instarem.com",
};
function faviconUrl(domain: string) {
  return `https://favicon.im/${domain}?larger=true`;
}

// Shows each provider's real favicon inside the existing colored circle.
// Falls back to the plain letter if the favicon fails to load (network
// hiccup, ad-blocker, etc.) so the UI never shows a broken image icon.
function ProviderLogo({ id, size = 40, fontSize = 15 }: { id: string; size?: number; fontSize?: number }) {
  const [failed, setFailed] = useState(false);
  const bg = BG[id] || "#F1F5F9";
  const color = FG[id] || "#64748B";
  const letter = LOGO[id] || id[0].toUpperCase();
  const domain = FAVICON_DOMAIN[id];

  return (
    <div
      className="rounded-xl flex items-center justify-center font-bold overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, background: bg, color, fontSize }}
    >
      {failed || !domain ? letter : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl(domain)}
          alt=""
          width={Math.round(size * 0.55)}
          height={Math.round(size * 0.55)}
          onError={() => setFailed(true)}
          style={{ objectFit: "contain" }}
        />
      )}
    </div>
  );
}

// No affiliate link yet for a provider in this corridor's data? Fall back to
// their general homepage rather than breaking the button.
const HOMEPAGE: Record<string, string> = {
  wise: "https://wise.com/",
  remitly: "https://www.remitly.com/",
  xe: "https://www.xe.com/",
  ofx: "https://www.ofx.com/",
  instarem: "https://www.instarem.com/",
};

// Symbol lookup independent of which corridor we're on — needed because the
// chosen currency can differ from the corridor's own default (e.g. someone
// on the UAE page who actually wants to compare USD).
const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$", USD: "$", GBP: "£", CAD: "C$", AED: "AED ", SGD: "S$",
};

// Real exchange rates don't need 6 decimal places — 2-4 is plenty and reads
// as intentional rather than like a raw, unformatted float leaking through.
function formatRate(n: number): string {
  return n.toFixed(n < 10 ? 4 : 2);
}

function makeCorridorAIPrompt(
  corridor: Corridor,
  amount: number,
  currency: string,
  providers: ProviderRate[],
  avg30d: number
): { prompt: string; context: Record<string, unknown> } {
  const best = providers[0];
  const worst = providers[providers.length - 1];
  const trend = best.rate > avg30d + 0.25 ? "above" : best.rate < avg30d - 0.25 ? "below" : "neutral";
  const saving = best && worst ? best.theyGet - worst.theyGet : 0;

  const context = {
    sourceCountry: corridor.countryName,
    sourceCurrency: currency,
    amount, bestProvider: best?.name, bestRate: best?.rate,
    avg30d, trend, savingVsWorst: saving,
  };

  return {
    prompt: `I'm sending ${currency} ${amount} from ${corridor.countryName} to India. Best rate right now is ${best?.rate} via ${best?.name} (30-day avg ${avg30d}). Give me a quick read on timing.`,
    context,
  };
}

export default function CorridorRateWidget({ corridor, currency }: { corridor: Corridor; currency?: string }) {
  const searchParams = useSearchParams();

  // Priority: explicit prop > URL query param > saved preference > corridor's own currency.
  // useSearchParams (not the server-side searchParams prop) is deliberate — it keeps this
  // page statically generated at build time, which matters for the SEO work on these pages.
  const urlCurrency = searchParams.get("currency");
  const [savedCurrency, setSavedCurrency] = useState<string | null>(null);
  useEffect(() => {
    setSavedCurrency(localStorage.getItem("nri_currency_choice"));
  }, []);

  const requestedCurrency = currency || urlCurrency || savedCurrency || corridor.currency;
  const activeCurrency = CURRENCY_SYMBOLS[requestedCurrency] ? requestedCurrency : corridor.currency;
  const currencySymbol = CURRENCY_SYMBOLS[activeCurrency] || corridor.currencySymbol;

  const [amount, setAmount] = useState(1000);
  const [data, setData] = useState<RatesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const refresh = useCallback(async (amt: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rates?amount=${amt}&currency=${activeCurrency}`, { cache: "no-store" });
      if (res.ok) {
        const json: RatesApiResponse = await res.json();
        setData(json);

        setAiLoading(true);
        const { prompt, context } = makeCorridorAIPrompt(corridor, amt, activeCurrency, json.providers, json.avg30d);
        fetchAISuggestion(prompt, context)
          .then(setAiText)
          .finally(() => setAiLoading(false));
      }
    } catch {
      // keep last good data on screen rather than clearing it
    }
    setLoading(false);
  }, [activeCurrency, corridor]);

  useEffect(() => { refresh(amount); }, [amount, refresh]);

  const providers = (data?.providers ?? []).filter((p) => corridor.providers.some((cp) => cp.id === p.id));
  // Corridor data may list providers not present in the API response, or vice versa —
  // only show ones we have both a live rate AND corridor-specific context for.
  const corridorMeta = (id: string) => corridor.providers.find((cp) => cp.id === id);

  return (
    <div className="rounded-2xl p-5" style={{ background: "#fff", border: "0.5px solid #E5E3DC" }}>
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B", letterSpacing: "0.08em" }}>
            You send
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold" style={{ color: "#0F1F3D" }}>{currencySymbol}</span>
            <input
              type="number"
              value={amount}
              min={10}
              onChange={(e) => setAmount(Math.max(10, parseInt(e.target.value) || 10))}
              className="text-3xl font-bold border-none outline-none w-32 bg-transparent"
              style={{ color: "#0F1F3D" }}
            />
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#64748B", letterSpacing: "0.08em" }}>
            Best gets
          </p>
          <p className="text-2xl font-bold" style={{ color: "#0A7C4E" }}>
            {providers[0] ? `₹${providers[0].theyGet.toLocaleString("en-IN")}` : "—"}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[500, 1000, 2000, 5000].map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-all min-w-[70px]"
            style={{
              background: amount === v ? "#0F1F3D" : "#F8F7F4",
              color: amount === v ? "#fff" : "#64748B",
              border: `0.5px solid ${amount === v ? "#0F1F3D" : "#E5E3DC"}`,
            }}
          >
            {currencySymbol}{v.toLocaleString()}
          </button>
        ))}
      </div>

      <input
        type="range"
        min={10}
        max={10000}
        step={10}
        value={amount}
        onChange={(e) => setAmount(parseInt(e.target.value))}
        className="amount-slider w-full mb-4"
      />

      {data && (
        <div
          className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between flex-wrap gap-2"
          style={{ background: "#FEF3E8", border: "0.5px solid #FDDBB4" }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#B45A0F", letterSpacing: "0.06em" }}>
              Live mid-market rate
            </p>
            <p className="text-lg font-bold" style={{ color: "#0F1F3D" }}>
              1 {activeCurrency} = ₹{formatRate(data.midMarketRate)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#B45A0F", letterSpacing: "0.06em" }}>
              30-day avg
            </p>
            <p className="text-sm font-semibold" style={{ color: "#475569" }}>
              ₹{formatRate(data.avg30d)}
            </p>
          </div>
        </div>
      )}

      {(aiLoading || aiText) && (
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: "#fff", border: "0.5px solid rgba(232,117,26,0.3)", boxShadow: "0 4px 24px rgba(232,117,26,0.08)" }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={13} style={{ color: "#E8751A" }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#E8751A", letterSpacing: "0.06em" }}>
              AI rate advisor
            </span>
          </div>
          {aiLoading && !aiText ? (
            <div className="space-y-2">
              <div className="h-3 rounded animate-pulse" style={{ background: "#F1F5F9", width: "85%" }} />
              <div className="h-3 rounded animate-pulse" style={{ background: "#F1F5F9", width: "70%" }} />
            </div>
          ) : aiText ? (
            <AIBullets text={aiText} />
          ) : null}
        </div>
      )}

      <div className="space-y-2">
        {loading && !data && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#F8F7F4" }} />
            ))}
          </div>
        )}
        {providers.map((p) => {
          const meta = corridorMeta(p.id);
          return (
            <div
              key={p.id}
              className="rounded-2xl p-4"
              style={{ background: "#fff", border: `0.5px solid ${p.rank === 1 ? "#0A7C4E" : "#E5E3DC"}` }}
            >
              <div className="flex items-start gap-3">
                <ProviderLogo id={p.id} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: "#0F1F3D" }}>{p.name}</span>
                      {p.rank === 1 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ background: "#E8F5EE", color: "#0A7C4E" }}>
                          <Star size={9} fill="#0A7C4E" /> Best
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-base flex-shrink-0" style={{ color: p.rank === 1 ? "#0A7C4E" : "#0F1F3D" }}>
                      ₹{p.theyGet.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mb-1.5">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-md inline-block"
                      style={{
                        background: p.rank === 1 ? "#E8F5EE" : "#F1F5F9",
                        color: p.rank === 1 ? "#0A7C4E" : "#334155",
                      }}
                    >
                      1 {activeCurrency} = ₹{formatRate(p.rate)}
                    </span>
                  </div>
                  {meta?.note && (
                    <p className="text-xs mb-1.5" style={{ color: "#64748B" }}>{meta.note}</p>
                  )}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 text-xs" style={{ color: "#64748B" }}>
                      <span className="flex items-center gap-1"><Clock size={10} />{p.speed}</span>
                      <span>{p.fee > 0 ? `${currencySymbol}${p.fee} fee` : "No fee"}</span>
                    </div>
                    <a
                      href={HOMEPAGE[p.id] || "#"}
                      target="_blank"
                      rel="noopener noreferrer nofollow sponsored"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                      style={{
                        background: p.rank === 1 ? "#0F1F3D" : "#F8F7F4",
                        color: p.rank === 1 ? "#fff" : "#0F1F3D",
                        border: `0.5px solid ${p.rank === 1 ? "#0F1F3D" : "#E5E3DC"}`,
                      }}
                    >
                      Visit <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs pt-4" style={{ color: "#94A3B8" }}>
        Rates are indicative and update live. Some links may earn us a commission at no cost to you.
      </p>
    </div>
  );
}
