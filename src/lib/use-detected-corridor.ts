"use client";

import { useEffect, useState } from "react";
import { CORRIDORS, getCorridorByCountryCode, type Corridor } from "@/lib/corridors";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const OVERRIDE_KEY = "nri_country_override";
const CURRENCY_KEY = "nri_currency_choice";
export const GATE_COMPLETE_KEY = "nri_gate_complete";

/**
 * Detects the visitor's likely corridor from Vercel's geolocation cookie
 * (set in proxy.ts), with a manual override the user can set that persists
 * across visits via localStorage. Three possible states:
 *
 *  - detected: a corridor we have real content for, matching their IP
 *  - unsupported: we detected a country, but don't have a corridor page for it yet
 *  - unknown: no geo data available at all (e.g. local dev, non-Vercel host)
 *
 * Currency is tracked separately from country/corridor — a user can confirm
 * "I'm in the UAE" but still choose to compare USD rates, for example.
 */
export function useDetectedCorridor() {
  const [corridor, setCorridor] = useState<Corridor | null>(null);
  const [detectedCountryCode, setDetectedCountryCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"detecting" | "detected" | "unsupported" | "unknown">("detecting");
  const [confirmed, setConfirmed] = useState(false);
  const [currency, setCurrency] = useState<string | null>(null);

  useEffect(() => {
    const savedCurrency = localStorage.getItem(CURRENCY_KEY);
    if (savedCurrency) setCurrency(savedCurrency);

    const override = localStorage.getItem(OVERRIDE_KEY);
    if (override) {
      const c = CORRIDORS.find((x) => x.slug === override);
      if (c) {
        setCorridor(c);
        setDetectedCountryCode(c.countryCode);
        setStatus("detected");
        setConfirmed(true); // a saved override counts as already-confirmed
        return;
      }
    }

    const geoCode = readCookie("nri_detected_country");
    if (!geoCode) {
      setStatus("unknown");
      return;
    }
    setDetectedCountryCode(geoCode);
    const match = getCorridorByCountryCode(geoCode);
    if (match) {
      setCorridor(match);
      setStatus("detected");
    } else {
      setStatus("unsupported");
    }
  }, []);

  const confirmCorridor = () => setConfirmed(true);

  const overrideCorridor = (slug: string) => {
    const c = CORRIDORS.find((x) => x.slug === slug);
    if (!c) return;
    localStorage.setItem(OVERRIDE_KEY, slug);
    setCorridor(c);
    setStatus("detected");
    setConfirmed(true);
  };

  const chooseCurrency = (code: string) => {
    localStorage.setItem(CURRENCY_KEY, code);
    setCurrency(code);
  };

  const clearOverride = () => {
    localStorage.removeItem(OVERRIDE_KEY);
    localStorage.removeItem(CURRENCY_KEY);
    localStorage.removeItem(GATE_COMPLETE_KEY);
    setConfirmed(false);
    setCurrency(null);
  };

  return {
    corridor, detectedCountryCode, status, confirmed, currency,
    confirmCorridor, overrideCorridor, clearOverride, chooseCurrency,
  };
}
