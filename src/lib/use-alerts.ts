"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/use-user";

export interface Alert {
  id: string;
  type: "rate" | "reminder";
  label: string;
  value?: number;
  active: boolean;
}

/**
 * Manages the alerts list for whichever corridor is currently being viewed.
 * Loads the signed-in user's saved alerts from Supabase on mount, falls back
 * to sensible local-only defaults when signed out (so the panel never looks
 * empty/broken for first-time visitors), and persists CRUD operations when
 * a user is signed in.
 */
export function useAlerts(defaultCurrency: string, defaultThreshold: number) {
  const { user } = useUser();

  const [alerts, setAlerts] = useState<Alert[]>([
    { id: "a1", type: "rate", label: `Alert when rate > ${defaultThreshold.toFixed(2)}`, value: defaultThreshold, active: true },
    { id: "a2", type: "reminder", label: "Monthly: ₹1,00,000 to parents on 1st", active: true },
  ]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/alerts")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.alerts) {
          setAlerts(
            data.alerts.map((a: { id: string; type: string; label: string; threshold_rate: number | null; active: boolean }) => ({
              id: a.id,
              type: a.type === "rate" ? "rate" : "reminder",
              label: a.label,
              value: a.threshold_rate ?? undefined,
              active: a.active,
            }))
          );
        }
      })
      .catch(() => {
        // keep local defaults if the fetch fails
      });
  }, [user]);

  const addRateAlert = async (thresholdValue: number) => {
    if (!thresholdValue) return;
    const label = `Alert when ${defaultCurrency}/INR > ${thresholdValue.toFixed(2)}`;
    const localId = Date.now().toString();
    setAlerts((prev) => [...prev, { id: localId, type: "rate", label, value: thresholdValue, active: true }]);

    if (user) {
      try {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "rate", label, threshold_rate: thresholdValue }),
        });
        const data = await res.json();
        if (data?.alert?.id) {
          setAlerts((prev) => prev.map((a) => (a.id === localId ? { ...a, id: data.alert.id } : a)));
        }
      } catch {
        // keep the local-only alert if the save fails
      }
    }
  };

  const addReminder = async (text: string) => {
    if (!text.trim()) return;
    const localId = Date.now().toString();
    setAlerts((prev) => [...prev, { id: localId, type: "reminder", label: text, active: true }]);

    if (user) {
      try {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "custom", label: text }),
        });
        const data = await res.json();
        if (data?.alert?.id) {
          setAlerts((prev) => prev.map((a) => (a.id === localId ? { ...a, id: data.alert.id } : a)));
        }
      } catch {
        // keep the local-only alert if the save fails
      }
    }
  };

  const toggleAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
    if (user) {
      const current = alerts.find((a) => a.id === id);
      fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !current?.active }),
      }).catch(() => {});
    }
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (user) {
      fetch(`/api/alerts?id=${id}`, { method: "DELETE" }).catch(() => {});
    }
  };

  return { alerts, addRateAlert, addReminder, toggleAlert, removeAlert };
}
