"use client";

import { useState } from "react";
import { useUser } from "@/lib/use-user";
import { useAlerts } from "@/lib/use-alerts";
import SiteHeader from "@/app/components/SiteHeader";
import AlertsPanel from "@/app/components/AlertsPanel";

// Country badge text shown in the header next to the logo — short codes
// matching what the original AU-only header used ("AUS"), extended per corridor.
const COUNTRY_BADGE: Record<string, string> = {
  AU: "AUS", AE: "UAE", US: "USA", GB: "UK", CA: "CAN", SG: "SG",
};

export default function CorridorHeaderAndAlerts({
  countryCode,
  currency,
  defaultThreshold,
}: {
  countryCode: string;
  currency: string;
  defaultThreshold: number;
}) {
  const { user } = useUser();
  const [showPanel, setShowPanel] = useState(false);
  const { alerts, addRateAlert, addReminder, toggleAlert, removeAlert } = useAlerts(currency, defaultThreshold);

  return (
    <>
      <SiteHeader
        countryBadge={COUNTRY_BADGE[countryCode] || countryCode}
        alerts={alerts}
        onBellClick={() => setShowPanel(true)}
      />
      <AlertsPanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        alerts={alerts}
        currency={currency}
        isSignedIn={!!user}
        onAddRateAlert={addRateAlert}
        onAddReminder={addReminder}
        onToggleAlert={toggleAlert}
        onRemoveAlert={removeAlert}
      />
    </>
  );
}
