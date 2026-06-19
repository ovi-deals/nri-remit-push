"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ArrowRight, Check } from "lucide-react";
import { CORRIDORS, getCorridorByCountryCode } from "@/lib/corridors";
import { useDetectedCorridor, GATE_COMPLETE_KEY } from "@/lib/use-detected-corridor";

type Step = "loading" | "country" | "currency" | "redirecting" | "done";

/**
 * Hard gate shown on the homepage only (not on corridor pages — landing on
 * /send-money/uae-to-india directly from Google or a shared link IS the
 * confirmation, so gating there would hurt the SEO work and annoy people
 * who already self-selected).
 *
 * Flow: detect country → user confirms or picks a different one → user
 * confirms or picks a different currency (independent of country, since
 * someone might bank in a currency that doesn't match where they're
 * physically located) → redirect to the matching corridor page.
 *
 * Once confirmed, the choice is saved to localStorage so returning visitors
 * skip straight past this gate next time.
 */
export default function CountryCurrencyGate({ children }: { children: React.ReactNode }) {
  const { corridor, status, overrideCorridor, chooseCurrency } = useDetectedCorridor();
  const router = useRouter();

  const [step, setStep] = useState<Step>("loading");
  const [pendingCountrySlug, setPendingCountrySlug] = useState<string | null>(null);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);

  // Decide on mount whether the gate is already satisfied from a past visit.
  // If so, redirect straight to the saved corridor — don't render the
  // fallback children content, which would otherwise duplicate what the
  // corridor page itself already shows.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const alreadyDone = localStorage.getItem(GATE_COMPLETE_KEY);
    if (alreadyDone && corridor) {
      setStep("redirecting");
      const savedCurrency = localStorage.getItem("nri_currency_choice") || corridor.currency;
      router.replace(`/send-money/${corridor.slug}?currency=${savedCurrency}`);
      return;
    }
    if (status === "detecting") return; // wait for detection to resolve
    if (!alreadyDone) setStep("country");
  }, [status, corridor, router]);

  // Once detection resolves, pre-select the detected/guessed country as the default pick.
  useEffect(() => {
    if (step === "country" && !pendingCountrySlug) {
      if (corridor) setPendingCountrySlug(corridor.slug);
    }
  }, [step, corridor, pendingCountrySlug]);

  const selectedCountry = CORRIDORS.find((c) => c.slug === pendingCountrySlug);

  const confirmCountryStep = () => {
    if (!selectedCountry) return;
    setPendingCurrency(selectedCountry.currency); // default currency guess = country's own currency
    setStep("currency");
  };

  const confirmCurrencyStep = () => {
    if (!selectedCountry || !pendingCurrency) return;
    overrideCorridor(selectedCountry.slug);
    chooseCurrency(pendingCurrency);
    localStorage.setItem(GATE_COMPLETE_KEY, "1");
    setStep("redirecting");
    router.push(`/send-money/${selectedCountry.slug}?currency=${pendingCurrency}`);
  };

  if (step === "redirecting") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F7F4" }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#E5E3DC", borderTopColor: "#E8751A" }} />
      </div>
    );
  }

  if (step === "done") return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F8F7F4" }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#fff", border: "0.5px solid #E5E3DC" }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: "#E8751A" }}>₹</div>
          <span className="font-semibold text-sm" style={{ color: "#0F1F3D" }}>NRI Transfer</span>
        </div>

        {step === "loading" && (
          <div className="py-10 flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#E5E3DC", borderTopColor: "#E8751A" }} />
            <p className="text-sm" style={{ color: "#64748B" }}>Detecting your location…</p>
          </div>
        )}

        {step === "country" && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={16} style={{ color: "#E8751A" }} />
              <h1 className="text-base font-bold" style={{ color: "#0F1F3D" }}>Where are you sending from?</h1>
            </div>
            <p className="text-xs mb-4" style={{ color: "#64748B" }}>
              {corridor
                ? `We think you're in ${corridor.countryName} — confirm or pick a different country.`
                : "Pick your country to see the right rates."}
            </p>

            <div className="space-y-1.5 max-h-72 overflow-y-auto mb-4">
              {CORRIDORS.map((c) => {
                const isSelected = pendingCountrySlug === c.slug;
                const isGuess = corridor?.slug === c.slug;
                return (
                  <button
                    key={c.slug}
                    onClick={() => setPendingCountrySlug(c.slug)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: isSelected ? "#0F1F3D" : "#F8F7F4",
                      color: isSelected ? "#fff" : "#0F1F3D",
                      border: `0.5px solid ${isSelected ? "#0F1F3D" : "#E5E3DC"}`,
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {c.flag} {c.countryName}
                      {isGuess && !isSelected && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#FEF3E8", color: "#E8751A" }}>
                          detected
                        </span>
                      )}
                    </span>
                    {isSelected && <Check size={14} />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={confirmCountryStep}
              disabled={!selectedCountry}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
              style={{ background: "#E8751A", color: "#fff", opacity: selectedCountry ? 1 : 0.5 }}
            >
              Continue <ArrowRight size={14} />
            </button>
          </>
        )}

        {step === "currency" && selectedCountry && (
          <>
            <h1 className="text-base font-bold mb-1" style={{ color: "#0F1F3D" }}>Which currency do you send in?</h1>
            <p className="text-xs mb-4" style={{ color: "#64748B" }}>
              Sending from {selectedCountry.countryName} usually means {selectedCountry.currency}, but pick a different one if that's not how you're paid.
            </p>

            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {CORRIDORS.map((c) => {
                const isSelected = pendingCurrency === c.currency;
                const isDefault = selectedCountry.currency === c.currency;
                return (
                  <button
                    key={c.currency}
                    onClick={() => setPendingCurrency(c.currency)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: isSelected ? "#0F1F3D" : "#F8F7F4",
                      color: isSelected ? "#fff" : "#0F1F3D",
                      border: `0.5px solid ${isSelected ? "#0F1F3D" : "#E5E3DC"}`,
                    }}
                  >
                    <span>{c.currencySymbol} {c.currency}</span>
                    {isDefault && !isSelected && (
                      <span className="text-xs" style={{ color: "#94A3B8" }}>default</span>
                    )}
                    {isSelected && <Check size={13} />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("country")}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "#F8F7F4", color: "#64748B", border: "0.5px solid #E5E3DC" }}
              >
                Back
              </button>
              <button
                onClick={confirmCurrencyStep}
                disabled={!pendingCurrency}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
                style={{ background: "#E8751A", color: "#fff", opacity: pendingCurrency ? 1 : 0.5 }}
              >
                Show me rates <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Re-exported so callers don't need to know the corridor lookup helper lives elsewhere.
export { getCorridorByCountryCode };
