"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { usePushNotifications } from "@/lib/use-push-notifications";

export default function PushNotificationToggle() {
  const { status, loading, subscribe, unsubscribe } = usePushNotifications();

  if (status === "unsupported") {
    return (
      <p className="text-xs flex items-center gap-1.5" style={{ color: "#94A3B8" }}>
        <BellOff size={12} /> Push notifications aren&apos;t supported in this browser
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-xs flex items-center gap-1.5" style={{ color: "#94A3B8" }}>
        <BellOff size={12} /> Notifications blocked — enable them in your browser&apos;s site settings to use this
      </p>
    );
  }

  if (status === "subscribed") {
    return (
      <button
        onClick={unsubscribe}
        disabled={loading}
        className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
        style={{ background: "#E8F5EE", color: "#0A7C4E", border: "0.5px solid #C8E8D8" }}
      >
        <BellRing size={12} /> Push notifications on — tap to turn off
      </button>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={loading}
      className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
      style={{ background: "#FEF3E8", color: "#E8751A", border: "0.5px solid #FDDBB4" }}
    >
      <Bell size={12} /> {loading ? "Enabling…" : "Enable push notifications for your alerts"}
    </button>
  );
}
