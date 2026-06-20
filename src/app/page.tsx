"use client";

import CountryCurrencyGate from "@/app/components/CountryCurrencyGate";

// The homepage is purely the country+currency confirmation gate. Once
// confirmed (this visit or a remembered past visit), it redirects to the
// matching corridor page — every corridor, including Australia, has its
// own full page with its own header, rate widget, AI advisor, and alerts
// panel at /send-money/[corridor]. There is deliberately no fallback
// content rendered here: the gate's `step` state machine never reaches a
// "show children" state, so nothing other than the gate itself is ever
// shown at this URL.
export default function Home() {
  return <CountryCurrencyGate>{null}</CountryCurrencyGate>;
}
