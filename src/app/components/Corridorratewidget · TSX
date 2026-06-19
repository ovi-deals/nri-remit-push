"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, ExternalLink, Star } from "lucide-react";
import type { Corridor } from "@/lib/corridors";

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

// No affiliate link yet for a provider in this corridor's data? Fall back to
// their general homepage rather than breaking the button.
const HOMEPAGE: Record<string, string> = {
  wise: "https://wise.com/",
  remitly: "https://www.remitly.com/",
  xe: "https://www.xe.com/",
  ofx: "https://www.ofx.com/",
  instarem: "https://www.instarem.com/",
};

export default function CorridorRateWidget({ corridor }: { corridor: Corridor }) {
  const [amount, setAmount] = useState(1000);
  const [data, setData] = useState<RatesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (amt: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rates?amount=${amt}&currency=${corridor.currency}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      // keep last good data on screen rather than clearing it
    }
    setLoading(false);
  }, [corridor.currency]);

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
            <span className="text-3xl font-bold" style={{ color: "#0F1F3D" }}>{corridor.currencySymbol}</span>
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
            {corridor.currencySymbol}{v.toLocaleString()}
          </button>
        ))}
      </div>

      {data && (
        <p className="text-xs mb-4" style={{ color: "#94A3B8" }}>
          Mid-market rate: {data.midMarketRate} · 30-day avg: {data.avg30d} · updated live
        </p>
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
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
                  style={{ background: BG[p.id] || "#F1F5F9", color: FG[p.id] || "#64748B", fontSize: 15 }}
                >
                  {LOGO[p.id] || p.id[0].toUpperCase()}
                </div>
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
                  {meta?.note && (
                    <p className="text-xs mb-1.5" style={{ color: "#64748B" }}>{meta.note}</p>
                  )}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 text-xs" style={{ color: "#64748B" }}>
                      <span>{p.rate}/{corridor.currency}</span>
                      <span className="flex items-center gap-1"><Clock size={10} />{p.speed}</span>
                      <span>{p.fee > 0 ? `${corridor.currencySymbol}${p.fee} fee` : "No fee"}</span>
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
